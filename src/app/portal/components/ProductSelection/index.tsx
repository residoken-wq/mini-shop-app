"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Product, CartItem, CustomerType, Customer, Promotion, PendingOrder } from "../../types";
import { CustomerInfoBanner } from "./CustomerInfoBanner";
import { PromotionBanner } from "./PromotionBanner";
import { PendingOrdersSection } from "./PendingOrdersSection";
import { ProductCard } from "./ProductCard";
import { BottomCartBar } from "./BottomCartBar";
import { getPortalProducts, getCustomerPendingOrders } from "../../actions";

interface ProductSelectionProps {
    customerType: CustomerType;
    customer: Customer | null;
    cart: CartItem[];
    promotions: Promotion[];
    hasExpiredItems: boolean;
    onBack: () => void;
    onConfirm: () => void;
    onAddToCart: (product: Product) => void;
    onUpdateQuantity: (productId: string, delta: number) => void;
    onSetQuantity: (productId: string, qty: number) => void;
    onRemoveFromCart: (productId: string) => void;
    onUpdateCartProducts: (freshProducts: Product[]) => void;
    getPromotionPrice: (productId: string, quantity: number) => number | null;
    getProductTotal: () => number;
}

export function ProductSelection({
    customerType,
    customer,
    cart,
    promotions,
    hasExpiredItems,
    onBack,
    onConfirm,
    onAddToCart,
    onUpdateQuantity,
    onSetQuantity,
    onRemoveFromCart,
    onUpdateCartProducts,
    getPromotionPrice,
    getProductTotal,
}: ProductSelectionProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);

    // Load products
    const loadProducts = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getPortalProducts(customer?.id);
            setProducts(data);
            // Sync cart items with fresh product data (for wholesale prices)
            onUpdateCartProducts(data);
        } finally {
            setIsLoading(false);
        }
    }, [customer?.id, onUpdateCartProducts]);

    // Load products on mount
    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    // Load pending orders for wholesale customers
    useEffect(() => {
        if (customerType === "wholesale" && customer) {
            getCustomerPendingOrders(customer.id).then((orders) => {
                setPendingOrders(orders as PendingOrder[]);
            });
        }
    }, [customerType, customer]);

    // Filter products: only show products with stock > 0
    const filteredProducts = products
        .filter((p) => p.stock > 0) // Only show products with positive stock
        .filter((p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.stock - b.stock); // Sort by stock ascending

    // Separate products: in cart first, then others
    const productsInCart = filteredProducts.filter((p) =>
        cart.some((item) => item.product.id === p.id)
    );
    const productsNotInCart = filteredProducts.filter((p) =>
        !cart.some((item) => item.product.id === p.id)
    );
    const sortedProducts = [...productsInCart, ...productsNotInCart];

    return (
        <div className="space-y-4">
            {/* Customer Info Banner */}
            <CustomerInfoBanner
                customerType={customerType}
                customer={customer}
                onBack={onBack}
            />

            {/* Promotion Banner */}
            <PromotionBanner promotions={promotions} />

            {/* Pending Orders Section (for wholesale) */}
            <PendingOrdersSection pendingOrders={pendingOrders} />

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                    type="text"
                    placeholder="Tìm sản phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Products Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            ) : (
                <div className="grid gap-3">
                    {sortedProducts.map((product) => {
                        const cartItem = cart.find((item) => item.product.id === product.id);
                        const ratio = product.saleUnit ? (product.saleRatio || 1) : 1;
                        const baseQty = (cartItem?.quantity || 1) * ratio;
                        const promoPrice = getPromotionPrice(product.id, baseQty);

                        return (
                            <ProductCard
                                key={product.id}
                                product={product}
                                cartItem={cartItem}
                                promotionPrice={promoPrice}
                                customerType={customerType}
                                onAdd={() => onAddToCart(product)}
                                onUpdateQuantity={(delta) => onUpdateQuantity(product.id, delta)}
                                onSetQuantity={(qty) => onSetQuantity(product.id, qty)}
                                onRemove={() => onRemoveFromCart(product.id)}
                            />
                        );
                    })}
                </div>
            )}

            {/* Bottom Cart Bar */}
            <BottomCartBar
                cart={cart}
                total={getProductTotal()}
                hasExpiredItems={hasExpiredItems}
                onConfirm={onConfirm}
            />
        </div>
    );
}
