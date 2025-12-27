"use client";

import { Product, Customer } from "@prisma/client";
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VoiceInput } from "@/components/voice-input";
import { Search, Trash2, UserPlus, ShoppingCart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { CartItem } from "./hooks/use-sales";
import { MarketProduct } from "@/lib/market-scraper";

interface MobileViewProps {
    // State
    searchQuery: string;
    setSearchQuery: (v: string) => void;
    filteredProducts: Product[];
    cart: CartItem[];
    setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
    cartTotal: number;
    selectedCustomer: Customer | null;
    isWalkIn: boolean;
    amountPaid: string;
    setAmountPaid: (v: string) => void;
    isCheckoutLoading: boolean;
    pendingItem: CartItem | null;
    setPendingItem: (v: CartItem | null) => void;
    marketPrices: MarketProduct[];
    mobileTab: "products" | "cart";
    setMobileTab: (v: "products" | "cart") => void;
    searchInputRef: (node: HTMLInputElement | null) => void;

    // Handlers
    addToCart: (product: Product, quantity?: number, customPrice?: number) => void;
    removeFromCart: (productId: string) => void;
    handleCheckout: (isFullPayment?: boolean) => void;
    handleVoiceCommand: (transcript: string) => void;
    handlePendingKeyDown: (e: React.KeyboardEvent) => void;
    changeCustomer: () => void;
    resetSale: () => void;
}

export function MobileView({
    searchQuery,
    setSearchQuery,
    filteredProducts,
    cart,
    setCart,
    cartTotal,
    selectedCustomer,
    isWalkIn,
    amountPaid,
    setAmountPaid,
    isCheckoutLoading,
    pendingItem,
    setPendingItem,
    marketPrices,
    mobileTab,
    setMobileTab,
    searchInputRef,
    addToCart,
    removeFromCart,
    handleCheckout,
    handleVoiceCommand,
    handlePendingKeyDown,
    changeCustomer,
    resetSale,
}: MobileViewProps) {
    return (
        <div className="flex lg:hidden flex-col h-[calc(100vh-4rem)] gap-4">
            {/* Global Search Bar */}
            <div className="flex gap-2 shrink-0 flex-col">
                <VoiceInput
                    ref={searchInputRef}
                    placeholder="Nhập tên sản phẩm để tìm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onTranscript={(val) => {
                        setSearchQuery(val);
                        handleVoiceCommand(val);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleVoiceCommand(searchQuery);
                        }
                    }}
                    className="flex-1"
                />

                {/* Pending Item Card */}
                {pendingItem && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex flex-col gap-4 items-center animate-in slide-in-from-top-2">
                        <div className="flex-1 w-full grid grid-cols-1 gap-2">
                            <div>
                                <p className="font-bold text-lg text-primary truncate">{pendingItem.product.name}</p>
                                <p className="text-xs text-muted-foreground">Kho: {pendingItem.product.stock} {pendingItem.product.unit}</p>
                            </div>
                            <div className="flex flex-row gap-2 justify-between">
                                <div className="flex items-center gap-2 text-sm">
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
                                <div className="flex items-center gap-2 text-sm">
                                    <span>Giá:</span>
                                    <input
                                        type="number"
                                        className="w-24 border rounded px-1 text-right text-blue-600 font-bold h-8"
                                        value={pendingItem.customPrice || pendingItem.product.price}
                                        onChange={(e) => setPendingItem({ ...pendingItem, customPrice: parseFloat(e.target.value) || 0 })}
                                        onKeyDown={handlePendingKeyDown}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-row gap-2 w-full">
                            <Button size="sm" className="flex-1" onClick={() => addToCart(pendingItem.product, pendingItem.quantity, pendingItem.customPrice)}>
                                Thêm (Tiếp)
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500 h-8 flex-1" onClick={() => setPendingItem(null)}>
                                Hủy
                            </Button>
                        </div>
                    </div>
                )}
                {/* Market Hint */}
                {pendingItem && marketPrices.find(mp => mp.name.toLowerCase() === pendingItem.product.name.toLowerCase()) && (
                    <div className="text-xs text-muted-foreground flex justify-between px-2">
                        <span>Giá chợ tham khảo: <span className="font-bold text-orange-600">{new Intl.NumberFormat('vi-VN').format(marketPrices.find(mp => mp.name.toLowerCase() === pendingItem.product.name.toLowerCase())!.price)}</span></span>
                    </div>
                )}
            </div>

            {/* Mobile Tab Switcher */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
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

            {/* Products Tab */}
            <div className={cn("flex-1 overflow-hidden", mobileTab === "cart" ? "hidden" : "flex flex-col")}>
                <div className="grid grid-cols-2 gap-2 overflow-y-auto pb-20 p-1">
                    {filteredProducts.map(product => {
                        const marketP = marketPrices.find(mp => mp.name.toLowerCase() === product.name.toLowerCase());
                        return (
                            <Card key={product.id} className="cursor-pointer hover:border-primary transition-colors flex flex-col justify-between" onClick={() => addToCart(product)}>
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

            {/* Cart Tab */}
            <div className={cn("flex-1 flex flex-col overflow-hidden bg-card border rounded-lg shadow-sm", mobileTab === "products" ? "hidden" : "flex")}>
                {/* Customer Display */}
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
                        <Button variant="outline" size="sm" className="h-8 text-xs shrink-0 border-dashed" onClick={changeCustomer}>
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
                                resetSale();
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
