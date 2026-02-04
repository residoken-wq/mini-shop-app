import { getOrders } from "./actions";
import { OrdersClient } from "./orders-client";
import { getShopSettings } from "@/app/settings/actions";

export const dynamic = 'force-dynamic';

import { db } from "@/lib/db";

export default async function OrdersPage() {
    const orders = await getOrders();
    const shopSettings = await getShopSettings();

    // Calculate total expenses from transactions
    const expenses = await db.transaction.aggregate({
        where: { type: "EXPENSE" },
        _sum: { amount: true }
    });

    const expensesTotal = expenses._sum.amount || 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Đơn hàng</h1>
            </div>
            <OrdersClient initialOrders={orders} expensesTotal={expensesTotal} shopSettings={shopSettings} />
        </div>
    );
}
