"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getProducts() {
    return await db.product.findMany({
        orderBy: { name: "asc" },
    });
}

export async function getCustomers() {
    return await db.customer.findMany({
        orderBy: { name: "asc" },
    });
}

export async function createOrder(data: {
    customerId?: string;
    items: { productId: string; quantity: number; price: number }[];
    total: number;
    paid: number;
    paymentMethod: string;
}) {
    const { customerId, items, total, paid, paymentMethod } = data;

    try {
        // Start transaction
        const result = await db.$transaction(async (tx) => {
            // 1. Create Order
            const order = await tx.order.create({
                data: {
                    type: "SALE",
                    status: "COMPLETED", // Assuming immediate completion for POS
                    total: total,
                    customerId: customerId,
                    items: {
                        create: items.map((item) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.price,
                        })),
                    },
                },
            });

            // 2. Reduce Stock
            for (const item of items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } },
                });

                await tx.inventoryTransaction.create({
                    data: {
                        productId: item.productId,
                        quantity: -item.quantity,
                        type: "OUT",
                        note: `Order #${order.id}`,
                    }
                });
            }

            // 3. Handle Debt (if not paid fully)
            if (customerId && paid < total) {
                const debtAmount = total - paid;
                await tx.customer.update({
                    where: { id: customerId },
                    data: { debt: { increment: debtAmount } }
                });
            }

            // 4. Create Transaction Record (Income)
            if (paid > 0) {
                await tx.transaction.create({
                    data: {
                        type: "INCOME",
                        amount: paid,
                        description: `Order #${order.id} - ${paymentMethod}`,
                        customerId: customerId,
                    }
                });
            }

            return order;
        });

        revalidatePath("/sales");
        revalidatePath("/");
        revalidatePath("/products");

        return { success: true, orderId: result.id };
    } catch (error) {
        console.error("Failed to create order:", error);
        return { success: false, error: "Failed to create order" };
    }
}

export async function createCustomer(data: { name: string; phone: string; address?: string }) {
    try {
        const customer = await db.customer.create({
            data: {
                name: data.name,
                phone: data.phone,
                address: data.address
            }
        });
        revalidatePath("/sales");
        return { success: true, customer };
    } catch (e) {
        return { success: false, error: "Failed to create customer" };
    }
}
