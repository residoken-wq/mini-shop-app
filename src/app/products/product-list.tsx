"use client";

import { useState, useMemo } from "react";
import { Product, InventoryTransaction } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Plus, Search, History, AlertTriangle, CheckCircle, Package, ArrowUpCircle, ArrowDownCircle
} from "lucide-react";
import { createProduct, adjustStock, getInventoryHistory } from "./actions";
import { cn } from "@/lib/utils";

interface ProductListProps {
    initialProducts: Product[];
}

export function ProductList({ initialProducts }: ProductListProps) {
    const [products, setProducts] = useState(initialProducts);
    const [searchQuery, setSearchQuery] = useState("");

    // Create State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({ name: "", sku: "", price: "", cost: "", stock: "" });

    // Adjust State
    const [isAdjustOpen, setIsAdjustOpen] = useState(false);
    const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
    const [adjustType, setAdjustType] = useState<"IN" | "OUT" | "LOST" | "DAMAGED">("IN");
    const [adjustQty, setAdjustQty] = useState("");
    const [adjustNote, setAdjustNote] = useState("");

    // History State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [historyList, setHistoryList] = useState<InventoryTransaction[]>([]);
    const [historyTarget, setHistoryTarget] = useState<Product | null>(null);

    const filteredProducts = useMemo(() => {
        const lower = searchQuery.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(lower) ||
            p.sku.toLowerCase().includes(lower)
        );
    }, [products, searchQuery]);

    const handleCreate = async () => {
        const res = await createProduct({
            name: newProduct.name,
            sku: newProduct.sku,
            price: parseFloat(newProduct.price) || 0,
            cost: parseFloat(newProduct.cost) || 0,
            stock: parseInt(newProduct.stock) || 0
        });

        if (res.success && res.product) {
            setProducts(prev => [res.product!, ...prev]);
            setIsCreateOpen(false);
            setNewProduct({ name: "", sku: "", price: "", cost: "", stock: "" });
        }
    };

    const handleAdjust = async () => {
        if (!adjustTarget) return;
        const res = await adjustStock({
            productId: adjustTarget.id,
            type: adjustType as any,
            quantity: parseInt(adjustQty) || 0,
            note: adjustNote
        });

        if (res.success) {
            // Optimistic Update
            let delta = parseInt(adjustQty) || 0;
            if (["OUT", "LOST", "DAMAGED"].includes(adjustType)) delta = -delta;

            setProducts(prev => prev.map(p =>
                p.id === adjustTarget.id ? { ...p, stock: p.stock + delta } : p
            ));

            setIsAdjustOpen(false);
            setAdjustQty("");
            setAdjustNote("");
        }
    };

    const openHistory = async (product: Product) => {
        setHistoryTarget(product);
        setHistoryList([]);
        setIsHistoryOpen(true);
        const history = await getInventoryHistory(product.id);
        setHistoryList(history);
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm sản phẩm..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Thêm Mới</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Thêm Sản Phẩm</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Tên</Label>
                                <Input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Mã (SKU)</Label>
                                <Input value={newProduct.sku} onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Giá Bán</Label>
                                <Input type="number" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Giá Vốn</Label>
                                <Input type="number" value={newProduct.cost} onChange={e => setNewProduct({ ...newProduct, cost: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Tồn Đầu</Label>
                                <Input type="number" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} className="col-span-3" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>Lưu</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-20">
                {filteredProducts.map(product => (
                    <Card key={product.id} className={cn("flex flex-col justify-between", product.stock <= 5 ? "border-red-300 bg-red-50/50" : "")}>
                        <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-base line-clamp-2">{product.name}</CardTitle>
                                {product.stock <= 5 && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                        </CardHeader>
                        <CardContent className="p-4 py-2 flex flex-col gap-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Giá bán:</span>
                                <span className="font-medium">{new Intl.NumberFormat('vi-VN').format(product.price)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Giá vốn:</span>
                                <span className="">{new Intl.NumberFormat('vi-VN').format(product.cost)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                <span className="text-muted-foreground font-medium">Tồn kho:</span>
                                <span className={cn("text-lg font-bold", product.stock <= 0 ? "text-red-600" : "text-primary")}>
                                    {product.stock}
                                </span>
                            </div>
                        </CardContent>
                        <CardFooter className="p-2 bg-muted/20 flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { setAdjustTarget(product); setIsAdjustOpen(true); }}>
                                Kiểm kê
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHistory(product)}>
                                <History className="h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Adjust Logic Dialog */}
            <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Điều chỉnh kho: {adjustTarget?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-2">
                            {/* Types */}
                            {[
                                { id: "IN", label: "Nhập thêm", icon: ArrowUpCircle, color: "text-green-600" },
                                { id: "OUT", label: "Xuất hủy", icon: ArrowDownCircle, color: "text-red-600" },
                                { id: "LOST", label: "Thất thoát", icon: AlertTriangle, color: "text-orange-600" },
                                { id: "DAMAGED", label: "Hư hỏng", icon: Package, color: "text-red-500" },
                            ].map(t => (
                                <div
                                    key={t.id}
                                    className={cn(
                                        "cursor-pointer border rounded-md p-3 flex flex-col items-center gap-2 hover:bg-muted",
                                        adjustType === t.id ? "border-primary bg-primary/10" : ""
                                    )}
                                    onClick={() => setAdjustType(t.id as any)}
                                >
                                    <t.icon className={cn("h-6 w-6", t.color)} />
                                    <span className="text-sm font-medium">{t.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <Label>Số lượng (Delta)</Label>
                            <Input type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="VD: 5" />
                        </div>
                        <div className="space-y-2">
                            <Label>Ghi chú</Label>
                            <Input value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="Lý do..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleAdjust}>Xác nhận</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Lịch sử kho: {historyTarget?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto -mx-4 px-4">
                        <div className="space-y-4">
                            {historyList.map(h => (
                                <div key={h.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                                h.type === "IN" ? "bg-green-100 text-green-700" :
                                                    h.type === "OUT" ? "bg-red-100 text-red-700" :
                                                        "bg-orange-100 text-orange-700"
                                            )}>
                                                {h.type}
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {new Date(h.date).toLocaleDateString('vi-VN')} {new Date(h.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-sm mt-1">{h.note || "---"}</p>
                                    </div>
                                    <span className={cn("font-bold", h.quantity > 0 ? "text-green-600" : "text-red-600")}>
                                        {h.quantity > 0 ? "+" : ""}{h.quantity}
                                    </span>
                                </div>
                            ))}
                            {historyList.length === 0 && <p className="text-center text-muted-foreground">Chưa có lịch sử</p>}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
