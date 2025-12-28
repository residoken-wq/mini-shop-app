"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Find wholesale customer by phone number
export async function findWholesaleCustomer(phone: string) {
    if (!phone || phone.trim().length < 3) {
        return { success: false, error: "Vui lòng nhập số điện thoại" };
    }

    const customer = await db.customer.findFirst({
        where: {
            phone: { contains: phone.trim() },
            customerType: "wholesale"
        }
    });

    if (!customer) {
        return { success: false, error: "Không tìm thấy khách sỉ với số điện thoại này" };
    }

    return { success: true, customer };
}

// Get products with appropriate pricing
export async function getPortalProducts(customerId?: string) {
    const products = await db.product.findMany({
        where: { stock: { gt: 0 } },
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            cost: true,
            unit: true,
            stock: true,
            imageUrl: true
        }
    });

    const now = new Date();

    // If wholesale customer, get their prices
    let wholesalePrices: Map<string, { price: number; isExpired: boolean }> = new Map();

    if (customerId) {
        const prices = await db.wholesalePrice.findMany({
            where: { customerId }
        });

        prices.forEach(p => {
            const isExpired = p.validTo < now;
            wholesalePrices.set(p.productId, {
                price: p.price,
                isExpired
            });
        });
    }

    return products.map(p => {
        const wholesaleInfo = wholesalePrices.get(p.id);

        return {
            ...p,
            // For retail or no wholesale price: use product price
            // For wholesale with valid price: use wholesale price
            // For wholesale with expired price: price = 0, show warning
            displayPrice: wholesaleInfo
                ? (wholesaleInfo.isExpired ? 0 : wholesaleInfo.price)
                : p.price,
            isExpired: wholesaleInfo?.isExpired || false,
            hasWholesalePrice: !!wholesaleInfo
        };
    });
}

// Submit portal order
export async function submitPortalOrder(data: {
    customerType: "retail" | "wholesale";
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    items: { productId: string; quantity: number; price: number }[];
}) {
    try {
        // Validate
        if (data.items.length === 0) {
            return { success: false, error: "Vui lòng chọn ít nhất 1 sản phẩm" };
        }

        // Check for expired prices (price = 0)
        const hasExpired = data.items.some(item => item.price === 0);
        if (hasExpired) {
            return {
                success: false,
                error: "Có sản phẩm giá đã hết hạn. Vui lòng liên hệ shop để cập nhật bảng giá."
            };
        }

        // Calculate total
        const total = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Generate order code
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const orderCount = await db.order.count({
            where: {
                createdAt: {
                    gte: new Date(today.getFullYear(), today.getMonth(), today.getDate())
                }
            }
        });
        const orderCode = `PO-${dateStr}-${String(orderCount + 1).padStart(2, '0')}`;

        // Create order
        const order = await db.order.create({
            data: {
                code: orderCode,
                type: "SALE",
                status: "PENDING",
                total,
                customerId: data.customerId || null,
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.price
                    }))
                }
            },
            include: {
                items: {
                    include: { product: true }
                }
            }
        });

        revalidatePath("/orders");

        return {
            success: true,
            order,
            orderCode,
            total
        };
    } catch (error) {
        console.error("Submit portal order error:", error);
        return { success: false, error: "Đã xảy ra lỗi khi tạo đơn hàng" };
    }
}
