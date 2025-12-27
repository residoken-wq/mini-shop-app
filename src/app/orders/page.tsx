import { getOrders } from "./actions";
import { OrdersClient } from "./orders-client";

export default async function OrdersPage() {
    const orders = await getOrders();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Đơn hàng</h1>
            </div>
            <OrdersClient initialOrders={orders} />
        </div>
    );
}
