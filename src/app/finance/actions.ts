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

// Update getTransactions signature to accept filter
export async function getTransactions(supplierId?: string | "ALL") {
    const whereClause: any = {};
    if (supplierId && supplierId !== "ALL") {
        whereClause.supplierId = supplierId;
    }

    return await db.transaction.findMany({
        where: whereClause,
        orderBy: { date: "desc" },
        take: 50,
        include: {
            customer: { select: { name: true } },
            supplier: { select: { name: true } }
        }
    });
}

export async function confirmTransactionPayment(transactionId: string, paidDate: Date, paymentMethod: string) {
    try {
        const transaction = await db.transaction.findUnique({ where: { id: transactionId } });
        if (!transaction) return { success: false, error: "Transaction not found" };

        const newDescription = transaction.description ? `${transaction.description} - ${paymentMethod}` : `Chi phí - ${paymentMethod}`;

        await db.$transaction(async (tx) => {
            // 1. Mark as Paid
            await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    isPaid: true,
                    paidAt: paidDate,
                    description: newDescription
                }
            });

            // 2. Reduce Debt if it's a Purchase/Expense related to a Supplier
            if (transaction.supplierId && ["PURCHASE", "EXPENSE"].includes(transaction.type)) {
                await tx.supplier.update({
                    where: { id: transaction.supplierId },
                    data: { debt: { decrement: transaction.amount } }
                });
            }
        });

        revalidatePath("/finance");
        revalidatePath("/suppliers");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to confirm payment" };
    }
}

export async function deleteTransaction(id: string) {
    try {
        const transaction = await db.transaction.findUnique({ where: { id } });
        if (!transaction) return { success: false, error: "Transaction not found" };

        await db.$transaction(async (tx) => {
            // Revert Debt if applicable
            if (transaction.type === "DEBT_COLLECTION" && transaction.customerId) {
                // Was: Customer Paid Us -> Debt decreased
                // Revert: Increase Debt
                await tx.customer.update({
                    where: { id: transaction.customerId },
                    data: { debt: { increment: transaction.amount } }
                });
            } else if (transaction.type === "DEBT_PAYMENT" && transaction.supplierId) {
                // Was: We Paid Supplier -> Debt decreased
                // Revert: Increase Debt
                await tx.supplier.update({
                    where: { id: transaction.supplierId },
                    data: { debt: { increment: transaction.amount } }
                });
            } else if (transaction.type === "EXPENSE" && transaction.supplierId && (transaction as any).isPaid) {
                // Paid Expense linked to Supplier -> Debt decreased
                // Revert: Increase Debt
                await tx.supplier.update({
                    where: { id: transaction.supplierId },
                    data: { debt: { increment: transaction.amount } }
                });
            }


            await tx.transaction.delete({ where: { id } });

            // 2. Reduce Order Paid Amount if linked to an Order
            // Try to find Order Code in description (e.g. "Order #SO-20231225-01" or "đơn hàng #SO-2023...")
            if (transaction.description) {
                const orderCodeMatch = transaction.description.match(/#([A-Z0-9-]+)/);
                if (orderCodeMatch && orderCodeMatch[1]) {
                    const orderCode = orderCodeMatch[1];
                    const order = await tx.order.findUnique({ where: { code: orderCode } });


                    if (order) {
                        // Recalculate Paid Amount from scratch to ensure accuracy
                        // We fetch all REMAINING transactions that mention this order code
                        const relatedTransactions = await tx.transaction.findMany({
                            where: {
                                description: { contains: orderCode }
                            }
                        });

                        let totalPaid = 0;
                        if (order.type === "SALE") {
                            // For SALE, we count INCOME as payment from customer
                            totalPaid = relatedTransactions
                                .filter(t => t.type === "INCOME")
                                .reduce((sum, t) => sum + t.amount, 0);
                        } else if (order.type === "PURCHASE") {
                            // For PURCHASE, we count EXPENSE as payment to supplier
                            totalPaid = relatedTransactions
                                .filter(t => t.type === "EXPENSE")
                                .reduce((sum, t) => sum + t.amount, 0);
                        }

                        await tx.order.update({
                            where: { id: order.id },
                            data: { paid: totalPaid }
                        });
                    }
                }
            }
        });

        revalidatePath("/finance");
        revalidatePath("/customers");
        revalidatePath("/suppliers");
        revalidatePath("/orders");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to delete transaction" };
    }
}
