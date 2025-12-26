"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getProducts() {
    return await db.product.findMany({
        orderBy: { name: "asc" },
    });
}

import { generateSku } from "@/lib/generators";

export async function getCategories() {
    return await db.category.findMany({ orderBy: { name: "asc" } });
}

export async function createCategory(name: string, code: string) {
    try {
        const category = await db.category.create({
            data: { name, code: code.toUpperCase() }
        });
        revalidatePath("/products");
        return { success: true, category };
    } catch (e) {
        return { success: false, error: "Failed to create category" };
    }
}

import { scrapeBinhDienMarket } from "@/lib/market-scraper";

export async function getMarketPrices() {
    return await scrapeBinhDienMarket();
}

export async function createProduct(data: { name: string; categoryId: string; price: number; cost: number; stock: number; imageUrl?: string }) {
    try {
        // Get Category Code for SKU prefix
        const category = await db.category.findUnique({ where: { id: data.categoryId } });
        if (!category) return { success: false, error: "Category not found" };

        const sku = await generateSku(category.code);

        const product = await db.product.create({
            data: {
                name: data.name,
                sku: sku,
                categoryId: data.categoryId,
                price: data.price,
                cost: data.cost,
                stock: data.stock || 0,
                imageUrl: data.imageUrl
            }
        });

        // Initial stock log
        if (data.stock > 0) {
            await db.inventoryTransaction.create({
                data: {
                    productId: product.id,
                    type: "IN",
                    quantity: data.stock,
                    note: "Initial Stock",
                }
            });
        }

        revalidatePath("/products");
        revalidatePath("/sales");
        return { success: true, product };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Failed to create product" };
    }
}

export async function adjustStock(data: { productId: string; type: "IN" | "OUT" | "ADJUSTMENT"; quantity: number; note?: string }) {
    const { productId, type, quantity, note } = data;

    try {
        // Calculate Actual Delta
        let delta = quantity;
        if (type === "OUT") delta = -quantity;

        // For ADJUSTMENT, we might need to know the 'real' stock to calc delta, 
        // but typically "Adjustment" in this context usually means "Add/Remove this amount".
        // If "Adjustment" means "Set to exact value", the logic is different.
        // Let's assume Type "ADJUSTMENT" means "Correction" (could be + or -).
        // Let's stick to IN (Add), OUT (Remove), LOST (Remove), BROKEN (Remove), FOUND (Add).
        // For simplicity UI, we will pass explicit Delta if needed, or stick to:
        // IN -> +Qty
        // OUT -> -Qty

        // If type is "ADJUSTMENT", we assume the user provides a signed quantity or we treat it as an update.
        // Let's refine: The UI will send positive quantity and a specific type.

        // Let's support types: "IN" (+), "OUT" (-), "LOST" (-), "DAMAGED" (-)
        let finalDelta = quantity;
        if (["OUT", "LOST", "DAMAGED"].includes(type)) {
            finalDelta = -quantity;
        }

        // Update Product Stock
        await db.product.update({
            where: { id: productId },
            data: { stock: { increment: finalDelta } }
        });

        // Log Transaction
        await db.inventoryTransaction.create({
            data: {
                productId,
                type: type,
                quantity: finalDelta,
                note: note
            }
        });

        revalidatePath("/products");
        revalidatePath("/sales");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to adjust stock" };
    }
}

export async function getInventoryHistory(productId: string) {
    return await db.inventoryTransaction.findMany({
        where: { productId },
        orderBy: { date: "desc" },
        take: 50 // Limit to last 50
    });
}
