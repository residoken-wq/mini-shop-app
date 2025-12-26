import { getCategories } from "./actions";
import CategoriesClient from "./categories-client";

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
    const categories = await getCategories();

    return <CategoriesClient initialCategories={categories} />;
}
