"use client";

import { useState, useCallback } from "react";
import { CartItem, Product, Promotion, PromotionProduct } from "../types";

interface UseCartProps {
    promotions: Promotion[];
}

interface UseCartReturn {
    cart: CartItem[];
    addToCart: (product: Product) => void;
    updateQuantity: (productId: string, delta: number) => void;
    setQuantity: (productId: string, qty: number) => void;
    removeFromCart: (productId: string) => void;
    clearCart: () => void;
    getProductTotal: () => number;
    getProductTotalWithPromo: () => number;
    getFinalTotal: (shippingFee: number) => number;
    getCartItemPrice: (productId: string, quantity: number, displayPrice: number) => number;
    getPromotionPrice: (productId: string, quantity: number) => number | null;
    getActivePromotionForProduct: (productId: string) => { promo: Promotion; promoProduct: PromotionProduct } | null;
    hasExpiredItems: boolean;
}

export function useCart({ promotions }: UseCartProps): UseCartReturn {
    const [cart, setCart] = useState<CartItem[]>([]);

    // Get promotion info for a product (if any)
    const getActivePromotionForProduct = useCallback((productId: string) => {
        for (const promo of promotions) {
            const promoProduct = promo.products.find((p: PromotionProduct) => p.productId === productId);
            if (promoProduct && promoProduct.tiers.length > 0) {
                return { promo, promoProduct };
            }
        }
        return null;
    }, [promotions]);

    // Get the promotion price based on quantity
    const getPromotionPrice = useCallback((productId: string, quantity: number): number | null => {
        const promoInfo = getActivePromotionForProduct(productId);
        if (!promoInfo) return null;

        const { promoProduct } = promoInfo;
        // Find the best tier for this quantity (highest minQuantity that we meet)
        const applicableTiers = promoProduct.tiers.filter((t) => quantity >= t.minQuantity);
        if (applicableTiers.length === 0) return null;

        // Get the tier with highest minQuantity (best price)
        const bestTier = applicableTiers.reduce((best, tier) =>
            tier.minQuantity > best.minQuantity ? tier : best
        );
        return bestTier.price;
    }, [getActivePromotionForProduct]);

    // Get the effective price for a cart item (promotion price or displayPrice)
    const getCartItemPrice = useCallback((productId: string, quantity: number, displayPrice: number): number => {
        const promoPrice = getPromotionPrice(productId, quantity);
        return promoPrice !== null ? promoPrice : displayPrice;
    }, [getPromotionPrice]);

    const addToCart = useCallback((product: Product) => {
        setCart(prevCart => {
            const existing = prevCart.find((item) => item.product.id === product.id);
            if (existing) {
                return prevCart.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prevCart, { product, quantity: 1 }];
        });
    }, []);

    const updateQuantity = useCallback((productId: string, delta: number) => {
        setCart(prevCart => prevCart.map((item) => {
            if (item.product.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    }, []);

    const setQuantity = useCallback((productId: string, qty: number) => {
        if (qty <= 0) {
            setCart(prevCart => prevCart.filter((item) => item.product.id !== productId));
        } else {
            setCart(prevCart => prevCart.map((item) => {
                if (item.product.id === productId) {
                    return { ...item, quantity: qty };
                }
                return item;
            }));
        }
    }, []);

    const removeFromCart = useCallback((productId: string) => {
        setCart(prevCart => prevCart.filter((item) => item.product.id !== productId));
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
    }, []);

    const getProductTotal = useCallback(() => {
        return cart.reduce((sum, item) => sum + (item.product.displayPrice * item.quantity), 0);
    }, [cart]);

    // Calculate cart total with promotion prices
    const getProductTotalWithPromo = useCallback(() => {
        return cart.reduce((sum, item) => {
            const price = getCartItemPrice(item.product.id, item.quantity, item.product.displayPrice);
            return sum + (price * item.quantity);
        }, 0);
    }, [cart, getCartItemPrice]);

    const getFinalTotal = useCallback((shippingFee: number) => {
        return getProductTotalWithPromo() + shippingFee;
    }, [getProductTotalWithPromo]);

    const hasExpiredItems = cart.some((item) => item.product.isExpired);

    return {
        cart,
        addToCart,
        updateQuantity,
        setQuantity,
        removeFromCart,
        clearCart,
        getProductTotal,
        getProductTotalWithPromo,
        getFinalTotal,
        getCartItemPrice,
        getPromotionPrice,
        getActivePromotionForProduct,
        hasExpiredItems,
    };
}
