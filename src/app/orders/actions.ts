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
        // 1. Fetch current order to check previous status
        const currentOrder = await db.order.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!currentOrder) {
            return { success: false, error: "Order not found" };
        }

        // 2. Handle State Transitions
        const isBecomingCompleted = status === "COMPLETED" && currentOrder.status !== "COMPLETED";
        const isLeavingCompleted = currentOrder.status === "COMPLETED" && status !== "COMPLETED";

        // Logic for SALE orders
        if (currentOrder.type === "SALE") {
            // Case A: Becoming COMPLETED
            if (isBecomingCompleted) {
                // A1. Decrease Stock
                for (const item of currentOrder.items) {
                    await db.product.update({
                        where: { id: item.productId },
                        data: { stock: { decrement: item.quantity } }
                    });

                    await db.inventoryTransaction.create({
                        data: {
                            productId: item.productId,
                            quantity: -item.quantity,
                            type: "OUT",
                            note: `Sale Order #${currentOrder.code}`
                        }
                    });
                }

                // A2. Handle Payment & Debt
                const remainingAmount = currentOrder.total - currentOrder.paid;

                if (currentOrder.paymentMethod === "CREDIT") {
                    // For CREDIT: remaining amount is added to Debt
                    if (currentOrder.customerId && remainingAmount > 0) {
                        await db.customer.update({
                            where: { id: currentOrder.customerId },
                            data: { debt: { increment: remainingAmount } }
                        });
                    }

                    // Logic for pre-paid amount in CREDIT orders? 
                    // If paid > 0, we assume it's already accounted for or we record it now?
                    // Existing logic recorded `currentOrder.paid` as INCOME. 
                    // Let's preserve that for non-credit parts.
                    if (currentOrder.paid > 0) {
                        await db.transaction.create({
                            data: {
                                type: "INCOME",
                                amount: currentOrder.paid,
                                description: `Order #${currentOrder.code} - Partial Payment`,
                                customerId: currentOrder.customerId,
                                paymentMethod: "CASH" // Assumed
                            }
                        });
                    }

                } else {
                    // For NON-CREDIT (COD, CASH, etc.):
                    // 1. Transaction for ALREADY paid amount (if any, pending confirmation)
                    if (currentOrder.paid > 0) {
                        await db.transaction.create({
                            data: {
                                type: "INCOME",
                                amount: currentOrder.paid,
                                description: `Order #${currentOrder.code} - Pre-Payment`,
                                customerId: currentOrder.customerId,
                                paymentMethod: currentOrder.paymentMethod || "CASH"
                            }
                        });
                    }

                    // 2. Auto-pay the REMAINING amount (assume full payment upon completion)
                    if (remainingAmount > 0) {
                        await db.transaction.create({
                            data: {
                                type: "INCOME",
                                amount: remainingAmount,
                                description: `Order #${currentOrder.code} - Final Payment`,
                                customerId: currentOrder.customerId,
                                paymentMethod: currentOrder.paymentMethod || "CASH"
                            }
                        });

                        // Update order to fully paid
                        await db.order.update({
                            where: { id },
                            data: { paid: currentOrder.total }
                        });
                    }
                }
            }

            // Case B: Leaving COMPLETED (Reversal)
            if (isLeavingCompleted) {
                // B1. Restore Stock
                for (const item of currentOrder.items) {
                    await db.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } }
                    });
                }
                // Delete inventory transactions
                await db.inventoryTransaction.deleteMany({
                    where: { note: { contains: currentOrder.code } }
                });

                // B2. Reverse Debt
                if (currentOrder.customerId && currentOrder.paid < currentOrder.total) {
                    const debtAmount = currentOrder.total - currentOrder.paid;
                    await db.customer.update({
                        where: { id: currentOrder.customerId },
                        data: { debt: { decrement: debtAmount } }
                    });
                }

                // B3. Delete Income Transaction
                if (currentOrder.paid > 0) {
                    await db.transaction.deleteMany({
                        where: {
                            description: { contains: currentOrder.code },
                            type: "INCOME"
                        }
                    });
                }
            }
        }

        // 3. Update Order Status
        await db.order.update({
            where: { id },
            data: { status },
        });

        revalidatePath("/orders");
        revalidatePath("/products");
        revalidatePath("/customers");
        return { success: true };
    } catch (error) {
        console.error("Failed to update order status:", error);
        return { success: false, error: "Failed to update order status" };
    }
}

