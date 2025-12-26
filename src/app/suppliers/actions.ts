"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getSuppliers() {
    return await db.supplier.findMany({
        orderBy: { name: "asc" },
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

import { generateCode } from "@/lib/generators";

export async function createPurchaseOrder(data: {
    supplierId?: string;
    items: { productId: string; quantity: number; price: number }[];
    total: number;
    paid: number;
    paymentMethod: string;
}) {
    const { supplierId, items, total, paid, paymentMethod } = data;

    try {
        const poCode = await generateCode("PO");

        const result = await db.$transaction(async (tx) => {
            // 1. Create Purchase Order
            const order = await tx.order.create({
                data: {
                    code: poCode,
                    type: "PURCHASE",
                    status: "COMPLETED",
                    total: total,
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
            if (supplierId && paid < total) {
                const debtAmount = total - paid;
                await tx.supplier.update({
                    where: { id: supplierId },
                    data: { debt: { increment: debtAmount } }
                });
            }

            // 4. Create Transaction Record (Expense)
            if (paid > 0) {
                await tx.transaction.create({
                    data: {
                        type: "EXPENSE",
                        amount: paid,
                        description: `Purchase #${order.id} - ${paymentMethod}`,
                        supplierId: supplierId,
                    }
                });
            }

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
