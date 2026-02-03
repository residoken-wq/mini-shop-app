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

export async function createCustomer(data: { name: string; phone?: string; phones?: string; address?: string; customerType?: string }) {
    try {
        if (!data.name) return { success: false, error: "Name is required" };

        const customer = await db.customer.create({
            data: {
                name: data.name,
                phone: data.phone,
                phones: data.phones,
                address: data.address,
                customerType: data.customerType || "retail",
            }
        });

        revalidatePath("/customers");
        return { success: true, customer };
    } catch (error) {
        console.error("Create customer error:", error);
        return { success: false, error: "Failed to create customer" };
    }
}

export async function updateCustomer(id: string, data: { name: string; phone?: string; phones?: string; address?: string; customerType?: string }) {
    try {
        const customer = await db.customer.update({
            where: { id },
            data: {
                name: data.name,
                phone: data.phone,
                phones: data.phones,
                address: data.address,
                customerType: data.customerType || "retail",
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
// Recalculate customer debt based on completed orders
export async function recalculateCustomerDebt(id: string) {
    try {
        // Find all COMPLETED SALE orders for this customer
        const orders = await db.order.findMany({
            where: {
                customerId: id,
                status: "COMPLETED",
                type: "SALE"
            }
        });

        // Calculate total unpaid amount
        const calculatedDebt = orders.reduce((sum, order) => {
            const unpaid = Math.max(0, order.total - order.paid);
            return sum + unpaid;
        }, 0);

        // Update customer debt
        await db.customer.update({
            where: { id },
            data: { debt: calculatedDebt }
        });

        revalidatePath("/customers");
        return { success: true, debt: calculatedDebt };
    } catch (error) {
        console.error("Recalculate debt error:", error);
        return { success: false, error: "Failed to recalculate debt" };
    }
}
