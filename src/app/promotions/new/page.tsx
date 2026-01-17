import { getProducts } from "@/app/products/actions";
import { PromotionForm } from "@/components/promotions/promotion-form";

export default async function NewPromotionPage() {
    const products = await getProducts();

    return (
        <div className="container mx-auto py-6">
            <PromotionForm products={products} />
        </div>
    );
}
