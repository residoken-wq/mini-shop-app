"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ORDER_STATUSES, OrderStatus } from "./order-constants";

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
            discount: order.discount || 0,
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

// Update order item quantity and price
export async function updateOrderItem(itemId: string, data: { quantity?: number; price?: number }) {
    try {
        const item = await db.orderItem.update({
            where: { id: itemId },
            data: {
                quantity: data.quantity,
                price: data.price
            }
        });

        // Recalculate order total
        const order = await db.order.findUnique({
            where: { id: item.orderId },
            include: { items: true }
        });

        if (order) {
            const itemsTotal = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
            const newTotal = itemsTotal - (order.discount || 0);
            await db.order.update({
                where: { id: order.id },
                data: { total: Math.max(0, newTotal) }
            });
        }

        revalidatePath("/orders");
        return { success: true };
    } catch (error) {
        console.error("Failed to update order item:", error);
        return { success: false, error: "Failed to update order item" };
    }
}

// Update order discount
export async function updateOrderDiscount(orderId: string, discount: number) {
    try {
        const order = await db.order.findUnique({
            where: { id: orderId },
            include: { items: true }
        });

        if (!order) {
            return { success: false, error: "Order not found" };
        }

        const itemsTotal = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const newTotal = Math.max(0, itemsTotal - discount);

        await db.order.update({
            where: { id: orderId },
            data: {
                discount,
                total: newTotal
            }
        });

        revalidatePath("/orders");
        return { success: true, newTotal };
    } catch (error) {
        console.error("Failed to update order discount:", error);
        return { success: false, error: "Failed to update discount" };
    }
}

// Delete order item
export async function deleteOrderItem(itemId: string) {
    try {
        const item = await db.orderItem.findUnique({
            where: { id: itemId }
        });

        if (!item) {
            return { success: false, error: "Item not found" };
        }

        await db.orderItem.delete({
            where: { id: itemId }
        });

        // Recalculate order total
        const order = await db.order.findUnique({
            where: { id: item.orderId },
            include: { items: true }
        });

        if (order) {
            const itemsTotal = order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
            const newTotal = Math.max(0, itemsTotal - (order.discount || 0));
            await db.order.update({
                where: { id: order.id },
                data: { total: newTotal }
            });
        }

        revalidatePath("/orders");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete order item:", error);
        return { success: false, error: "Failed to delete item" };
    }
}
