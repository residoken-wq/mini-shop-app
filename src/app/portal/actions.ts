"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { generateCode } from "@/lib/generators";

// Get active promotions for portal banner and pricing
export async function getActivePromotions() {
    const now = new Date();

    try {
        const promotions = await db.promotion.findMany({
            where: {
                isActive: true,
                startDate: { lte: now },
                endDate: { gte: now }
            },
            include: {
                products: {
                    include: {
                        product: {
                            select: { id: true, name: true, price: true }
                        },
                        tiers: {
                            orderBy: { minQuantity: "asc" }
                        }
                    }
                }
            },
            orderBy: { startDate: "desc" }
        });

        return promotions.map(promo => ({
            id: promo.id,
            name: promo.name,
            description: promo.description,
            startDate: promo.startDate,
            endDate: promo.endDate,
            products: promo.products.map(pp => ({
                productId: pp.productId,
                productName: pp.product.name,
                originalPrice: pp.product.price,
                tiers: pp.tiers.map(t => ({
                    minQuantity: t.minQuantity,
                    price: t.price
                }))
            }))
        }));
    } catch (error) {
        console.error("Error fetching active promotions:", error);
        return [];
    }
}

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
            imageUrl: true,
            saleUnit: true,
            saleRatio: true
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

    const mappedProducts = products.map(p => {
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

    // If wholesale customer, filter to show ONLY valid wholesale products
    if (customerId) {
        return mappedProducts.filter(p => p.hasWholesalePrice && !p.isExpired);
    }

    return mappedProducts;
}

// Submit portal order
export async function submitPortalOrder(data: {
    customerType: "retail" | "wholesale";
    customerId?: string;
    // Delivery info
    recipientName?: string;
    recipientPhone?: string;
    deliveryAddress?: string;
    // Delivery method: "PICKUP" or "DELIVERY"
    deliveryMethod?: string;
    // Customer note
    note?: string;
    // Payment method: "QR", "COD", "CREDIT"
    paymentMethod?: string;
    items: { productId: string; quantity: number; price: number; unit?: string }[];
    shippingFee?: number;
}) {
    try {
        // Validate
        if (data.items.length === 0) {
            return { success: false, error: "Vui lòng chọn ít nhất 1 sản phẩm" };
        }

        const deliveryMethod = data.deliveryMethod || "DELIVERY";

        // Validate delivery info
        if (!data.recipientName?.trim()) {
            return { success: false, error: "Vui lòng nhập tên người nhận" };
        }
        if (!data.recipientPhone?.trim()) {
            return { success: false, error: "Vui lòng nhập số điện thoại" };
        }
        // Only require address for DELIVERY method
        if (deliveryMethod === "DELIVERY" && !data.deliveryAddress?.trim()) {
            return { success: false, error: "Vui lòng nhập địa chỉ giao hàng" };
        }

        // Validate payment method
        const paymentMethod = data.paymentMethod || "COD";
        if (paymentMethod === "CREDIT" && data.customerType !== "wholesale") {
            return { success: false, error: "Công nợ chỉ dành cho khách sỉ" };
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
        let total = data.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Add shipping fee if applicable
        const shippingFee = (deliveryMethod === "DELIVERY" && data.shippingFee) ? data.shippingFee : 0;
        total += shippingFee;

        // Generate order code
        const orderCode = await generateCode("SO");

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
                deliveryAddress: deliveryMethod === "DELIVERY" ? data.deliveryAddress : null,
                deliveryMethod: deliveryMethod,
                note: data.note || null,
                paymentMethod: paymentMethod,
                shippingFee: shippingFee,
                shippingPaidBy: "CUSTOMER",
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        price: item.price,
                        unit: item.unit || "kg"
                    }))
                }
            },
            include: {
                items: {
                    include: { product: true }
                }
            }
        });

        // Send email notification (async, don't block)
        try {
            const { sendOrderNotificationEmail } = await import("@/lib/email");
            sendOrderNotificationEmail({
                code: orderCode,
                customerName: data.recipientName || "Khách lẻ",
                customerPhone: data.recipientPhone || "",
                deliveryAddress: data.deliveryAddress,
                deliveryMethod: deliveryMethod,
                paymentMethod: paymentMethod,
                items: order.items.map(item => ({
                    name: item.product.name,
                    quantity: item.quantity,
                    price: item.price,
                    unit: item.product.unit
                })),
                total,
                note: data.note,
                createdAt: order.createdAt
            }).catch(err => console.error("Email notification failed:", err));
        } catch (emailError) {
            console.error("Failed to send email notification:", emailError);
            // Don't fail the order if email fails
        }

        revalidatePath("/orders");

        return {
            success: true,
            order,
            orderCode,
            total,
            paymentMethod
        };
    } catch (error) {
        console.error("Submit portal order error:", error);
        return { success: false, error: "Đã xảy ra lỗi khi tạo đơn hàng" };
    }
}

// Get shop bank info for QR payment
export async function getShopBankInfo() {
    try {
        const settings = await db.shopSettings.findFirst();
        if (!settings) {
            return { success: false, error: "Chưa cấu hình thông tin cửa hàng" };
        }
        return {
            success: true,
            bankInfo: {
                bankName: settings.bankName,
                bankAccount: settings.bankAccount,
                bankOwner: settings.bankOwner
            }
        };
    } catch (error) {
        console.error("Get bank info error:", error);
        return { success: false, error: "Lỗi lấy thông tin ngân hàng" };
    }
}

// Get active districts for portal delivery
export async function getActiveDistrictsForPortal() {
    try {
        const districts = await db.district.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                shippingFee: true
            }
        });
        return { success: true, districts };
    } catch (error) {
        console.error("Get districts error:", error);
        return { success: false, error: "Lỗi lấy danh sách quận/huyện" };
    }
}

import { ORDER_STATUSES, OrderStatus } from "@/app/orders/order-constants";

// Track orders by phone number (for customer)
export async function trackOrdersByPhone(phone: string) {
    if (!phone || phone.trim().length < 3) {
        return { success: false, error: "Vui lòng nhập số điện thoại" };
    }

    const searchPhone = phone.trim();

    // Find orders by recipient phone or customer phone
    const orders = await db.order.findMany({
        where: {
            type: "SALE",
            OR: [
                { recipientPhone: { contains: searchPhone } },
                {
                    customer: {
                        OR: [
                            { phone: { contains: searchPhone } },
                            { phones: { contains: searchPhone } }
                        ]
                    }
                }
            ]
        },
        include: {
            customer: true,
            items: {
                include: {
                    product: true
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    // Get bank info for QR payment
    const settings = await db.shopSettings.findUnique({
        where: { id: "shop" }
    });

    return {
        success: true,
        bankInfo: settings ? {
            bankName: settings.bankName,
            bankAccount: settings.bankAccount,
            bankOwner: settings.bankOwner
        } : null,
        orders: orders.map(order => ({
            id: order.id,
            code: order.code,
            status: order.status,
            statusInfo: ORDER_STATUSES[order.status as OrderStatus] || ORDER_STATUSES.PENDING,
            total: order.total,
            paid: order.paid || 0,
            discount: order.discount || 0,
            shippingFee: order.shippingFee || 0,
            shippingPaidBy: order.shippingPaidBy,
            paymentMethod: order.paymentMethod,
            recipientName: order.recipientName,
            recipientPhone: order.recipientPhone,
            deliveryAddress: order.deliveryAddress,
            createdAt: order.createdAt,
            items: order.items.map(item => ({
                name: item.product.name,
                quantity: item.quantity,
                price: item.price
            }))
        }))
    };
}
