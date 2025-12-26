import { getProducts } from "./actions";
import { ProductList } from "./product-list";

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
    const products = await getProducts();

    return (
        <div className="h-full">
            <ProductList initialProducts={products} />
        </div>
    );
}