export async function updateOrderPaymentMethod(id: string, paymentMethod: string) {
    try {
        await db.order.update({
            where: { id },
            data: { paymentMethod }
        });

        revalidatePath("/orders");
        return { success: true };
    } catch (error) {
        console.error("Failed to update payment method:", error);
        return { success: false, error: "Failed to update payment method" };
    }
}

export async function deleteOrder(id: string) {
    try {
        // Get order details first to check status and get relations
        const order = await db.order.findUnique({
            where: { id },
            include: {
                items: true,
                customer: true,
                supplier: true
            }
        });

        if (!order) {
            return { success: false, error: "Order not found" };
        }

        // If order was completed SALE, reverse debt and stock changes
        if (order.status === "COMPLETED" && order.type === "SALE") {
            // Reverse debt if customer had unpaid amount
            if (order.customerId && order.paid < order.total) {
                const debtAmount = order.total - order.paid;
                await db.customer.update({
                    where: { id: order.customerId },
                    data: { debt: { decrement: debtAmount } }
                });
            }

            // Restore stock for each item
            for (const item of order.items) {
                await db.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.quantity } }
                });
            }

            // Delete inventory transactions related to this order
            await db.inventoryTransaction.deleteMany({
                where: { note: { contains: order.code } }
            });
        }

        // If PURCHASE order, reverse supplier debt and stock changes
        if (order.type === "PURCHASE") {
            // Decrease supplier debt (since purchase order increases debt)
            if (order.supplierId) {
                await db.supplier.update({
                    where: { id: order.supplierId },
                    data: { debt: { decrement: order.total } }
                });
            }

            // Reverse stock changes (purchase orders increase stock, so we decrement)
            for (const item of order.items) {
                await db.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } }
                });
            }

            // Delete inventory transactions related to this order
            await db.inventoryTransaction.deleteMany({
                where: { note: { contains: order.id } }
            });

            // Delete related transaction records
            await db.transaction.deleteMany({
                where: {
                    description: { contains: order.code }
                }
            });
        }

        // Delete order items first (due to relation)
        await db.orderItem.deleteMany({
            where: { orderId: id }
        });

        await db.order.delete({
            where: { id }
        });

        revalidatePath("/orders");
        revalidatePath("/customers");
        revalidatePath("/products");
        revalidatePath("/suppliers");
        revalidatePath("/finance");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete order:", error);
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
    try {
        const carriers = await db.carrier.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" }
        });
        return { success: true, carriers };
    } catch (error) {
        console.error("Failed to get carriers:", error);
        return { success: false, error: "Failed to get carriers" };
    }
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

