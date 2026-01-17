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

export async function bulkImportMarketProducts(products: { name: string; price: number; imageUrl?: string }[]) {
    try {
        // 1. Ensure Category "Rau Củ" exists
        let category = await db.category.findFirst({ where: { code: "RAU" } });
        if (!category) {
            category = await db.category.create({
                data: { name: "Rau Củ", code: "RAU" }
            });
        }

        let count = 0;
        for (const p of products) {
            const existing = await db.product.findFirst({ where: { name: p.name } });
            if (!existing) {
                const sku = await generateSku(category.code);
                await db.product.create({
                    data: {
                        name: p.name,
                        sku: sku,
                        categoryId: category.id,
                        price: p.price,
                        cost: p.price * 0.8,
                        stock: 0,
                        imageUrl: p.imageUrl
                    }
                });
                count++;
            }
        }
        revalidatePath("/products");
        return { success: true, count };
    } catch (e) {
        return { success: false, error: "Failed to import" };
    }
}

export async function getMarketPrices() {
    // Dynamic import to avoid SSR issues with cheerio
    const { scrapeBinhDienMarket } = await import("@/lib/market-scraper");
    return await scrapeBinhDienMarket();
}

// Product Schema already updated. Using any to bypass TS error until restart 
export async function createProduct(data: any) {
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
                unit: data.unit || "kg",
                imageUrl: data.imageUrl,
                saleUnit: data.saleUnit,
                saleRatio: data.saleRatio
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

export async function updateProduct(id: string, data: any) {
    try {
        const { stock: _stock, ...updateData } = data; // Remove stock from update

        const product = await db.product.update({
            where: { id },
            data: updateData
        });
        revalidatePath("/products");
        revalidatePath("/sales");
        return { success: true, product };
    } catch (e) {
        return { success: false, error: "Failed to update product" };
    }
}

export async function deleteProduct(id: string) {
    try {
        // Check for dependencies? OrderItems, InventoryTransactions?
        // If we force delete, we might break history. 
        // Best practice: Soft delete or check. 
        // For this app, let's block if there are OrderItems.
        const orders = await db.orderItem.count({ where: { productId: id } });
        if (orders > 0) {
            return { success: false, error: "Cannot delete product with sales history" };
        }

        // Just delete transactions if no sales? Or block?
        // Let's Cascade delete transactions manually or block.
        // Let's block if stock > 0
        const product = await db.product.findUnique({ where: { id } });
        if (product && product.stock > 0) {
            return { success: false, error: "Cannot delete product with stock > 0" };
        }

        // Delete transactions first?
        await db.inventoryTransaction.deleteMany({ where: { productId: id } });
        await db.product.delete({ where: { id } });

        revalidatePath("/products");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to delete product" };
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

// Excel Import Types
interface ExcelProductRow {
    name?: string;
    sku?: string;
    price?: number;
    cost?: number;
    stock?: number;
    unit?: string;
    category?: string;
}

export async function importProductsFromExcel(
    products: ExcelProductRow[],
    defaultCategoryId?: string
) {
    try {
        let created = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const row of products) {
            // Validate required fields
            if (!row.name || row.name.trim() === "") {
                skipped++;
                continue;
            }

            // Check if product already exists
            const existing = await db.product.findFirst({
                where: { name: row.name.trim() }
            });

            if (existing) {
                skipped++;
                continue;
            }

            // Find or create category
            let categoryId = defaultCategoryId;
            if (row.category && row.category.trim()) {
                const cat = await db.category.findFirst({
                    where: {
                        OR: [
                            { name: { contains: row.category.trim() } },
                            { code: row.category.trim().toUpperCase() }
                        ]
                    }
                });
                if (cat) {
                    categoryId = cat.id;
                }
            }

            if (!categoryId) {
                // Create a default category if none specified
                let defaultCat = await db.category.findFirst({ where: { code: "KHAC" } });
                if (!defaultCat) {
                    defaultCat = await db.category.create({
                        data: { name: "Khác", code: "KHAC" }
                    });
                }
                categoryId = defaultCat.id;
            }

            // Generate SKU if not provided
            const category = await db.category.findUnique({ where: { id: categoryId } });
            const sku = row.sku?.trim() || await generateSku(category?.code || "SP");

            await db.product.create({
                data: {
                    name: row.name.trim(),
                    sku: sku,
                    categoryId: categoryId,
                    price: row.price || 0,
                    cost: row.cost || 0,
                    stock: row.stock || 0,
                    unit: row.unit?.trim() || "kg"
                }
            });
            created++;
        }

        revalidatePath("/products");
        revalidatePath("/categories");
        return { success: true, created, skipped, errors };
    } catch (error) {
        console.error("Import error:", error);
        return { success: false, error: "Lỗi khi import sản phẩm" };
    }
}
