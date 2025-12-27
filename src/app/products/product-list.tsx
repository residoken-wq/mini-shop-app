"use client";

import { useState, useMemo, useEffect } from "react";
import { Product, InventoryTransaction, Category } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Plus, Search, History, AlertTriangle, ArrowUpCircle, ArrowDownCircle, Package, FolderPlus, RefreshCw, Download, Edit, Trash2
} from "lucide-react";
import { createProduct, updateProduct, deleteProduct, adjustStock, getInventoryHistory, createCategory, getCategories, getMarketPrices, bulkImportMarketProducts } from "./actions";
import { cn } from "@/lib/utils";
import { MarketProduct } from "@/lib/market-scraper";

// Extend Product to include Category relation if needed, or just use basic type
type ProductWithCategory = Product & { category?: Category | null };

interface ProductListProps {
    initialProducts: Product[];
}

export function ProductList({ initialProducts }: ProductListProps) {
    const [products, setProducts] = useState<ProductWithCategory[]>(initialProducts);
    const [categories, setCategories] = useState<Category[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Create/Edit Product State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [mode, setMode] = useState<"CREATE" | "EDIT">("CREATE");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [newProduct, setNewProduct] = useState({ name: "", categoryId: "", price: "", cost: "", stock: "", unit: "kg", imageUrl: "" });

    // Create Category State

    // Create Category State
    const [isCatOpen, setIsCatOpen] = useState(false);
    const [newCat, setNewCat] = useState({ name: "", code: "" });

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

    // Fetch Categories on Load
    useEffect(() => {
        getCategories().then(setCategories);
    }, []);

    const filteredProducts = useMemo(() => {
        const lower = searchQuery.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(lower) ||
            p.sku.toLowerCase().includes(lower)
        );
    }, [products, searchQuery]);

    const handleCreateCategory = async () => {
        const res = await createCategory(newCat.name, newCat.code);
        if (res.success && res.category) {
            setCategories(prev => [...prev, res.category!]);
            setIsCatOpen(false);
            setNewCat({ name: "", code: "" });
        } else {
            alert("Lỗi: " + res.error);
        }
    };

    const handleOpenCreate = () => {
        setMode("CREATE");
        setNewProduct({ name: "", categoryId: "", price: "", cost: "", stock: "", unit: "kg", imageUrl: "" });
        setIsCreateOpen(true);
    };

    const handleOpenEdit = (p: Product) => {
        setMode("EDIT");
        setSelectedProduct(p);
        setNewProduct({
            name: p.name,
            categoryId: p.categoryId || "",
            price: p.price.toString(),
            cost: p.cost.toString(),
            stock: p.stock.toString(),
            unit: p.unit || "kg",
            imageUrl: p.imageUrl || ""
        });
        setIsCreateOpen(true);
    };

    const handleSaveProduct = async () => {
        if (!newProduct.categoryId) {
            alert("Vui lòng chọn danh mục");
            return;
        }

        if (mode === "CREATE") {
            const res = await createProduct({
                name: newProduct.name,
                categoryId: newProduct.categoryId,
                price: parseFloat(newProduct.price) || 0,
                cost: parseFloat(newProduct.cost) || 0,
                stock: parseInt(newProduct.stock) || 0,
                unit: newProduct.unit,
                imageUrl: newProduct.imageUrl
            });

            if (res.success && res.product) {
                setProducts(prev => [res.product!, ...prev]);
                setIsCreateOpen(false);
            } else {
                alert("Lỗi: " + res.error);
            }
        } else {
            if (!selectedProduct) return;
            const res = await updateProduct(selectedProduct.id, {
                name: newProduct.name,
                categoryId: newProduct.categoryId,
                price: parseFloat(newProduct.price) || 0,
                cost: parseFloat(newProduct.cost) || 0,
                // stock: // Stock not updated here
                imageUrl: newProduct.imageUrl
            });

            if (res.success && res.product) {
                const updated = res.product!;
                setProducts(prev => prev.map(p => p.id === updated.id ? { ...updated, stock: p.stock } : p)); // Keep local stock or refresh? Server returned product has correct stock.
                setIsCreateOpen(false);
            } else {
                alert("Lỗi: " + res.error);
            }
        }
    };

    const handleDelete = async (p: Product) => {
        if (p.stock > 0) {
            alert("Không thể xóa sản phẩm còn tồn kho!");
            return;
        }
        if (!confirm(`Xóa sản phẩm "${p.name}"?`)) return;

        const res = await deleteProduct(p.id);
        if (res.success) {
            setProducts(prev => prev.filter(item => item.id !== p.id));
        } else {
            alert("Lỗi: " + res.error);
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

    // Market State
    const [isMarketOpen, setIsMarketOpen] = useState(false);
    const [marketProducts, setMarketProducts] = useState<MarketProduct[]>([]);
    const [isLoadingMarket, setIsLoadingMarket] = useState(false);

    const handleScanMarket = async () => {
        setIsLoadingMarket(true);
        setIsMarketOpen(true);
        const res = await getMarketPrices();
        setMarketProducts(res);
        setIsLoadingMarket(false);
    };

    const handleImportMarket = async (mp: MarketProduct) => {
        setMode("CREATE");
        setNewProduct({
            name: mp.name,
            categoryId: "", // User must select
            price: mp.price.toString(),
            cost: (mp.price * 0.8).toString(), // Assume 20% margin
            stock: "0",
            unit: mp.unit || "kg",
            imageUrl: mp.imageUrl || ""
        });
        setIsMarketOpen(false);
        setIsCreateOpen(true);
    };

    const handleBulkImport = async () => {
        setIsLoadingMarket(true);
        const res = await bulkImportMarketProducts(marketProducts);
        if (res.success) {
            alert(`Đã nhập ${res.count} sản phẩm vào danh mục Rau Củ.`);
            setIsMarketOpen(false);
            window.location.reload();
        } else {
            alert("Lỗi: " + res.error);
        }
        setIsLoadingMarket(false);
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

                <Button variant="outline" onClick={handleScanMarket} disabled={isLoadingMarket}>
                    <RefreshCw className={cn("mr-2 h-4 w-4", isLoadingMarket ? "animate-spin" : "")} />
                    {isLoadingMarket ? "Đang quét..." : "Giá Chợ"}
                </Button>

                {/* Create Category */}
                <Dialog open={isCatOpen} onOpenChange={setIsCatOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon"><FolderPlus className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Thêm Danh Mục</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                                <Label className="text-left md:text-right">Tên</Label>
                                <Input value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} className="col-span-3" placeholder="Ví dụ: Rau Củ" />
                            </div>
                            <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                                <Label className="text-left md:text-right">Mã (Prefix)</Label>
                                <Input value={newCat.code} onChange={e => setNewCat({ ...newCat, code: e.target.value })} className="col-span-3" placeholder="Ví dụ: RAU" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateCategory}>Lưu</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Create Product Button */}
                <Button onClick={handleOpenCreate}><Plus className="mr-2 h-4 w-4" /> Thêm SP</Button>

                {/* Dialog for Create/Edit */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{mode === "CREATE" ? "Thêm Sản Phẩm Mới" : "Sửa Sản Phẩm"}</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                                <Label className="text-left md:text-right">Danh mục</Label>
                                <select
                                    className="col-span-3 flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={newProduct.categoryId}
                                    onChange={e => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                                >
                                    <option value="">-- Chọn danh mục --</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                                <Label className="text-left md:text-right">Tên SP</Label>
                                <Input value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="col-start-1 md:col-start-2 col-span-4 md:col-span-3 text-xs text-muted-foreground">
                                * Mã SKU sẽ được tạo tự động theo danh mục (VD: RAU-001)
                            </div>
                            <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                                <Label className="text-left md:text-right">Giá Bán</Label>
                                <Input type="number" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                                <Label className="text-left md:text-right">Giá Vốn</Label>
                                <Input type="number" value={newProduct.cost} onChange={e => setNewProduct({ ...newProduct, cost: e.target.value })} className="col-span-3" />
                            </div>
                            <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                                <Label className="text-left md:text-right">Đơn vị</Label>
                                <Input value={newProduct.unit} onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })} className="col-span-3" placeholder="kg, cái, bó..." />
                            </div>
                            {mode === "CREATE" && (
                                <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                                    <Label className="text-left md:text-right">Tồn Đầu</Label>
                                    <Input type="number" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} className="col-span-3" />
                                </div>
                            )}
                            <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                                <Label className="text-left md:text-right">Link Ảnh</Label>
                                <Input value={newProduct.imageUrl} onChange={e => setNewProduct({ ...newProduct, imageUrl: e.target.value })} className="col-span-3" placeholder="https://..." />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSaveProduct}>Lưu</Button>
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
                                <span className="font-medium">{new Intl.NumberFormat('vi-VN').format(product.price)} / {product.unit || 'kg'}</span> {product.unit || 'kg'}
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
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHistory(product)}>
                                    <History className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(product)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(product)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Adjust & History Dialogs (Same as before) */}
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
                        </div>
                    </div>
                </DialogContent>
            </Dialog>



            {/* Market Dialog */}
            <Dialog open={isMarketOpen} onOpenChange={setIsMarketOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                    <DialogHeader className="flex flex-row justify-between items-center pr-8">
                        <DialogTitle>Giá Chợ Đầu Mối Bình Điền</DialogTitle>
                        {marketProducts.length > 0 && (
                            <Button onClick={handleBulkImport} size="sm" variant="default">
                                <Download className="mr-2 h-4 w-4" /> Nhập tất cả ({marketProducts.length})
                            </Button>
                        )}
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto -mx-4 px-4">
                        {isLoadingMarket ? (
                            <div className="flex justify-center items-center h-40">
                                <span className="loading">Đang tải dữ liệu...</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {marketProducts.map((mp, i) => {
                                    // Simple exact match check
                                    const existing = products.find(p => p.name.toLowerCase() === mp.name.toLowerCase());

                                    return (
                                        <div key={i} className="flex gap-4 p-3 border rounded-lg items-start">
                                            {mp.imageUrl && (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src={mp.imageUrl} className="w-16 h-16 object-cover rounded-md" alt={mp.name} />
                                            )}
                                            <div className="flex-1">
                                                <h4 className="font-medium text-sm">{mp.name}</h4>
                                                <p className="text-xs text-muted-foreground">Mã chợ: {mp.code}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="font-bold text-red-600">
                                                        {new Intl.NumberFormat('vi-VN').format(mp.price)}đ
                                                    </span>
                                                    <span className="text-xs text-gray-500">/{mp.unit || 'kg'}</span>
                                                </div>

                                                {existing ? (
                                                    <div className="mt-2 text-xs bg-yellow-50 p-2 rounded text-yellow-800 flex justify-between items-center">
                                                        <span>Đã có: {new Intl.NumberFormat('vi-VN').format(existing.price)}đ</span>
                                                        {Math.abs(existing.price - mp.price) > 0 && (
                                                            <span className={existing.price < mp.price ? "text-red-500" : "text-green-600"}>
                                                                {existing.price < mp.price ? `Thấp hơn ${(mp.price - existing.price) / 1000}k` : `Cao hơn ${(existing.price - mp.price) / 1000}k`}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Button size="sm" variant="secondary" className="w-full mt-2 h-7 text-xs" onClick={() => handleImportMarket(mp)}>
                                                        <Download className="w-3 h-3 mr-1" /> Nhập SP
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
