"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Order Status Constants for Sales Orders
export const ORDER_STATUSES = {
    PENDING: { label: "Chờ xử lý", color: "yellow", step: 1 },
    PROCESSING: { label: "Đang xử lý", color: "blue", step: 2 },
    READY: { label: "Đủ hàng", color: "purple", step: 3 },
    SHIPPING: { label: "Đang giao", color: "orange", step: 4 },
    COMPLETED: { label: "Hoàn tất", color: "green", step: 5 },
    CANCELLED: { label: "Đã hủy", color: "red", step: 0 },
} as const;

export type OrderStatus = keyof typeof ORDER_STATUSES;

// Get next status in workflow
export function getNextStatus(currentStatus: string): OrderStatus | null {
    const flow: OrderStatus[] = ["PENDING", "PROCESSING", "READY", "SHIPPING", "COMPLETED"];
    const currentIndex = flow.indexOf(currentStatus as OrderStatus);
    if (currentIndex === -1 || currentIndex >= flow.length - 1) return null;
    return flow[currentIndex + 1];
}

// Get allowed next statuses for a given status
export function getAllowedNextStatuses(currentStatus: string): OrderStatus[] {
    switch (currentStatus) {
        case "PENDING":
            return ["PROCESSING", "CANCELLED"];
        case "PROCESSING":
            return ["READY", "CANCELLED"];
        case "READY":
            return ["SHIPPING"];
        case "SHIPPING":
            return ["COMPLETED"];
        default:
            return [];
    }
}

export async function getOrders() {
    return await db.order.findMany({
        include: {
            customer: true,
            supplier: true,
            items: {
                include: {
                    product: true
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });
}

export async function getOrderById(id: string) {
    return await db.order.findUnique({
        where: { id },
        include: {
            customer: true,
            supplier: true,
            items: {
                include: {
                    product: true
                }
            }
        }
    });
}

export async function updateOrderStatus(id: string, status: string) {
    try {
        const order = await db.order.update({
            where: { id },
            data: { status },
            include: {
                items: {
                    include: { product: true }
                }
            }
        });

        // When order is COMPLETED, decrease stock
        if (status === "COMPLETED" && order.type === "SALE") {
            for (const item of order.items) {
                await db.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } }
                });

                await db.inventoryTransaction.create({
                    data: {
                        productId: item.productId,
                        quantity: -item.quantity,
                        type: "OUT",
                        note: `Sale Order #${order.code}`
                    }
                });
            }
        }

        revalidatePath("/orders");
        revalidatePath("/products");
        return { success: true };
    } catch (error) {
        console.error("Failed to update order status:", error);
        return { success: false, error: "Failed to update order status" };
    }
}

export async function deleteOrder(id: string) {
    try {
        // Delete order items first (due to relation)
        await db.orderItem.deleteMany({
            where: { orderId: id }
        });

        await db.order.delete({
            where: { id }
        });

        revalidatePath("/orders");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete order" };
    }
}

// Track orders by phone number (for Portal)
export async function trackOrdersByPhone(phone: string) {
    if (!phone || phone.trim().length < 3) {
        return { success: false, error: "Vui lòng nhập số điện thoại" };
    }

    const searchPhone = phone.trim();

    // Find orders by recipient phone or customer phone
    const orders = await db.order.findMany({
        where: {
            type: "SALE",
            OR: [
                { recipientPhone: { contains: searchPhone } },
                {
                    customer: {
                        OR: [
                            { phone: { contains: searchPhone } },
                            { phones: { contains: searchPhone } }
                        ]
                    }
                }
            ]
        },
        include: {
            customer: true,
            items: {
                include: {
                    product: true
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    return {
        success: true,
        orders: orders.map(order => ({
            id: order.id,
            code: order.code,
            status: order.status,
            statusInfo: ORDER_STATUSES[order.status as OrderStatus] || ORDER_STATUSES.PENDING,
            total: order.total,
            paymentMethod: order.paymentMethod,
            recipientName: order.recipientName,
            recipientPhone: order.recipientPhone,
            deliveryAddress: order.deliveryAddress,
            createdAt: order.createdAt,
            items: order.items.map(item => ({
                name: item.product.name,
                quantity: item.quantity,
                price: item.price
            }))
        }))
    };
}
