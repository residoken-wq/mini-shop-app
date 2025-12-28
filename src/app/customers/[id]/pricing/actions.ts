"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Get all wholesale prices for a customer with product cost info
export async function getWholesalePrices(customerId: string) {
    const prices = await db.wholesalePrice.findMany({
        where: { customerId },
        include: {
            product: {
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    cost: true,
                    price: true,
                    unit: true
                }
            }
        },
        orderBy: { product: { name: "asc" } }
    });

    const now = new Date();
    return prices.map(p => ({
        ...p,
        isExpired: p.validTo < now,
        isActive: p.validFrom <= now && p.validTo >= now
    }));
}

// Get all products for pricing (including those without wholesale price)
export async function getProductsForPricing(customerId: string) {
    const products = await db.product.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            sku: true,
            cost: true,
            price: true,
            unit: true
        }
    });

    const existingPrices = await db.wholesalePrice.findMany({
        where: { customerId },
        select: { productId: true }
    });

    const existingProductIds = new Set(existingPrices.map(p => p.productId));

    return products.map(p => ({
        ...p,
        hasWholesalePrice: existingProductIds.has(p.id)
    }));
}

// Create a new wholesale price
export async function createWholesalePrice(data: {
    customerId: string;
    productId: string;
    price: number;
    validFrom?: Date;
    validTo: Date;
}) {
    try {
        const price = await db.wholesalePrice.create({
            data: {
                customerId: data.customerId,
                productId: data.productId,
                price: data.price,
                validFrom: data.validFrom || new Date(),
                validTo: data.validTo
            }
        });
        revalidatePath(`/customers/${data.customerId}/pricing`);
        return { success: true, price };
    } catch (e: any) {
        if (e.code === 'P2002') {
            return { success: false, error: "Sản phẩm này đã có trong bảng giá" };
        }
        return { success: false, error: "Không thể tạo giá" };
    }
}

// Update a wholesale price
export async function updateWholesalePrice(
    id: string,
    data: { price: number; validFrom?: Date; validTo?: Date }
) {
    try {
        const price = await db.wholesalePrice.update({
            where: { id },
            data: {
                price: data.price,
                ...(data.validFrom && { validFrom: data.validFrom }),
                ...(data.validTo && { validTo: data.validTo })
            }
        });
        const customerId = price.customerId;
        revalidatePath(`/customers/${customerId}/pricing`);
        return { success: true, price };
    } catch (e) {
        return { success: false, error: "Không thể cập nhật giá" };
    }
}

// Delete a wholesale price
export async function deleteWholesalePrice(id: string) {
    try {
        const price = await db.wholesalePrice.delete({
            where: { id }
        });
        revalidatePath(`/customers/${price.customerId}/pricing`);
        return { success: true };
    } catch (e) {
        return { success: false, error: "Không thể xóa giá" };
    }
}

// Apply profit margin to a single product
export async function applyProfitMargin(
    customerId: string,
    productId: string,
    marginPercent: number,
    validTo: Date
) {
    try {
        const product = await db.product.findUnique({
            where: { id: productId },
            select: { cost: true }
        });

        if (!product) {
            return { success: false, error: "Không tìm thấy sản phẩm" };
        }

        const price = product.cost * (1 + marginPercent / 100);

        // Upsert - create or update
        await db.wholesalePrice.upsert({
            where: {
                customerId_productId: { customerId, productId }
            },
            create: {
                customerId,
                productId,
                price: Math.round(price),
                validFrom: new Date(),
                validTo
            },
            update: {
                price: Math.round(price),
                validTo
            }
        });

        revalidatePath(`/customers/${customerId}/pricing`);
        return { success: true };
    } catch (e) {
        return { success: false, error: "Không thể áp dụng lợi nhuận" };
    }
}

// Apply profit margin to all products
export async function applyProfitMarginAll(
    customerId: string,
    marginPercent: number,
    validTo: Date
) {
    try {
        const products = await db.product.findMany({
            select: { id: true, cost: true }
        });

        for (const product of products) {
            const price = product.cost * (1 + marginPercent / 100);

            await db.wholesalePrice.upsert({
                where: {
                    customerId_productId: { customerId, productId: product.id }
                },
                create: {
                    customerId,
                    productId: product.id,
                    price: Math.round(price),
                    validFrom: new Date(),
                    validTo
                },
                update: {
                    price: Math.round(price),
                    validTo
                }
            });
        }

        revalidatePath(`/customers/${customerId}/pricing`);
        return { success: true, count: products.length };
    } catch (e) {
        return { success: false, error: "Không thể áp dụng lợi nhuận" };
    }
}

// Copy pricing table from one customer to another
export async function copyPricingTable(fromCustomerId: string, toCustomerId: string) {
    try {
        const sourcePrices = await db.wholesalePrice.findMany({
            where: { customerId: fromCustomerId }
        });

        if (sourcePrices.length === 0) {
            return { success: false, error: "Khách hàng nguồn không có bảng giá" };
        }

        // Delete existing prices for target customer
        await db.wholesalePrice.deleteMany({
            where: { customerId: toCustomerId }
        });

        // Create new prices for target customer
        for (const price of sourcePrices) {
            await db.wholesalePrice.create({
                data: {
                    customerId: toCustomerId,
                    productId: price.productId,
                    price: price.price,
                    validFrom: price.validFrom,
                    validTo: price.validTo
                }
            });
        }

        revalidatePath(`/customers/${toCustomerId}/pricing`);
        return { success: true, count: sourcePrices.length };
    } catch (e) {
        return { success: false, error: "Không thể copy bảng giá" };
    }
}

// Get all wholesale customers for copy dropdown
export async function getWholesaleCustomers() {
    return await db.customer.findMany({
        where: { customerType: "wholesale" },
        select: { id: true, name: true, phone: true },
        orderBy: { name: "asc" }
    });
}

// Get customer details
export async function getCustomer(id: string) {
    return await db.customer.findUnique({
        where: { id },
        select: { id: true, name: true, phone: true, customerType: true }
    });
}
