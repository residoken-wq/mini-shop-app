"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Product, Customer } from "@prisma/client";
import { createOrder, createCustomer } from "../actions";
import { getMarketPrices } from "../../products/actions";
import { MarketProduct } from "@/lib/market-scraper";

export type CartItem = {
    product: Product;
    quantity: number;
    customPrice?: number;
};

interface UseSalesProps {
    initialProducts: Product[];
    initialCustomers: Customer[];
}

export function useSales({ initialProducts, initialCustomers }: UseSalesProps) {
    // --- STATE ---
    const [products, setProducts] = useState(initialProducts);
    const [customers, setCustomers] = useState(initialCustomers);
    const [searchQuery, setSearchQuery] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
    const [amountPaid, setAmountPaid] = useState("");
    const [marketPrices, setMarketPrices] = useState<MarketProduct[]>([]);
    const [isLoadingMarket, setIsLoadingMarket] = useState(false);
    const [pendingItem, setPendingItem] = useState<CartItem | null>(null);
    const [isWalkIn, setIsWalkIn] = useState(false);
    const [newCustomerOpen, setNewCustomerOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");
    const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");

    // --- EFFECTS ---
    useEffect(() => {
        const fetchMarket = async () => {
            setIsLoadingMarket(true);
            try {
                const prices = await getMarketPrices();
                setMarketPrices(prices);
            } catch (e) {
                console.error("Failed to fetch market prices", e);
            }
            setIsLoadingMarket(false);
        };
        fetchMarket();
    }, []);

    // --- MEMOIZED VALUES ---
    const filteredProducts = useMemo(() => {
        if (!searchQuery) return products;
        const lower = searchQuery.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(lower) ||
            p.sku.toLowerCase().includes(lower)
        );
    }, [products, searchQuery]);

    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return customers;
        const lower = customerSearch.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(lower) ||
            (c.phone && c.phone.includes(lower))
        );
    }, [customers, customerSearch]);

    const cartTotal = useMemo(() => {
        return cart.reduce((sum, item) => {
            const price = item.customPrice !== undefined ? item.customPrice : item.product.price;
            return sum + (price * item.quantity);
        }, 0);
    }, [cart]);

    // --- HANDLERS ---
    const addToCart = useCallback((product: Product, quantity = 1, customPrice?: number) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? {
                            ...item,
                            quantity: item.quantity + quantity,
                            customPrice: customPrice !== undefined ? customPrice : item.customPrice
                        }
                        : item
                );
            }
            return [...prev, { product, quantity, customPrice }];
        });
        setPendingItem(null);
    }, []);

    const removeFromCart = useCallback((productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    }, []);

    const updateQuantity = useCallback((productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    }, []);

    const updateCartItemPrice = useCallback((productId: string, newPrice: number) => {
        setCart(prev => prev.map(item =>
            item.product.id === productId ? { ...item, customPrice: newPrice } : item
        ));
    }, []);

    const handleCheckout = useCallback(async (isFullPayment: boolean = false) => {
        if (cart.length === 0) return;
        setIsCheckoutLoading(true);

        const paid = isFullPayment ? cartTotal : (amountPaid ? parseFloat(amountPaid) : 0);

        const result = await createOrder({
            customerId: isWalkIn ? undefined : selectedCustomer?.id,
            items: cart.map(item => ({
                productId: item.product.id,
                quantity: item.quantity,
                price: item.customPrice !== undefined ? item.customPrice : item.product.price
            })),
            total: cartTotal,
            paid: paid,
            paymentMethod: "CASH"
        });

        setIsCheckoutLoading(false);

        if (result.success) {
            setCart([]);
            setSelectedCustomer(null);
            setIsWalkIn(false);
            setAmountPaid("");
            alert("Đơn hàng đã được tạo thành công!");
        } else {
            alert("Lỗi khi tạo đơn hàng: " + result.error);
        }
    }, [cart, cartTotal, amountPaid, isWalkIn, selectedCustomer]);

    const handleCreateCustomer = useCallback(async () => {
        const res = await createCustomer({ name: newCustomerName, phone: newCustomerPhone });
        if (res.success && res.customer) {
            setCustomers(prev => [...prev, res.customer!]);
            setSelectedCustomer(res.customer);
            setNewCustomerOpen(false);
            setNewCustomerName("");
            setNewCustomerPhone("");
        } else {
            alert("Lỗi tạo khách hàng");
        }
    }, [newCustomerName, newCustomerPhone]);

    const handleVoiceCommand = useCallback((transcript: string) => {
        setSearchQuery(transcript);
        const lowerTranscript = transcript.toLowerCase();

        // COMMAND: "Tiếp" or "Thêm" -> Confirm Pending Item
        if ((lowerTranscript.includes("tiếp") || lowerTranscript.includes("thêm")) && pendingItem) {
            addToCart(pendingItem.product, pendingItem.quantity, pendingItem.customPrice);
            setSearchQuery("");
            return;
        }

        // FIND PRODUCT
        const sortedProducts = [...products].sort((a, b) => b.name.length - a.name.length);
        const matchedProduct = sortedProducts.find(p => lowerTranscript.includes(p.name.toLowerCase()));

        if (matchedProduct) {
            let remaining = lowerTranscript.replace(matchedProduct.name.toLowerCase(), "").trim();
            remaining = remaining.replace(/\s+/g, ' ');
            remaining = remaining.replace(/(\d+)\s*k\b/g, "$1000");
            remaining = remaining.replace(/\bnửa\b/g, "0.5");

            const tokens = remaining.split(' ');
            const foundNumbers: number[] = [];

            for (const token of tokens) {
                const cleanToken = token.replace(/[^\d.,]/g, "");
                if (!cleanToken) continue;

                if (cleanToken.includes(".") || cleanToken.includes(",")) {
                    if (/^\d{1,3}[.,]\d{3}$/.test(cleanToken)) {
                        foundNumbers.push(parseFloat(cleanToken.replace(/[.,]/g, "")));
                    } else {
                        foundNumbers.push(parseFloat(cleanToken.replace(",", ".")));
                    }
                } else {
                    foundNumbers.push(parseFloat(cleanToken));
                }
            }

            let quantity = 1;
            let price = undefined;

            if (foundNumbers.length > 0) {
                quantity = foundNumbers[0];
                if (foundNumbers.length > 1) {
                    let rawPrice = foundNumbers[1];
                    if (rawPrice < 1000) rawPrice *= 1000;
                    price = rawPrice;
                }
            }

            setPendingItem({
                product: matchedProduct,
                quantity: quantity,
                customPrice: price
            });
        }
    }, [products, pendingItem, addToCart]);

    const handlePendingKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter" && pendingItem) {
            addToCart(pendingItem.product, pendingItem.quantity, pendingItem.customPrice);
        }
    }, [pendingItem, addToCart]);

    const resetSale = useCallback(() => {
        setCart([]);
        setSelectedCustomer(null);
        setIsWalkIn(false);
        setAmountPaid("");
        setPendingItem(null);
        setSearchQuery("");
    }, []);

    const changeCustomer = useCallback(() => {
        if (cart.length > 0) {
            if (!confirm("Thay đổi khách hàng sẽ xóa giỏ hàng. Tiếp tục?")) return;
        }
        setSelectedCustomer(null);
        setIsWalkIn(false);
        setCart([]);
    }, [cart.length]);

    // Focus ref callback
    const searchInputRef = useCallback((node: HTMLInputElement | null) => {
        if (node) {
            node.focus();
        }
    }, []);

    return {
        // State
        products,
        customers,
        searchQuery,
        setSearchQuery,
        cart,
        setCart,
        selectedCustomer,
        setSelectedCustomer,
        customerSearch,
        setCustomerSearch,
        isCheckoutLoading,
        amountPaid,
        setAmountPaid,
        marketPrices,
        isLoadingMarket,
        pendingItem,
        setPendingItem,
        isWalkIn,
        setIsWalkIn,
        newCustomerOpen,
        setNewCustomerOpen,
        newCustomerName,
        setNewCustomerName,
        newCustomerPhone,
        setNewCustomerPhone,
        mobileTab,
        setMobileTab,

        // Computed
        filteredProducts,
        filteredCustomers,
        cartTotal,

        // Handlers
        addToCart,
        removeFromCart,
        updateQuantity,
        updateCartItemPrice,
        handleCheckout,
        handleCreateCustomer,
        handleVoiceCommand,
        handlePendingKeyDown,
        resetSale,
        changeCustomer,
        searchInputRef,
    };
}
