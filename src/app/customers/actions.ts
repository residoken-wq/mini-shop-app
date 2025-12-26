"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getCustomers() {
    return await db.customer.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: { orders: true }
            }
        }
    });
}

export async function createCustomer(data: { name: string; phone?: string; address?: string }) {
    try {
        if (!data.name) return { success: false, error: "Name is required" };

        const customer = await db.customer.create({
            data: {
                name: data.name,
                phone: data.phone,
                address: data.address,
            }
        });

        revalidatePath("/customers");
        return { success: true, customer };
    } catch (error) {
        console.error("Create customer error:", error);
        return { success: false, error: "Failed to create customer" };
    }
}

export async function updateCustomer(id: string, data: { name: string; phone?: string; address?: string }) {
    try {
        const customer = await db.customer.update({
            where: { id },
            data: {
                name: data.name,
                phone: data.phone,
                address: data.address,
            }
        });

        revalidatePath("/customers");
        return { success: true, customer };
    } catch (error) {
        console.error("Update customer error:", error);
        return { success: false, error: "Failed to update customer" };
    }
}

export async function deleteCustomer(id: string) {
    try {
        // Check for orders
        const orders = await db.order.count({ where: { customerId: id } });
        if (orders > 0) {
            return { success: false, error: "Cannot delete customer with orders" };
        }

        await db.customer.delete({ where: { id } });

        revalidatePath("/customers");
        return { success: true };
    } catch (error) {
        console.error("Delete customer error:", error);
        return { success: false, error: "Failed to delete customer" };
    }
}
