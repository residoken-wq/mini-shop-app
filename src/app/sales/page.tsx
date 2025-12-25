import { getProducts, getCustomers } from "./actions";
import { SalesInterface } from "./sales-interface";

export const dynamic = 'force-dynamic';

export default async function SalesPage() {
    const products = await getProducts();
    const customers = await getCustomers();

    return (
        <div className="h-full">
            <SalesInterface initialProducts={products} initialCustomers={customers} />
        </div>
    );
}
