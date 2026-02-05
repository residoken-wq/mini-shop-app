
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const supplierName = searchParams.get("name");

        if (!supplierName) {
            return NextResponse.json({ error: "Name is required" });
        }

        const supplier = await db.supplier.findFirst({
            where: { name: { contains: supplierName } }
        });

        if (!supplier) {
            return NextResponse.json({ error: "Supplier not found" });
        }

        const orders = await db.order.findMany({
            where: {
                supplierId: supplier.id,
                type: "PURCHASE"
            }
        });

        const transactions = await db.transaction.findMany({
            where: {
                supplierId: supplier.id
            }
        });

        // Simulating the recalculation logic
        const validOrders = orders.filter(o => o.status !== "CANCELLED");
        const totalFromOrders = validOrders.reduce((sum, order) => sum + (order.total - (order.paid || 0)), 0);

        const debtPayments = transactions.filter(t => t.type === "DEBT_PAYMENT");
        const totalPayments = debtPayments.reduce((sum, t) => sum + t.amount, 0);

        const calculatedDebt = totalFromOrders - totalPayments;

        return NextResponse.json({
            supplier,
            orders,
            transactions,
            calculation: {
                totalFromOrders,
                totalPayments,
                calculatedDebt,
                currentDbDebt: supplier.debt
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message });
    }
}
