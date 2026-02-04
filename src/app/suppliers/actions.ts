"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getSuppliers() {
    return await db.supplier.findMany({
        orderBy: { name: "asc" },
        include: {
            _count: {
                select: { purchases: true }
            }
        }
    });
}

export async function createSupplier(data: { name: string; phone: string; address?: string }) {
    try {
        const supplier = await db.supplier.create({
            data: {
                name: data.name,
                phone: data.phone,
                address: data.address
            }
        });
        revalidatePath("/suppliers");
        return { success: true, supplier };
    } catch (e) {
        return { success: false, error: "Failed to create supplier" };
    }
}

export async function updateSupplier(id: string, data: { name: string; phone: string; address?: string }) {
    try {
        const supplier = await db.supplier.update({
            where: { id },
            data: {
                name: data.name,
                phone: data.phone,
                address: data.address
            }
        });
        revalidatePath("/suppliers");
        return { success: true, supplier };
    } catch (e) {
        return { success: false, error: "Failed to update supplier" };
    }
}

export async function deleteSupplier(id: string) {
    try {
        // Check orders
        const orders = await db.order.count({ where: { supplierId: id } });
        if (orders > 0) {
            return { success: false, error: "Cannot delete supplier with purchase orders" };
        }

        await db.supplier.delete({ where: { id } });
        revalidatePath("/suppliers");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to delete supplier" };
    }
}

import { generateCode } from "@/lib/generators";

export async function createPurchaseOrder(data: {
    supplierId?: string;
    items: { productId: string; quantity: number; price: number }[];
    total: number;
    shippingFee?: number;
    paid: number;
    paymentMethod: string;
}) {
    const { supplierId, items, total, shippingFee = 0, paid, paymentMethod } = data;

    try {
        const poCode = await generateCode("PO");

        const result = await db.$transaction(async (tx) => {
            // 1. Create Purchase Order
            const order = await tx.order.create({
                data: {
                    code: poCode,
                    type: "PURCHASE",
                    status: "PENDING",
                    total: total,
                    shippingFee: shippingFee,
                    paid: paid,
                    supplierId: supplierId,
                    items: {
                        create: items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price,
                        })),
                    },
                },
            });

            // 2. Increase Stock
            for (const item of items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.quantity } }, // Increment for purchase
                });

                await tx.inventoryTransaction.create({
                    data: {
                        productId: item.productId,
                        quantity: item.quantity, // Positive for IN
                        type: "IN",
                        note: `Purchase #${order.id}`,
                    }
                });

                // Optional: Update product cost price (average cost or last purchase price)
                // For simplicity, we update the cost to the new purchase price
                await tx.product.update({
                    where: { id: item.productId },
                    data: { cost: item.price }
                });
            }

            // 3. Handle Supplier Debt (We owe them)
            if (supplierId) {
                await tx.supplier.update({
                    where: { id: supplierId },
                    data: { debt: { increment: total } }
                });
            }

            // 4. Create Transaction Record (Purchase Slip - Unpaid)
            await tx.transaction.create({
                data: {
                    type: "PURCHASE",
                    amount: total,
                    description: `Đơn mua hàng #${poCode}`,
                    supplierId: supplierId,
                    isPaid: false
                }
            });

            return order;
        });

        revalidatePath("/suppliers");
        revalidatePath("/products");
        revalidatePath("/finance");

        return { success: true, orderId: result.id };
    } catch (error) {
        console.error("Failed to create purchase order:", error);
        return { success: false, error: "Failed to create purchase order" };
    }
}

