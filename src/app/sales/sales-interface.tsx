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
        // 1. Update search query to show feedback
        setSearchQuery(transcript);

        const lowerTranscript = transcript.toLowerCase();

        // 2. Find best matching product (Longest substring match)
        // Sort products by name length descending to match "Cà chua bi" before "Cà chua"
        const sortedProducts = [...products].sort((a, b) => b.name.length - a.name.length);

        const matchedProduct = sortedProducts.find(p => lowerTranscript.includes(p.name.toLowerCase()));

        if (matchedProduct) {
            // 3. Extract logic: [Product Name] [Quantity] [Price/Unit]
            // Remove product name from string
            const remaining = lowerTranscript.replace(matchedProduct.name.toLowerCase(), "").trim();

            // Extract numbers
            const numbers = remaining.match(/\d+(\.\d+)?/g);

            let quantity = 1;
            let price = undefined;

            if (numbers && numbers.length > 0) {
                quantity = parseFloat(numbers[0]);

                if (numbers.length > 1) {
                    // Normalize price: 20k -> 20000, 20 nghìn -> 20000
                    let rawPrice = parseFloat(numbers[1]);
                    if (rawPrice < 1000) rawPrice *= 1000; // Assume shorthand (20 => 20000)
                    price = rawPrice;
                }
            }

            addToCart(matchedProduct, quantity, price);

            // Clear search after short delay
            setTimeout(() => setSearchQuery(""), 1500);
        }
    };

    // Mobile Tab State
    const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] gap-4">
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

            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden gap-4">
                {/* Left: Product List */}
                <div className={cn(
                    "flex-1 flex flex-col gap-4 overflow-hidden",
                    mobileTab === "cart" ? "hidden lg:flex" : "flex"
                )}>
                    <div className="flex gap-2 shrink-0">
                        <VoiceInput
                            placeholder="Nói tên SP + số lượng (VD: Cà chua 5 ký 20 nghìn)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onTranscript={handleVoiceCommand}
                            className="flex-1"
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-20">
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
                    {/* Customer Selection */}
                    <div className="p-4 border-b space-y-2 shrink-0">
                        {!selectedCustomer && !isWalkIn ? (
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Tìm khách hàng..."
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                    className="flex-1"
                                />
                                <Button variant="secondary" onClick={() => setIsWalkIn(true)}>
                                    Khách lẻ
                                </Button>
                                <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="icon" variant="outline"><UserPlus className="h-4 w-4" /></Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Thêm khách hàng mới</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="name" className="text-right">Tên</Label>
                                                <Input id="name" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} className="col-span-3" />
                                            </div>
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="phone" className="text-right">SĐT</Label>
                                                <Input id="phone" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} className="col-span-3" />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleCreateCustomer}>Lưu khách hàng</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center bg-secondary/50 p-2 rounded-md">
                                <div>
                                    <p className="font-medium">{isWalkIn ? "Khách lẻ (Vãng lai)" : selectedCustomer?.name}</p>
                                    <p className="text-xs text-muted-foreground">{isWalkIn ? "Không lưu nợ" : selectedCustomer?.phone}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedCustomer(null); setIsWalkIn(false); }}>x</Button>
                            </div>
                        )}

                        {/* Customer Dropdown Suggestions */}
                        {!selectedCustomer && !isWalkIn && customerSearch && (
                            <div className="absolute z-10 w-[calc(100%-2rem)] max-w-[368px] mt-10 bg-popover border rounded-md shadow-md max-h-[200px] overflow-auto">
                                {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                                    <div
                                        key={c.id}
                                        className="p-2 hover:bg-accent cursor-pointer text-sm"
                                        onClick={() => { setSelectedCustomer(c); setCustomerSearch(""); }}
                                    >
                                        {c.name} {c.phone && `(${c.phone})`}
                                    </div>
                                )) : (
                                    <div className="p-2 text-sm text-muted-foreground">Không tìm thấy khách hàng</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                <ShoppingCart className="h-12 w-12 mb-2" />
                                <p>Giỏ hàng trống</p>
                            </div>
                        ) : (
                            cart.map(item => {
                                const activePrice = item.customPrice !== undefined ? item.customPrice : item.product.price;
                                return (
                                    <div key={item.product.id} className="flex gap-2 items-center">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                {item.customPrice !== undefined && item.customPrice !== item.product.price && (
                                                    <span className="line-through decoration-red-500">
                                                        {new Intl.NumberFormat('vi-VN').format(item.product.price)}
                                                    </span>
                                                )}
                                                <span className={item.customPrice !== undefined ? "font-bold text-blue-600" : ""}>
                                                    {new Intl.NumberFormat('vi-VN').format(activePrice)} ₫
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, -1)}>-</Button>
                                            <span className="w-6 text-center text-sm">{item.quantity}</span>
                                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, 1)}>+</Button>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                );
                            })
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
                                    type="number"
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
        </div>
    );
}
