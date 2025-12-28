"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Find wholesale customer by phone number (searches primary phone + phones array)
export async function findWholesaleCustomer(phone: string) {
    if (!phone || phone.trim().length < 3) {
        return { success: false, error: "Vui lòng nhập số điện thoại" };
    }

    const searchPhone = phone.trim();

    // Get all wholesale customers and search in phones array
    const customers = await db.customer.findMany({
        where: { customerType: "wholesale" }
    });

    // Find customer with matching phone (primary or in phones array)
    const customer = customers.find(c => {
        // Check primary phone
        if (c.phone && c.phone.includes(searchPhone)) return true;

        // Check phones array (stored as JSON string)
        if (c.phones) {
            try {
                const phonesArray = JSON.parse(c.phones) as string[];
                return phonesArray.some(p => p.includes(searchPhone));
            } catch {
                return false;
            }
        }
        return false;
    });

    if (!customer) {
        return { success: false, error: "Không tìm thấy khách sỉ với số điện thoại này" };
    }

    return { success: true, customer };
}

// Get customer's pending/unpaid orders
export async function getCustomerPendingOrders(customerId: string) {
    const orders = await db.order.findMany({
        where: {
            customerId,
            status: { in: ["PENDING", "CONFIRMED"] }, // Unpaid orders
            type: "SALE"
        },
        orderBy: { createdAt: "desc" },
        include: {
            items: {
                include: { product: true }
            }
        }
    });

    return orders.map(order => ({
        id: order.id,
        code: order.code,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
        itemCount: order.items.length,
        items: order.items.map(item => ({
            name: item.product.name,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price
        }))
    }));
}


// Get products with appropriate pricing
export async function getPortalProducts(customerId?: string) {
    // Show ALL products, not just those with stock > 0
    const products = await db.product.findMany({
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
    // Delivery info
    recipientName?: string;
    recipientPhone?: string;
    deliveryAddress?: string;
    items: { productId: string; quantity: number; price: number }[];
}) {
    try {
        // Validate
        if (data.items.length === 0) {
            return { success: false, error: "Vui lòng chọn ít nhất 1 sản phẩm" };
        }

        // Validate delivery info
        if (!data.recipientName?.trim()) {
            return { success: false, error: "Vui lòng nhập tên người nhận" };
        }
        if (!data.recipientPhone?.trim()) {
            return { success: false, error: "Vui lòng nhập số điện thoại giao hàng" };
        }
        if (!data.deliveryAddress?.trim()) {
            return { success: false, error: "Vui lòng nhập địa chỉ giao hàng" };
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
                recipientName: data.recipientName,
                recipientPhone: data.recipientPhone,
                deliveryAddress: data.deliveryAddress,
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

