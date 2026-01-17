"use client";

import { useState, useMemo } from "react";
import { Product, Supplier } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VoiceInput } from "@/components/voice-input";
import { createPurchaseOrder, createSupplier } from "./actions";
import { Plus, Trash2, UserPlus, ShoppingCart, Loader2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface SupplierInterfaceProps {
    initialProducts: Product[];
    initialSuppliers: Supplier[];
}

type CartItem = {
    product: Product;
    quantity: number;
    cost: number; // Purchase price might differ from stored cost
};

export function SupplierInterface({ initialProducts, initialSuppliers }: SupplierInterfaceProps) {
    const [products, setProducts] = useState(initialProducts);
    const [suppliers, setSuppliers] = useState(initialSuppliers);
    const [searchQuery, setSearchQuery] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [supplierSearch, setSupplierSearch] = useState("");
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
    const [amountPaid, setAmountPaid] = useState("");
    const [shippingFee, setShippingFee] = useState(0);

    // Supplier Create State
    const [newSupplierOpen, setNewSupplierOpen] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState("");
    const [newSupplierPhone, setNewSupplierPhone] = useState("");

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return products;
        const lower = searchQuery.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(lower) ||
            p.sku.toLowerCase().includes(lower)
        );
    }, [products, searchQuery]);

    const filteredSuppliers = useMemo(() => {
        if (!supplierSearch) return suppliers;
        const lower = supplierSearch.toLowerCase();
        return suppliers.filter(s =>
            s.name.toLowerCase().includes(lower) ||
            (s.phone && s.phone.includes(lower))
        );
    }, [suppliers, supplierSearch]);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            // Default cost to current cost
            return [...prev, { product, quantity: 1, cost: product.cost }];
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

    const setQuantity = (productId: string, quantity: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                // Allow 0 or empty during typing, but validation might be needed later.
                // For now, let's keep it simple. If 0, it might mean delete, but let's just stick to quantity update.
                const newQty = Math.max(0, quantity);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const updateCost = (productId: string, newCost: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                return { ...item, cost: newCost };
            }
            return item;
        }));
    }

    const cartTotal = cart.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
    const finalTotal = cartTotal + shippingFee;

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        const paid = amountPaid ? parseFloat(amountPaid) : finalTotal;

        // Validation: Require supplier when not paying in full
        if (paid < finalTotal && !selectedSupplier) {
            alert("Vui lòng chọn nhà cung cấp khi mua chịu (không trả đủ tiền)!");
            return;
        }

        setIsCheckoutLoading(true);

        const result = await createPurchaseOrder({
            supplierId: selectedSupplier?.id,
            items: cart.map(item => ({
                productId: item.product.id,
                quantity: item.quantity,
                price: item.cost
            })),
            total: finalTotal,
            shippingFee: shippingFee,
            paid: paid,
            paymentMethod: "CASH"
        });

        setIsCheckoutLoading(false);

        if (result.success) {
            setCart([]);
            setSelectedSupplier(null);
            setAmountPaid("");
            setShippingFee(0);
            const debtAmount = finalTotal - paid;
            if (debtAmount > 0 && selectedSupplier) {
                alert(`Đơn nhập hàng thành công!\nCông nợ NCC tăng: ${new Intl.NumberFormat('vi-VN').format(debtAmount)}đ`);
            } else {
                alert("Đơn nhập hàng thành công!");
            }
        } else {
            alert("Lỗi: " + result.error);
        }
    };

    const handleCreateSupplier = async () => {
        const res = await createSupplier({ name: newSupplierName, phone: newSupplierPhone });
        if (res.success && res.supplier) {
            setSuppliers(prev => [...prev, res.supplier!]);
            setSelectedSupplier(res.supplier);
            setNewSupplierOpen(false);
            setNewSupplierName("");
            setNewSupplierPhone("");
        } else {
            alert("Lỗi tạo nhà cung cấp");
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] gap-4">
            {/* Left: Product List to Buy */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="flex gap-2">
                    <VoiceInput
                        placeholder="Tìm hàng nhập (tên, mã)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onTranscript={setSearchQuery}
                        className="flex-1"
                    />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-20">
                    {filteredProducts.map(product => (
                        <Card key={product.id} className="cursor-pointer hover:border-primary transition-colors flex flex-col justify-between" onClick={() => addToCart(product)}>
                            <CardHeader className="p-4">
                                <CardTitle className="text-sm font-medium line-clamp-2">{product.name}</CardTitle>
                                <p className="text-xs text-muted-foreground">{product.sku}</p>
                            </CardHeader>
                            <CardFooter className="p-4 pt-0 flex justify-between items-center">
                                <span className="font-bold text-muted-foreground">
                                    Giá vốn: {new Intl.NumberFormat('vi-VN').format(product.cost)}
                                </span>
                                <span className={cn("text-xs px-2 py-1 rounded-full bg-slate-100")}>
                                    Tồn: {product.stock}
                                </span>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Right: Cart & Checkout */}
            <div className="w-full lg:w-[450px] flex flex-col gap-4 bg-card border rounded-lg shadow-sm h-full overflow-hidden">
                {/* Supplier Selection */}
                <div className="p-4 border-b space-y-2">
                    {!selectedSupplier ? (
                        <div className="flex gap-2">
                            <Input
                                placeholder="Chọn Nhà Cung Cấp..."
                                value={supplierSearch}
                                onChange={(e) => setSupplierSearch(e.target.value)}
                                className="flex-1"
                            />
                            <Dialog open={newSupplierOpen} onOpenChange={setNewSupplierOpen}>
                                <DialogTrigger asChild>
                                    <Button size="icon" variant="outline"><UserPlus className="h-4 w-4" /></Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Thêm Nhà Cung Cấp</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="name" className="text-right">Tên</Label>
                                            <Input id="name" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="phone" className="text-right">SĐT</Label>
                                            <Input id="phone" value={newSupplierPhone} onChange={e => setNewSupplierPhone(e.target.value)} className="col-span-3" />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleCreateSupplier}>Lưu</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center bg-secondary/50 p-2 rounded-md">
                            <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4" />
                                <div>
                                    <p className="font-medium">{selectedSupplier.name}</p>
                                    <p className="text-xs text-muted-foreground">{selectedSupplier.phone}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedSupplier(null)}>x</Button>
                        </div>
                    )}

                    {/* Supplier Suggestions */}
                    {!selectedSupplier && supplierSearch && (
                        <div className="absolute z-10 w-[calc(100%-2rem)] max-w-[418px] mt-10 bg-popover border rounded-md shadow-md max-h-[200px] overflow-auto">
                            {filteredSuppliers.length > 0 ? filteredSuppliers.map(s => (
                                <div
                                    key={s.id}
                                    className="p-2 hover:bg-accent cursor-pointer text-sm"
                                    onClick={() => { setSelectedSupplier(s); setSupplierSearch(""); }}
                                >
                                    {s.name}
                                </div>
                            )) : (
                                <div className="p-2 text-sm text-muted-foreground">Không tìm thấy NCC</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                            <ShoppingCart className="h-12 w-12 mb-2" />
                            <p>Chưa có hàng nhập</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.product.id} className="flex gap-2 items-center border-b pb-2">
                                <div className="flex-1">
                                    <p className="text-sm font-medium line-clamp-1">{item.product.name}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className="text-xs text-muted-foreground">Giá nhập:</span>
                                        <Input
                                            type="number"
                                            className="h-6 w-20 text-xs"
                                            value={item.cost}
                                            onChange={(e) => updateCost(item.product.id, parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, -1)}>-</Button>
                                    <Input
                                        type="number"
                                        className="h-8 w-14 text-center px-1"
                                        value={item.quantity}
                                        onChange={(e) => setQuantity(item.product.id, parseFloat(e.target.value) || 0)}
                                    />
                                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, 1)}>+</Button>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t bg-muted/20 space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span>Tiền hàng:</span>
                            <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cartTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span>Phí vận chuyển:</span>
                            <div className="flex items-center gap-1">
                                <Input
                                    type="number"
                                    className="h-7 w-24 text-right"
                                    value={shippingFee}
                                    onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                            <span>Tổng cộng:</span>
                            <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cartTotal + shippingFee)}</span>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Trả trước:</Label>
                        <div className="flex gap-2">
                            <VoiceInput
                                placeholder="Nhập số tiền..."
                                value={amountPaid}
                                onChange={(e) => setAmountPaid(e.target.value)}
                                onTranscript={(val) => setAmountPaid(val.replace(/\D/g, ''))}
                            />
                            <Button variant="outline" onClick={() => setAmountPaid(cartTotal.toString())}>Hết</Button>
                        </div>
                        {amountPaid && (
                            <div className="flex justify-between text-sm">
                                <span>Còn nợ NCC:</span>
                                <span className="text-red-500">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.max(0, cartTotal - parseFloat(amountPaid)))}
                                </span>
                            </div>
                        )}
                    </div>

                    <Button className="w-full" size="lg" disabled={cart.length === 0 || isCheckoutLoading} onClick={handleCheckout}>
                        {isCheckoutLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Tạo Phiếu Nhập
                    </Button>
                </div>
            </div>
        </div>
    );
}
