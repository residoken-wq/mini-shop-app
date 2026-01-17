import { getProducts } from "@/app/products/actions";
import { PromotionForm } from "@/components/promotions/promotion-form";

export const dynamic = 'force-dynamic';

export default async function NewPromotionPage() {
    let products: { id: string; name: string; price: number }[] = [];
    try {
        products = await getProducts();
    } catch (error) {
        console.error("Error loading products:", error);
    }

    return (
        <div className="container mx-auto py-6">
            <PromotionForm products={products} />
        </div>
    );
}
