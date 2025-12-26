"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getFinanceStats() {
    const customers = await db.customer.findMany({ where: { debt: { gt: 0 } } });
    const suppliers = await db.supplier.findMany({ where: { debt: { gt: 0 } } });

    const receivables = customers.reduce((sum, c) => sum + c.debt, 0);
    const payables = suppliers.reduce((sum, s) => sum + s.debt, 0);

    // Calculate Cash on Hand (Simple summation of all time transactions)
    // In a real app, might want to filter by date or store current balance separately
    const transactions = await db.transaction.findMany();
    let cash = 0;
    transactions.forEach(t => {
        if (["INCOME", "DEBT_COLLECTION"].includes(t.type)) {
            cash += t.amount;
        } else {
            cash -= t.amount;
        }
    });

    return { receivables, payables, cash };
}

export async function getDebtors() {
    const customers = await db.customer.findMany({
        where: { debt: { not: 0 } },
        orderBy: { debt: "desc" }
    });
    const suppliers = await db.supplier.findMany({
        where: { debt: { not: 0 } },
        orderBy: { debt: "desc" }
    });

    return { customers, suppliers };
}

export async function settleDebt(data: { entityId: string; type: "CUSTOMER" | "SUPPLIER"; amount: number; description?: string }) {
    const { entityId, type, amount, description } = data;

    try {
        await db.$transaction(async (tx) => {
            if (type === "CUSTOMER") {
                // Customer pays us (Debt Collection)
                await tx.customer.update({
                    where: { id: entityId },
                    data: { debt: { decrement: amount } }
                });
                await tx.transaction.create({
                    data: {
                        type: "DEBT_COLLECTION",
                        amount: amount,
                        description: description || "Thu nợ khách hàng",
                        customerId: entityId
                    }
                });
            } else {
                // We pay supplier (Debt Payment)
                await tx.supplier.update({
                    where: { id: entityId },
                    data: { debt: { decrement: amount } }
                });
                await tx.transaction.create({
                    data: {
                        type: "DEBT_PAYMENT",
                        amount: amount,
                        description: description || "Thanh toán nợ NCC",
                        supplierId: entityId
                    }
                });
            }
        });

        revalidatePath("/finance");
        revalidatePath("/customers");
        revalidatePath("/suppliers");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to settle debt" };
    }
}

export async function createManualTransaction(data: { type: "INCOME" | "EXPENSE"; amount: number; description: string }) {
    try {
        await db.transaction.create({
            data: {
                type: data.type,
                amount: data.amount,
                description: data.description
            }
        });
        revalidatePath("/finance");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to create transaction" };
    }
}

export async function getTransactions() {
    return await db.transaction.findMany({
        orderBy: { date: "desc" },
        take: 50,
        include: {
            customer: { select: { name: true } },
            supplier: { select: { name: true } }
        }
    });
}
