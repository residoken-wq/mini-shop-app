import { notFound } from "next/navigation";
import { getPromotionById } from "../actions";
import { getProducts } from "@/app/products/actions";
import { PromotionForm } from "@/components/promotions/promotion-form";

export default async function EditPromotionPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const { data: promotion } = await getPromotionById(id);
    const products = await getProducts();

    if (!promotion) {
        notFound();
    }

    return (
        <div className="container mx-auto py-6">
            <PromotionForm initialData={promotion} products={products} />
        </div>
    );
}