// Get purchase orders with optional supplier filter
export async function getPurchaseOrders(supplierId?: string) {
    return await db.order.findMany({
        where: {
            type: "PURCHASE",
            ...(supplierId ? { supplierId } : {})
        },
        include: {
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

// Pay supplier debt
export async function paySupplierDebt(data: {
    supplierId: string;
    amount: number;
    paymentMethod: string;
    date: Date;
    note?: string;
}) {
    try {
        const { supplierId, amount, paymentMethod, date, note } = data;

        await db.$transaction(async (tx) => {
            // Decrease supplier debt
            await tx.supplier.update({
                where: { id: supplierId },
                data: { debt: { decrement: amount } }
            });

            // Create transaction record
            await tx.transaction.create({
                data: {
                    type: "DEBT_PAYMENT",
                    amount: amount,
                    description: note || "Trả nợ NCC",
                    supplierId: supplierId,
                    paymentMethod: paymentMethod,
                    date: date,
                    isPaid: true, // Assuming debt payment is immediately paid
                    paidAt: date
                }
            });
        });

        revalidatePath("/suppliers");
        revalidatePath("/finance");
        return { success: true };
    } catch (error) {
        console.error("Failed to pay supplier debt:", error);
        return { success: false, error: "Failed to pay supplier debt" };
    }
}

// Recalculate supplier debt from actual orders
export async function recalculateSupplierDebt(supplierId: string) {
    try {
        // Get all purchase orders for this supplier
        const purchaseOrders = await db.order.findMany({
            where: {
                supplierId: supplierId,
                type: "PURCHASE"
            },
            select: {
                total: true,
                paid: true
            }
        });

        // Get all debt payments made to this supplier
        const debtPayments = await db.transaction.findMany({
            where: {
                supplierId: supplierId,
                type: "DEBT_PAYMENT"
            },
            select: {
                amount: true
            }
        });

        // Calculate total debt from purchase orders (total - paid for each order)
        const totalFromOrders = purchaseOrders.reduce((sum, order) => {
            return sum + (order.total - (order.paid || 0));
        }, 0);

        // Calculate total debt payments
        const totalPayments = debtPayments.reduce((sum, payment) => {
            return sum + payment.amount;
        }, 0);

        // Net debt = total from orders - payments made
        const calculatedDebt = totalFromOrders - totalPayments;

        // Update supplier debt
        const supplier = await db.supplier.update({
            where: { id: supplierId },
            data: { debt: calculatedDebt > 0 ? calculatedDebt : 0 }
        });

        revalidatePath("/suppliers");
        revalidatePath("/finance");
        return { success: true, debt: supplier.debt };
    } catch (error) {
        console.error("Failed to recalculate supplier debt:", error);
        return { success: false, error: "Failed to recalculate supplier debt" };
    }
}

// ============ CARRIER MANAGEMENT ============

export async function getCarriers() {
    return await db.carrier.findMany({
        orderBy: { createdAt: "desc" }
    });
}

export async function createCarrier(data: { name: string; phone?: string }) {
    try {
        const carrier = await db.carrier.create({
            data: {
                name: data.name,
                phone: data.phone || null
            }
        });
        revalidatePath("/suppliers");
        revalidatePath("/orders");
        return { success: true, carrier };
    } catch (error) {
        console.error("Create carrier error:", error);
        return { success: false, error: "Lỗi tạo nhà vận chuyển" };
    }
}

export async function updateCarrier(id: string, data: { name: string; phone?: string; isActive?: boolean }) {
    try {
        const carrier = await db.carrier.update({
            where: { id },
            data: {
                name: data.name,
                phone: data.phone || null,
                isActive: data.isActive ?? true
            }
        });
        revalidatePath("/suppliers");
        revalidatePath("/orders");
        return { success: true, carrier };
    } catch (error) {
        console.error("Update carrier error:", error);
        return { success: false, error: "Lỗi cập nhật nhà vận chuyển" };
    }
}

export async function deleteCarrier(id: string) {
    try {
        await db.carrier.delete({ where: { id } });
        revalidatePath("/suppliers");
        revalidatePath("/orders");
        return { success: true };
    } catch (error) {
        console.error("Delete carrier error:", error);
        return { success: false, error: "Lỗi xóa nhà vận chuyển" };
    }
}

export async function updatePurchaseOrderStatus(orderId: string, status: string) {
    try {
        await db.order.update({
            where: { id: orderId },
            data: { status }
        });
        revalidatePath("/suppliers");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to update order status" };
    }
}

