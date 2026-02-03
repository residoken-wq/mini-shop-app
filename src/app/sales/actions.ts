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

import { generateCode } from "@/lib/generators";

export async function createOrder(data: {
    customerId?: string;
    items: { productId: string; quantity: number; price: number }[];
    total: number;
    paid: number;
    paymentMethod: string;
}) {
    const { customerId, items, total, paid, paymentMethod } = data;

    try {
        const soCode = await generateCode("SO");

        // Create order with PENDING status - stock, debt, and transactions
        // will be handled through the order management workflow
        const result = await db.order.create({
            data: {
                code: soCode,
                type: "SALE",
                status: "PENDING", // Start as pending, process through order workflow
                total: total,
                paid: paid,
                customerId: customerId,
                paymentMethod: paymentMethod,
                items: {
                    create: items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.price,
                    })),
                },
            },
        });

        revalidatePath("/sales");
        revalidatePath("/");
        revalidatePath("/products");
        revalidatePath("/orders");

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
