import { getSuppliers } from "./actions";
import { getProducts } from "../sales/actions";
import { SupplierInterface } from "./supplier-interface";

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
    const products = await getProducts();
    const suppliers = await getSuppliers();

    return (
        <div className="h-full">
            <SupplierInterface initialProducts={products} initialSuppliers={suppliers} />
        </div>
    );
}
