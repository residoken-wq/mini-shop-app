"use client";

// District type for shipping
export interface District {
    id: string;
    name: string;
    shippingFee: number;
}

// Product type
export interface Product {
    id: string;
    name: string;
    sku: string;
    price: number;
    cost: number;
    unit: string;
    stock: number;
    imageUrl: string | null;
    displayPrice: number;
    isExpired: boolean;
    hasWholesalePrice: boolean;
    saleUnit?: string | null;
    saleRatio?: number | null;
    priceTiers?: { minQuantity: number; price: number }[];
}

// Cart item type
export interface CartItem {
    product: Product;
    quantity: number;
}

// Promotion types
export interface PromotionTier {
    minQuantity: number;
    price: number;
}

export interface PromotionProduct {
    productId: string;
    productName: string;
    originalPrice: number;
    tiers: PromotionTier[];
}

export interface Promotion {
    id: string;
    name: string;
    description: string | null;
    startDate: Date;
    endDate: Date;
    products: PromotionProduct[];
}

// Customer type
export type CustomerType = "retail" | "wholesale" | null;

// Customer info
export interface Customer {
    id: string;
    name: string;
    phone?: string | null;
}

// Pending order type
export interface PendingOrder {
    id: string;
    code: string;
    total: number;
    status: string;
    createdAt: Date;
    itemCount: number;
}

// Order form data
export interface OrderFormData {
    recipientName: string;
    recipientPhone: string;
    deliveryAddress: string;
    deliveryMethod: "PICKUP" | "DELIVERY";
    orderNote: string;
    selectedDistrict: string;
    isOutsideHCMC: boolean;
    paymentMethod: "COD" | "QR" | "CREDIT";
}

// Order result type
export interface OrderResult {
    success: boolean;
    orderCode?: string;
    total?: number;
    error?: string;
    paymentMethod?: string;
}

// Bank info type
export interface BankInfo {
    bankName: string;
    bankAccount: string;
    bankOwner: string;
}

// Utility function
export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('vi-VN').format(value);
};