// Update shipping info (Carrier & Fee) for Purchase Orders
export async function updateOrderCarrierInfo(orderId: string, data: {
    carrierId: string; // Carrier ID from DB
    shippingFee: number;
    createPayment: boolean; // If true -> Create Transaction, else -> Record Debt
}) {
    try {
        const order = await db.order.findUnique({ where: { id: orderId } });
        if (!order) return { success: false, error: "Order not found" };

        const carrier = await db.carrier.findUnique({ where: { id: data.carrierId } });
        if (!carrier) return { success: false, error: "Carrier not found" };

        // 1. Update Order
        await db.order.update({
            where: { id: orderId },
            data: {
                carrierName: carrier.name,
                shippingFee: data.shippingFee,
                shippingPaidBy: "SHOP", // For PO, shop pays shipping (expense)
            }
        });

        // 2. Handle Debt or Payment
        if (data.createPayment) {
            // Create Expense Transaction
            await db.transaction.create({
                data: {
                    type: "EXPENSE",
                    amount: data.shippingFee,
                    description: `Chi phí vận chuyển đơn hàng #${order.code}`,
                    carrierId: data.carrierId,
                    isPaid: true,
                    paidAt: new Date(),
                    paymentMethod: "CASH" // Default to CASH for now
                }
            });
            // Debt does not increase because we paid immediately
        } else {
            // Record Debt
            await db.carrier.update({
                where: { id: data.carrierId },
                data: { debt: { increment: data.shippingFee } }
            });

            // Optionally create a DEBT transaction record if we want to track history?
            // For now, simple model: Carrier.debt is the source of truth, 
            // but usually we want a Transaction record for "Cost incurred".
            // Let's create an Unpaid Transaction to track the expense
            await db.transaction.create({
                data: {
                    type: "EXPENSE",
                    amount: data.shippingFee,
                    description: `Phí vận chuyển đơn hàng #${order.code} (Ghi nợ)`,
                    carrierId: data.carrierId,
                    isPaid: false
                }
            });
        }

        revalidatePath("/orders");
        return { success: true };
    } catch (error) {
        console.error("Failed to update carrier info:", error);
        return { success: false, error: "Failed to update carrier info" };
    }
}

// ============ SHIPPING WORKFLOW ============

// Start shipping - from READY to SHIPPING
export async function startShipping(orderId: string, data: {
    carrierName: string;
    shippingFee: number;
    shippingPaidBy: "SHOP" | "CUSTOMER";
    deliveryNote?: string;
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
                deliveryNote: data.deliveryNote || null,
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

        // Calculate remaining amount to pay (Total - Paid - Returns)
        const remainingAmount = order.total - (order.paid || 0) - (data.returnedAmount || 0);
        let finalPaid = order.paid || 0;

        // Handle Payment / Debt
        if (order.paymentMethod === "CREDIT") {
            // For CREDIT: Add remaining to customer debt
            if (order.customerId && remainingAmount > 0) {
                await db.customer.update({
                    where: { id: order.customerId },
                    data: { debt: { increment: remainingAmount } }
                });
            }
        } else {
            // For COD/CASH: Assume collection of remaining amount
            if (remainingAmount > 0) {
                await db.transaction.create({
                    data: {
                        type: "INCOME",
                        amount: remainingAmount,
                        description: `Thanh toán đơn hàng #${order.code}`,
                        customerId: order.customerId,
                        paymentMethod: order.paymentMethod || "CASH"
                    }
                });
                finalPaid += remainingAmount;
            }
        }

        // Update order to COMPLETED
        await db.order.update({
            where: { id: orderId },
            data: {
                status: "COMPLETED",
                returnedAmount: data.returnedAmount,
                refundAmount: data.refundAmount,
                returnNote: data.returnNote,
                completedAt: new Date(),
                paid: finalPaid // Update paid amount
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

export async function addOrderPayment(data: {
    orderId: string;
    amount: number;
    paymentMethod: string;
    note?: string;
}) {
    try {
        const order = await db.order.findUnique({
            where: { id: data.orderId },
            include: { customer: true }
        });

        if (!order) return { success: false, error: "Không tìm thấy đơn hàng" };

        const newPaid = (order.paid || 0) + data.amount;

        if (newPaid > order.total) {
            return { success: false, error: "Số tiền thanh toán vượt quá tổng giá trị đơn hàng" };
        }

        // 1. Create Income Transaction
        await db.transaction.create({
            data: {
                type: "INCOME",
                amount: data.amount,
                description: `Thanh toán bổ sung đơn hàng #${order.code} - ${data.note || "Thanh toán thủ công"}`,
                customerId: order.customerId,
                paymentMethod: data.paymentMethod,
                orderId: order.id
            }
        });

        // 2. Update Order Paid Amount
        await db.order.update({
            where: { id: data.orderId },
            data: { paid: newPaid }
        });

        revalidatePath("/orders");
        return { success: true };
    } catch (error) {
        console.error("Add payment error:", error);
        return { success: false, error: "Lỗi thêm thanh toán" };
    }
}
