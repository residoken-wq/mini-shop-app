"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getPromotions() {
    try {
        const promotions = await db.promotion.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                products: {
                    select: { id: true }
                }
            }
        });
        return { success: true, data: promotions };
    } catch (e) {
        return { success: false, error: "Failed to fetch promotions" };
    }
}

export async function getPromotionById(id: string) {
    try {
        const promotion = await db.promotion.findUnique({
            where: { id },
            include: {
                products: {
                    include: {
                        product: true,
                        tiers: {
                            orderBy: { minQuantity: "asc" }
                        }
                    }
                }
            }
        });
        if (!promotion) return { success: false, error: "Promotion not found" };
        return { success: true, data: promotion };
    } catch (e) {
        return { success: false, error: "Failed to fetch promotion" };
    }
}

export async function createPromotion(data: {
    name: string;
    description?: string;
    bannerUrl?: string;
    startDate: Date;
    endDate: Date;
    isActive?: boolean;
    products: {
        productId: string;
        tiers: { minQuantity: number; price: number }[];
    }[];
}) {
    try {
        const { name, description, bannerUrl, startDate, endDate, isActive, products } = data;

        await db.promotion.create({
            data: {
                name,
                description,
                bannerUrl,
                startDate,
                endDate,
                isActive: isActive ?? true,
                products: {
                    create: products.map((p) => ({
                        productId: p.productId,
                        tiers: {
                            create: p.tiers.map((t) => ({
                                minQuantity: t.minQuantity,
                                price: t.price
                            }))
                        }
                    }))
                }
            }
        });

        revalidatePath("/promotions");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Failed to create promotion" };
    }
}

export async function updatePromotion(id: string, data: {
    name: string;
    description?: string;
    bannerUrl?: string;
    startDate: Date;
    endDate: Date;
    isActive?: boolean;
    products: {
        productId: string;
        tiers: { minQuantity: number; price: number }[];
    }[];
}) {
    try {
        const { name, description, bannerUrl, startDate, endDate, isActive, products } = data;

        // Transaction to handle complex update:
        // 1. Update basic info
        // 2. Delete existing products (and cascade delete tiers)
        // 3. Re-create products and tiers
        // Efficient enough for simple promotion structure

        await db.$transaction(async (tx) => {
            // Update basic info
            await tx.promotion.update({
                where: { id },
                data: {
                    name,
                    description,
                    bannerUrl,
                    startDate,
                    endDate,
                    isActive: isActive ?? true,
                }
            });

            // Delete all existing products for this promotion
            // (Tiers will be deleted via Cascade delete if schema is correct, otherwise we delete tiers first)
            // Schema has `onDelete: Cascade` for tiers, so deleting PromotionProduct is enough.
            await tx.promotionProduct.deleteMany({
                where: { promotionId: id }
            });

            // Re-create products and tiers
            for (const p of products) {
                await tx.promotionProduct.create({
                    data: {
                        promotionId: id,
                        productId: p.productId,
                        tiers: {
                            create: p.tiers.map((t) => ({
                                minQuantity: t.minQuantity,
                                price: t.price
                            }))
                        }
                    }
                });
            }
        });

        revalidatePath("/promotions");
        revalidatePath(`/promotions/${id}`);
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Failed to update promotion" };
    }
}

export async function deletePromotion(id: string) {
    try {
        await db.promotion.delete({ where: { id } });
        revalidatePath("/promotions");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to delete promotion" };
    }
}

export async function togglePromotionStatus(id: string, isActive: boolean) {
    try {
        await db.promotion.update({
            where: { id },
            data: { isActive }
        });
        revalidatePath("/promotions");
        return { success: true };
    } catch (e) {
        return { success: false, error: "Failed to update status" };
    }
}
