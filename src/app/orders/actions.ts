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
export async function updateOrderItem(itemId: string, data: { quantity?: number; price?: number; unit?: string }) {
    try {
        const item = await db.orderItem.update({
            where: { id: itemId },
            data: {
                quantity: data.quantity,
                price: data.price,
                unit: data.unit
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

// Get pending orders summary with aggregated products and real-time stock
export async function getPendingOrdersSummary() {
    try {
        // Get all pending/processing SALE orders
        const pendingOrders = await db.order.findMany({
            where: {
                type: "SALE",
                status: { in: ["PENDING", "PROCESSING"] }
            },
            include: {
                customer: true,
                items: {
                    include: { product: true }
                }
            },
            orderBy: { createdAt: "asc" }
        });

        // Aggregate products across all orders
        const productMap = new Map<string, {
            productId: string;
            name: string;
            sku: string;
            unit: string;
            totalRequired: number;
            currentStock: number;
        }>();

        for (const order of pendingOrders) {
            for (const item of order.items) {
                // Calculate required quantity in BASE UNIT
                // If item.unit is Sale Unit, convert to Base Unit using ratio
                const isSaleUnit = item.unit && item.product.saleUnit && item.unit === item.product.saleUnit;
                const ratio = isSaleUnit ? (item.product.saleRatio || 1) : 1;
                const quantityInBase = item.quantity * ratio;

                const existing = productMap.get(item.productId);
                if (existing) {
                    existing.totalRequired += quantityInBase;
                } else {
                    productMap.set(item.productId, {
                        productId: item.productId,
                        name: item.product.name,
                        sku: item.product.sku,
                        unit: item.product.unit, // Always use Base Unit for aggregation
                        totalRequired: quantityInBase,
                        currentStock: item.product.stock
                    });
                }
            }
        }

        // Get fresh stock data for all products
        const productIds = Array.from(productMap.keys());
        if (productIds.length > 0) {
            const freshProducts = await db.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, stock: true }
            });
            for (const p of freshProducts) {
                const item = productMap.get(p.id);
                if (item) item.currentStock = p.stock;
            }
        }

        const aggregatedProducts = Array.from(productMap.values()).map(p => ({
            ...p,
            isEnough: p.currentStock >= p.totalRequired,
            shortage: Math.max(0, p.totalRequired - p.currentStock)
        }));

        // Check if each order has enough stock
        const ordersWithStatus = pendingOrders.map(order => {
            const allItemsAvailable = order.items.every(item => {
                const productInfo = productMap.get(item.productId);
                const isSaleUnit = item.unit && item.product.saleUnit && item.unit === item.product.saleUnit;
                const ratio = isSaleUnit ? (item.product.saleRatio || 1) : 1;
                const quantityInBase = item.quantity * ratio;

                // Check against real-time stock, accounting for other orders? 
                // Currently simplified: checks if TOTAL stock covers this item's specific need
                // Ideally should decrement available stock as we iterate orders, but simple check against total required vs total stock is aggregated above.
                // For individual order "readiness", we usually check if (Stock >= Qty).
                return productInfo && productInfo.currentStock >= quantityInBase;
            });

            return {
                id: order.id,
                code: order.code,
                status: order.status,
                customerName: order.customer?.name || "Khách lẻ",
                recipientName: order.recipientName,
                itemCount: order.items.length,
                total: order.total,
                createdAt: order.createdAt,
                allItemsAvailable,
                items: order.items.map(item => ({
                    productName: item.product.name,
                    sku: item.product.sku,
                    quantity: item.quantity,
                    unit: item.unit || item.product.unit, // Show Ordered Unit
                    currentStock: productMap.get(item.productId)?.currentStock || 0
                }))
            };
        });

        return {
            success: true,
            aggregatedProducts,
            orders: ordersWithStatus,
            totalOrders: pendingOrders.length
        };
    } catch (error) {
        console.error("Failed to get pending orders summary:", error);
        return { success: false, error: "Failed to get pending orders" };
    }
}

// ============ CARRIER MANAGEMENT ============

export async function getCarriers() {
    return await db.carrier.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" }
    });
}

export async function createCarrier(name: string, phone?: string) {
    try {
        const carrier = await db.carrier.create({
            data: { name, phone }
        });
        return { success: true, carrier };
    } catch (error) {
        console.error("Failed to create carrier:", error);
        return { success: false, error: "Failed to create carrier" };
    }
}

// ============ SHIPPING WORKFLOW ============

// Start shipping - from READY to SHIPPING
export async function startShipping(orderId: string, data: {
    carrierName: string;
    shippingFee: number;
    shippingPaidBy: "SHOP" | "CUSTOMER";
}) {
    try {
        const order = await db.order.findUnique({ where: { id: orderId } });
        if (!order) {
            return { success: false, error: "Order not found" };
        }
        if (order.status !== "READY") {
            return { success: false, error: "Order must be in READY status" };
        }

        await db.order.update({
            where: { id: orderId },
            data: {
                status: "SHIPPING",
                carrierName: data.carrierName,
                shippingFee: data.shippingFee,
                shippingPaidBy: data.shippingPaidBy,
                shippedAt: new Date()
            }
        });

        // Send SMS notification to customer
        try {
            if (order.recipientPhone) {
                const { sendShippingNotification } = await import("@/lib/sms");
                sendShippingNotification({
                    orderCode: order.code,
                    recipientName: order.recipientName || "Quý khách",
                    recipientPhone: order.recipientPhone
                }).then(result => {
                    if (result.success) {
                        console.log(`SMS sent for order ${order.code}`);
                    } else {
                        console.error(`SMS failed for order ${order.code}:`, result.error);
                    }
                }).catch(err => console.error("SMS error:", err));
            }
        } catch (smsError) {
            console.error("Failed to send SMS:", smsError);
            // Don't fail shipping if SMS fails
        }

        revalidatePath("/orders");
        return { success: true };
    } catch (error) {
        console.error("Failed to start shipping:", error);
        return { success: false, error: "Failed to start shipping" };
    }
}

