"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Product, Customer } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VoiceInput } from "@/components/voice-input";
import { createOrder, createCustomer } from "./actions";
import { getMarketPrices } from "../products/actions";
import { MarketProduct } from "@/lib/market-scraper";
import { Search, Plus, Trash2, UserPlus, ShoppingCart, Loader2, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface SalesInterfaceProps {
    initialProducts: Product[];
    initialCustomers: Customer[];
}

type CartItem = {
    product: Product;
    quantity: number;
    customPrice?: number; // Allow overriding price
};

export function SalesInterface({ initialProducts, initialCustomers }: SalesInterfaceProps) {
    const [products, setProducts] = useState(initialProducts);
    const [customers, setCustomers] = useState(initialCustomers);
    const [searchQuery, setSearchQuery] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
    const [amountPaid, setAmountPaid] = useState("");

    // Market Prices State
    const [marketPrices, setMarketPrices] = useState<MarketProduct[]>([]);
    const [isLoadingMarket, setIsLoadingMarket] = useState(false);

    const [pendingItem, setPendingItem] = useState<CartItem | null>(null);
    const [isWalkIn, setIsWalkIn] = useState(false);

    // Customer Create State
    const [newCustomerOpen, setNewCustomerOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");

    // Fetch Market Prices on Load
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

    const addToCart = (product: Product, quantity = 1, customPrice?: number) => {
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
        setPendingItem(null); // Clear pending
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const cartTotal = cart.reduce((sum, item) => {
        const price = item.customPrice !== undefined ? item.customPrice : item.product.price;
        return sum + (price * item.quantity);
    }, 0);

    const handleCheckout = async (isFullPayment: boolean = false) => {
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
            paymentMethod: "CASH" // Default for now
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
    };

    const handleCreateCustomer = async () => {
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
    };

    // --- VOICE LOGIC ---
    const handleVoiceCommand = (transcript: string) => {
        setSearchQuery(transcript);
        const lowerTranscript = transcript.toLowerCase();

        // COMMAND: "Tiếp" or "Thêm" -> Confirm Pending Item
        if ((lowerTranscript.includes("tiếp") || lowerTranscript.includes("thêm")) && pendingItem) {
            addToCart(pendingItem.product, pendingItem.quantity, pendingItem.customPrice);
            setSearchQuery("");
            return; // EXIT
        }

        // FIND PRODUCT
        // Sort products by name length descending to match "Cà chua bi" before "Cà chua"
        const sortedProducts = [...products].sort((a, b) => b.name.length - a.name.length);
        const matchedProduct = sortedProducts.find(p => lowerTranscript.includes(p.name.toLowerCase()));

        if (matchedProduct) {
            // Remove product name from string to parse numbers
            // Replace "k" with "000" for easier parsing of "5k" "20k"
            // Remove "." and "," to handle "20.000" or "20,000" correctly as raw numbers if they are separators
            // BUT: We need to be careful about decimal quantities like "0.5 kg" vs "20.000 d"

            // Strategy: 
            // 1. Sanitize text: "20k" -> "20000", " nửa " -> " 0.5 "
            let remaining = lowerTranscript.replace(matchedProduct.name.toLowerCase(), "").trim();
            remaining = remaining.replace(/\s+/g, ' '); // Normalize spaces
            remaining = remaining.replace(/(\d+)\s*k\b/g, "$1000"); // "20k" -> "20000"
            remaining = remaining.replace(/\bnửa\b/g, "0.5"); // "nửa" -> "0.5"

            // 2. Extract numbers. We look for patterns.
            // Case A: "0.5" (decimal)
            // Case B: "20.000" (thousands separator)
            // Case C: "20000" (plain)

            // In Vietnamese context for this app:
            // "0.5" or "0,5" usually Quantity.
            // "20.000" or "20,000" usually Price.

            // Let's split by space and process tokens to find numbers
            const tokens = remaining.split(' ');
            const foundNumbers: number[] = [];

            for (const token of tokens) {
                // Remove non-numeric chars except dot and comma
                const cleanToken = token.replace(/[^\d.,]/g, "");
                if (!cleanToken) continue;

                // Check for "thousands" format (e.g., 20.000 or 20,000 where it results in a large number)
                // If token has "." or "," and length > 3, it might be a price
                if (cleanToken.includes(".") || cleanToken.includes(",")) {
                    // Try parsing as standard float (US) -> 20.000 = 20
                    // Try parsing as VI -> 20.000 = 20000

                    // Specific heuristic: If three digits follow a dot/comma, treat as thousands separator?
                    // "20.000" -> 20000
                    // "0.5" -> 0.5

                    if (/^\d{1,3}[.,]\d{3}$/.test(cleanToken)) {
                        // Likely 20.000 -> 20000
                        foundNumbers.push(parseFloat(cleanToken.replace(/[.,]/g, "")));
                    } else {
                        // Likely 0.5 or 1.5 -> Standard float (replace comma with dot for JS)
                        foundNumbers.push(parseFloat(cleanToken.replace(",", ".")));
                    }
                } else {
                    // Plain integer
                    foundNumbers.push(parseFloat(cleanToken));
                }
            }

            let quantity = 1;
            let price = undefined;

            if (foundNumbers.length > 0) {
                quantity = foundNumbers[0];

                // Heuristic: If Quantity is super huge (>1000), maybe they said Price first? 
                // Unlikely given usage "Cà chua 5kg 20k". 
                // But if they say "Cà chua 20k 5kg" -> logic fails. 
                // Let's stick to Order: Qty then Price.

                if (foundNumbers.length > 1) {
                    let rawPrice = foundNumbers[1];

                    // Auto-correct "short" prices: "20" -> "20000"
                    if (rawPrice < 1000) rawPrice *= 1000;

                    price = rawPrice;
                }
            }

            // STAGING MODE: Set Pending Item instead of adding directly
            setPendingItem({
                product: matchedProduct,
                quantity: quantity,
                customPrice: price
            });
        }
    };

    // Mobile Tab State
    const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");

    // Focus Management
    const searchInputRef = useCallback((node: HTMLInputElement | null) => {
        if (node) {
            node.focus();
        }
    }, []); // Auto-focus on mount/render if provided

    // Ensure focus returns to search after adding
    useEffect(() => {
        if (!pendingItem && !newCustomerOpen && !selectedCustomer) {
            // Maybe focus logic custom
        }
    }, [pendingItem, newCustomerOpen, selectedCustomer]);

    // NEW: Function to handle Enter key in Pending Inputs
    const handlePendingKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && pendingItem) {
            addToCart(pendingItem.product, pendingItem.quantity, pendingItem.customPrice);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] gap-4">
            {/* NEW: Global Voice/Search Input (Always Visible) */}


            {/* NEW: Global Voice/Search Input (Always Visible) */}
            <div className="flex gap-2 shrink-0 flex-col">
                <div className="flex gap-2">
                    <VoiceInput
                        ref={searchInputRef}
                        placeholder="Nhập tên sản phẩm để tìm..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onTranscript={(val) => { setSearchQuery(val); }}
                        className="flex-1"
                    />
                </div>

                {/* PENDING ITEM CARD (Global Scope) */}
                {pendingItem && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex flex-col sm:flex-row gap-4 items-center animate-in slide-in-from-top-2">
                        <div className="bg-white p-2 rounded border shrink-0 hidden sm:block">
                            <span className="text-2xl font-bold text-primary">?</span>
                        </div>
                        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <p className="text-xs text-muted-foreground hidden sm:block">Sản phẩm</p>
                                <p className="font-bold text-lg text-primary truncate">{pendingItem.product.name}</p>
                                <p className="text-xs text-muted-foreground">Kho: {pendingItem.product.stock} {pendingItem.product.unit}</p>
                            </div>
                            <div className="flex flex-row sm:flex-col gap-2 sm:gap-1 justify-between">
                                <div className="flex items-center gap-2 sm:justify-between text-sm">
                                    <span>SL:</span>
                                    <input
                                        type="number"
                                        className="w-16 border rounded px-1 text-right font-bold h-8"
                                        value={pendingItem.quantity}
                                        onChange={(e) => setPendingItem({ ...pendingItem, quantity: parseFloat(e.target.value) || 0 })}
                                        onKeyDown={handlePendingKeyDown}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex items-center gap-2 sm:justify-between text-sm">
                                    <span>Giá:</span>
                                    <input
                                        type="number"
                                        className="w-24 sm:w-20 border rounded px-1 text-right text-blue-600 font-bold h-8"
                                        value={pendingItem.customPrice || pendingItem.product.price}
                                        onChange={(e) => setPendingItem({ ...pendingItem, customPrice: parseFloat(e.target.value) || 0 })}
                                        onKeyDown={handlePendingKeyDown}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-row sm:flex-col gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                            <Button size="sm" className="flex-1" onClick={() => addToCart(pendingItem.product, pendingItem.quantity, pendingItem.customPrice)}>
                                Thêm (Tiếp)
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500 h-8 sm:h-6 flex-1 sm:flex-initial" onClick={() => setPendingItem(null)}>
                                Hủy
                            </Button>
                        </div>
                    </div>
                )}
                {/* Market Hint for Pending Item */}
                {pendingItem && marketPrices.find(mp => mp.name.toLowerCase() === pendingItem.product.name.toLowerCase()) && (
                    <div className="text-xs text-muted-foreground flex justify-between px-2">
                        <span>Giá chợ tham khảo: <span className="font-bold text-orange-600">{new Intl.NumberFormat('vi-VN').format(marketPrices.find(mp => mp.name.toLowerCase() === pendingItem.product.name.toLowerCase())!.price)}</span></span>
                    </div>
                )}
            </div>

            {/* Mobile Tab Switcher */}
            <div className="grid grid-cols-2 gap-2 lg:hidden shrink-0">
                <Button
                    variant={mobileTab === "products" ? "default" : "outline"}
                    onClick={() => setMobileTab("products")}
                >
                    <Search className="mr-2 h-4 w-4" />
                    Sản phẩm
                </Button>
                <Button
                    variant={mobileTab === "cart" ? "default" : "outline"}
                    onClick={() => setMobileTab("cart")}
                    className="relative"
                >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Giỏ hàng
                    {cart.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {cart.reduce((sum, item) => sum + item.quantity, 0)}
                        </span>
                    )}
                </Button>
            </div>

            <div className={cn(
                "flex-1 flex flex-col gap-4 overflow-hidden",
                mobileTab === "cart" ? "hidden lg:flex" : "flex"
            )}>


                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 overflow-y-auto pb-20 p-1">
                    {filteredProducts.map(product => {
                        // Find market price
                        const marketP = marketPrices.find(mp => mp.name.toLowerCase() === product.name.toLowerCase());

                        return (
                            <Card key={product.id} className="cursor-pointer hover:border-primary transition-colors flex flex-col justify-between" onClick={() => {
                                addToCart(product);
                                // Optional: Feedback toast
                            }}>
                                <CardHeader className="p-4">
                                    <CardTitle className="text-sm font-medium line-clamp-2">{product.name}</CardTitle>
                                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                                </CardHeader>
                                <CardFooter className="p-4 pt-0 flex flex-col items-start gap-1">
                                    <div className="flex justify-between w-full items-center">
                                        <span className="font-bold text-primary">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                                        </span>
                                        <span className={cn("text-xs px-2 py-1 rounded-full", product.stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                            Kho: {product.stock}
                                        </span>
                                    </div>
                                    {marketP && (
                                        <div className="text-[10px] text-muted-foreground w-full flex justify-between pt-1 border-t mt-1">
                                            <span>Giá chợ:</span>
                                            <span className={marketP.price < product.price ? "text-green-600 font-medium" : "text-orange-600"}>
                                                {new Intl.NumberFormat('vi-VN').format(marketP.price)}
                                            </span>
                                        </div>
                                    )}
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Right: Cart & Checkout */}
            <div className={cn(
                "w-full lg:w-[400px] flex flex-col gap-4 bg-card border rounded-lg shadow-sm h-full overflow-hidden",
                mobileTab === "products" ? "hidden lg:flex" : "flex"
            )}>
                {/* Current Customer Display (Step 2) */}
                <div className="p-4 border-b shrink-0 bg-secondary/20">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <UserPlus className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold truncate text-sm">
                                    {isWalkIn ? "Khách lẻ (Vãng lai)" : selectedCustomer?.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {isWalkIn ? "Không lưu nợ" : selectedCustomer?.phone || "Không có SĐT"}
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-foreground" onClick={() => {
                            if (cart.length > 0 && !confirm("Thay đổi khách hàng sẽ xóa giỏ hàng hiện tại. Tiếp tục?")) return;
                            setSelectedCustomer(null);
                            setIsWalkIn(false);
                            setCart([]);
                        }}>
                            Đổi khách
                        </Button>
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-0">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <ShoppingCart className="h-12 w-12 mb-2" />
                            <p>Giỏ hàng trống</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[30%]">Tên SP</TableHead>
                                    <TableHead className="w-[20%] text-center">SL</TableHead>
                                    <TableHead className="w-[25%] text-right">Đơn giá</TableHead>
                                    <TableHead className="w-[25%] text-right">Thành tiền</TableHead>
                                    <TableHead className="w-[20px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cart.map(item => {
                                    const activePrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
                                    const total = activePrice * item.quantity;

                                    return (
                                        <TableRow key={item.product.id}>
                                            <TableCell className="font-medium align-top py-2">
                                                <div className="line-clamp-2">{item.product.name}</div>
                                                <div className="text-xs text-muted-foreground">{item.product.unit}</div>
                                            </TableCell>
                                            <TableCell className="p-1 align-top">
                                                <Input
                                                    type="number"
                                                    className="w-full h-8 px-1 text-center"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        setCart(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: isNaN(val) ? 0 : val } : i));
                                                    }}
                                                    onFocus={(e) => e.target.select()}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1 align-top text-right">
                                                <Input
                                                    type="text"
                                                    className="w-full h-8 px-1 text-right"
                                                    value={new Intl.NumberFormat('vi-VN').format(activePrice)}
                                                    onChange={(e) => {
                                                        // Remove non-digits
                                                        const raw = e.target.value.replace(/\D/g, "");
                                                        const val = raw ? parseFloat(raw) : 0;

                                                        setCart(prev => prev.map(i => i.product.id === item.product.id ? { ...i, customPrice: val } : i));
                                                    }}
                                                    onFocus={(e) => e.target.select()}
                                                />
                                                {item.customPrice !== undefined && item.customPrice !== item.product.price && (
                                                    <div className="text-[10px] text-muted-foreground line-through decoration-red-500 mt-1">
                                                        {new Intl.NumberFormat('vi-VN').format(item.product.price)}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-bold py-2 align-top">
                                                {new Intl.NumberFormat('vi-VN').format(total)}
                                            </TableCell>
                                            <TableCell className="p-1 align-top">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* Totals & Checkout */}
                <div className="p-4 border-t bg-muted/20 space-y-4 shrink-0">
                    <div className="flex justify-between items-center text-lg font-bold">
                        <span>Tổng tiền:</span>
                        <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cartTotal)}</span>
                    </div>

                    <div className="grid gap-2">
                        <Label>Khách thanh toán:</Label>
                        <div className="flex gap-2">
                            <VoiceInput
                                placeholder="Nhập số tiền..."
                                value={amountPaid}
                                onChange={(e) => setAmountPaid(e.target.value)}
                                onTranscript={(val) => setAmountPaid(val.replace(/\D/g, ''))}
                            />
                            <Button variant="outline" onClick={() => setAmountPaid(cartTotal.toString())}>Đủ</Button>
                        </div>
                        {amountPaid && (
                            <div className="flex justify-between text-sm">
                                <span>Tiền thừa/Nợ:</span>
                                <span className={parseFloat(amountPaid) < cartTotal ? "text-red-500" : "text-green-500"}>
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(parseFloat(amountPaid) - cartTotal)}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => {
                            if (confirm("Bạn có chắc muốn hủy đơn hàng này?")) {
                                setCart([]);
                                setSelectedCustomer(null);
                                setIsWalkIn(false);
                                setAmountPaid("");
                            }
                        }}>
                            Hủy
                        </Button>
                        <Button variant="secondary" onClick={() => handleCheckout(false)} disabled={cart.length === 0 || isCheckoutLoading}>
                            {isCheckoutLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Lưu
                        </Button>
                        <Button onClick={() => handleCheckout(true)} disabled={cart.length === 0 || isCheckoutLoading}>
                            {isCheckoutLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Lưu & TT
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
