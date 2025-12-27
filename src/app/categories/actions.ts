"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getCategories() {
    return await db.category.findMany({
        include: {
            _count: {
                select: { products: true }
            }
        },
        orderBy: { name: 'asc' }
    });
}

export async function createCategory(name: string, code: string) {
    try {
        if (!name || !code) return { success: false, error: "Missing fields" };

        const category = await db.category.create({
            data: { name, code }
        });

        revalidatePath("/categories");
        revalidatePath("/products");
        return { success: true, category };
    } catch (error) {
        console.error("Create category error:", error);
        return { success: false, error: "Failed to create category" };
    }
}

export async function updateCategory(id: string, name: string, code: string) {
    try {
        const category = await db.category.update({
            where: { id },
            data: { name, code }
        });

        revalidatePath("/categories");
        revalidatePath("/products");
        return { success: true, category };
    } catch (error) {
        console.error("Update category error:", error);
        return { success: false, error: "Failed to update category" };
    }
}

export async function deleteCategory(id: string) {
    try {
        // Check for products
        const products = await db.product.count({ where: { categoryId: id } });
        if (products > 0) {
            return { success: false, error: "Cannot delete category with products" };
        }

        await db.category.delete({ where: { id } });

        revalidatePath("/categories");
        revalidatePath("/products");
        return { success: true };
    } catch (error) {
        console.error("Delete category error:", error);
        return { success: false, error: "Failed to delete category" };
    }
}

export async function getProductsByCategory(categoryId: string) {
    return await db.product.findMany({
        where: { categoryId },
        orderBy: { name: 'asc' }
    });
}