// Complete delivery - from SHIPPING to COMPLETED
export async function completeDelivery(orderId: string, data: {
    returnedAmount: number;
    refundAmount: number;
    returnNote?: string;
}) {
    try {
        const order = await db.order.findUnique({
            where: { id: orderId },
            include: {
                items: { include: { product: true } }
            }
        });

        if (!order) {
            return { success: false, error: "Order not found" };
        }
        if (order.status !== "SHIPPING") {
            return { success: false, error: "Order must be in SHIPPING status" };
        }

        // Update order to COMPLETED
        await db.order.update({
            where: { id: orderId },
            data: {
                status: "COMPLETED",
                returnedAmount: data.returnedAmount,
                refundAmount: data.refundAmount,
                returnNote: data.returnNote,
                completedAt: new Date()
            }
        });

        // Decrease stock for delivered items (full quantity - we track returns separately)
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
                    note: `Delivered: Order #${order.code}`
                }
            });
        }

        revalidatePath("/orders");
        revalidatePath("/products");
        return { success: true };
    } catch (error) {
        console.error("Failed to complete delivery:", error);
        return { success: false, error: "Failed to complete delivery" };
    }
}

// ============ MESSAGE NOTIFICATIONS ============

interface MessageSendResult {
    success: boolean;
    message?: string;
    error?: string;
}

async function getMessageTemplate(templateType: "shipping" | "delivered") {
    const settings = await db.shopSettings.findUnique({
        where: { id: "shop" },
        select: {
            smsShippingTemplate: true,
            smsDeliveredTemplate: true,
            name: true,
        }
    });
    return {
        template: templateType === "shipping"
            ? settings?.smsShippingTemplate
            : settings?.smsDeliveredTemplate,
        shopName: settings?.name || "Shop"
    };
}

function formatMessage(template: string, data: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || "");
    }
    return result;
}

export async function sendShippingNotification(orderId: string): Promise<MessageSendResult> {
    try {
        const order = await db.order.findUnique({
            where: { id: orderId },
            include: { customer: true }
        });

        if (!order) return { success: false, error: "Đơn hàng không tồn tại" };
        if (!order.recipientPhone && !order.customer?.phone) {
            return { success: false, error: "Không có số điện thoại khách hàng" };
        }

        const { template, shopName } = await getMessageTemplate("shipping");
        if (!template) return { success: false, error: "Chưa cấu hình mẫu tin nhắn" };

        const phone = order.recipientPhone || order.customer?.phones?.[0] || order.customer?.phone || "";
        const customerName = order.recipientName || order.customer?.name || "Quý khách";
        const address = order.deliveryAddress || "";

        const formattedMessage = formatMessage(template, {
            customerName,
            orderCode: order.code,
            address,
            total: order.total.toLocaleString("vi-VN"),
            shopName,
            phone
        });

        // Open Zalo with pre-filled message (using Zalo URL scheme)
        const zaloUrl = `https://zalo.me/${phone.replace(/\D/g, '')}`;

        // Update order to mark notification as sent
        await db.order.update({
            where: { id: orderId },
            data: {
                lastNotificationAt: new Date(),
                lastNotificationType: "SHIPPING"
            }
        });

        revalidatePath("/orders");

        return {
            success: true,
            message: formattedMessage
        };
    } catch (error) {
        console.error("Send shipping notification error:", error);
        return { success: false, error: "Lỗi gửi tin nhắn" };
    }
}

export async function sendDeliveredNotification(orderId: string): Promise<MessageSendResult> {
    try {
        const order = await db.order.findUnique({
            where: { id: orderId },
            include: { customer: true }
        });

        if (!order) return { success: false, error: "Đơn hàng không tồn tại" };
        if (!order.recipientPhone && !order.customer?.phone) {
            return { success: false, error: "Không có số điện thoại khách hàng" };
        }

        const { template, shopName } = await getMessageTemplate("delivered");
        if (!template) return { success: false, error: "Chưa cấu hình mẫu tin nhắn" };

        const phone = order.recipientPhone || order.customer?.phones?.[0] || order.customer?.phone || "";
        const customerName = order.recipientName || order.customer?.name || "Quý khách";

        const formattedMessage = formatMessage(template, {
            customerName,
            orderCode: order.code,
            address: order.deliveryAddress || "",
            total: order.total.toLocaleString("vi-VN"),
            shopName,
            phone
        });

        // Update order to mark notification as sent
        await db.order.update({
            where: { id: orderId },
            data: {
                lastNotificationAt: new Date(),
                lastNotificationType: "DELIVERED"
            }
        });

        revalidatePath("/orders");

        return {
            success: true,
            message: formattedMessage
        };
    } catch (error) {
        console.error("Send delivered notification error:", error);
        return { success: false, error: "Lỗi gửi tin nhắn" };
    }
}
