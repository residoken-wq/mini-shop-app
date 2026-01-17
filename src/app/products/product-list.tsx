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
    Plus, Search, History, AlertTriangle, ArrowUpCircle, ArrowDownCircle, Package, FolderPlus, RefreshCw, Download, Edit, Trash2, Upload, FileSpreadsheet
} from "lucide-react";
import { createProduct, updateProduct, deleteProduct, adjustStock, getInventoryHistory, createCategory, getCategories, getMarketPrices, bulkImportMarketProducts, importProductsFromExcel } from "./actions";
import { cn } from "@/lib/utils";
import { MarketProduct } from "@/lib/market-types";
import * as XLSX from "xlsx";
import { getImageUrl } from "@/lib/image-utils";

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
    const [newProduct, setNewProduct] = useState({ name: "", categoryId: "", price: "", cost: "", stock: "", unit: "kg", imageUrl: "", saleUnit: "", saleRatio: "" });

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

    // Excel Import State
    const [isExcelOpen, setIsExcelOpen] = useState(false);
    const [excelData, setExcelData] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [selectedCategoryForImport, setSelectedCategoryForImport] = useState("");

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
        setNewProduct({ name: "", categoryId: "", price: "", cost: "", stock: "", unit: "kg", imageUrl: "", saleUnit: "", saleRatio: "" });
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
            imageUrl: p.imageUrl || "",
            saleUnit: p.saleUnit || "",
            saleRatio: p.saleRatio ? p.saleRatio.toString() : ""
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
                imageUrl: newProduct.imageUrl,
                saleUnit: newProduct.saleUnit,
                saleRatio: parseFloat(newProduct.saleRatio) || 1
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
                imageUrl: newProduct.imageUrl,
                saleUnit: newProduct.saleUnit,
                saleRatio: parseFloat(newProduct.saleRatio) || 1,
                unit: newProduct.unit
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
            imageUrl: mp.imageUrl || "",
            saleUnit: "",
            saleRatio: "1"
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

    const handleExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const data = evt.target?.result;
            const workbook = XLSX.read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            // Map Excel columns to our expected format
            const mapped = jsonData.map((row: any) => ({
                name: row["Tên sản phẩm"] || row["name"] || row["Name"] || row["TÊN"] || row["ten"] || "",
                sku: row["SKU"] || row["Mã"] || row["sku"] || row["Ma"] || "",
                price: parseFloat(row["Giá bán"] || row["price"] || row["Price"] || row["Giá"] || 0),
                cost: parseFloat(row["Giá nhập"] || row["cost"] || row["Cost"] || row["Giá vốn"] || 0),
                stock: parseInt(row["Tồn kho"] || row["stock"] || row["Stock"] || row["Số lượng"] || 0),
                unit: row["Đơn vị"] || row["unit"] || row["Unit"] || "kg",
                category: row["Danh mục"] || row["category"] || row["Category"] || ""
            }));

            setExcelData(mapped.filter((r: any) => r.name));
            setIsExcelOpen(true);
        };
        reader.readAsBinaryString(file);
        e.target.value = ""; // Reset input
    };

    const handleExcelImport = async () => {
        if (excelData.length === 0) return;
        setIsImporting(true);
        const res = await importProductsFromExcel(excelData, selectedCategoryForImport || undefined);
        if (res.success) {
            alert(`Đã import ${res.created} sản phẩm. Bỏ qua: ${res.skipped}`);
            setIsExcelOpen(false);
            setExcelData([]);
            window.location.reload();
        } else {
            alert("Lỗi: " + res.error);
        }
        setIsImporting(false);
    };

    const downloadTemplate = () => {
        // Create sample data with headers
        const sampleData = [
            {
                "Tên sản phẩm": "Cà chua",
                "SKU": "RAU-001",
                "Giá bán": 25000,
                "Giá nhập": 18000,
                "Tồn kho": 100,
                "Đơn vị": "kg",
                "Danh mục": "RAU"
            },
            {
                "Tên sản phẩm": "Dưa leo",
                "SKU": "RAU-002",
                "Giá bán": 20000,
                "Giá nhập": 15000,
                "Tồn kho": 50,
                "Đơn vị": "kg",
                "Danh mục": "RAU"
            },
            {
                "Tên sản phẩm": "Thịt heo",
                "SKU": "",
                "Giá bán": 120000,
                "Giá nhập": 100000,
                "Tồn kho": 20,
                "Đơn vị": "kg",
                "Danh mục": "THIT"
            }
        ];

        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sản phẩm");

        // Set column widths
        ws["!cols"] = [
            { wch: 20 }, // Tên sản phẩm
            { wch: 12 }, // SKU
            { wch: 12 }, // Giá bán
            { wch: 12 }, // Giá nhập
            { wch: 10 }, // Tồn kho
            { wch: 10 }, // Đơn vị
            { wch: 12 }  // Danh mục
        ];

        XLSX.writeFile(wb, "template_san_pham.xlsx");
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

                {/* Excel Import Button */}
                <label>
                    <Button variant="outline" asChild>
                        <span>
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Import Excel
                        </span>
                    </Button>
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleExcelFile}
                    />
                </label>

                {/* Download Template */}
                <Button variant="ghost" size="icon" onClick={downloadTemplate} title="Tải template mẫu">
                    <Download className="h-4 w-4" />
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

                {/* Dialog for Create/Edit - Modern Redesign */}
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogContent className="max-w-2xl p-0 overflow-hidden">
                        {/* Header with gradient */}
                        <div className="bg-gradient-to-r from-purple-600 to-pink-500 p-6 text-white">
                            <DialogTitle className="text-xl font-bold flex items-center gap-3">
                                {mode === "CREATE" ? (
                                    <>
                                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                            <Plus className="w-5 h-5" />
                                        </div>
                                        Thêm Sản Phẩm Mới
                                    </>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                            <Edit className="w-5 h-5" />
                                        </div>
                                        Chỉnh Sửa Sản Phẩm
                                    </>
                                )}
                            </DialogTitle>
                            <p className="text-white/70 text-sm mt-2">
                                {mode === "CREATE" ? "Điền thông tin để tạo sản phẩm mới" : `Đang sửa: ${selectedProduct?.name}`}
                            </p>
                        </div>

                        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                            {/* Section 1: Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    Thông tin cơ bản
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Category */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            Danh mục <span className="text-red-500">*</span>
                                        </Label>
                                        <select
                                            className="w-full flex h-11 items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                            value={newProduct.categoryId}
                                            onChange={e => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                                        >
                                            <option value="">🏷️ Chọn danh mục...</option>
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>📁 {c.name} ({c.code})</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Unit */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Đơn vị kho (Base)</Label>
                                            <select
                                                className="w-full flex h-11 items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                                value={newProduct.unit}
                                                onChange={e => setNewProduct({ ...newProduct, unit: e.target.value })}
                                            >
                                                <option value="kg">⚖️ Kilogram (kg)</option>
                                                <option value="g">⚖️ Gram (g)</option>
                                                <option value="bó">🌿 Bó</option>
                                                <option value="cái">📦 Cái</option>
                                                <option value="hộp">📦 Hộp</option>
                                                <option value="gói">📦 Gói</option>
                                                <option value="chai">🍾 Chai</option>
                                                <option value="lon">🥫 Lon</option>
                                                <option value="túi">👜 Túi</option>
                                                <option value="khay">📋 Khay</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <div className="col-span-2 text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">
                                                Đơn vị bán Portal
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Đơn vị (VD: Trái)</Label>
                                                <Input
                                                    value={newProduct.saleUnit || ""}
                                                    onChange={e => setNewProduct({ ...newProduct, saleUnit: e.target.value })}
                                                    placeholder="Để trống nếu giống kho"
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Quy đổi (1 Unit ≈ ? kg)</Label>
                                                <Input
                                                    type="number"
                                                    value={newProduct.saleRatio || ""}
                                                    onChange={e => setNewProduct({ ...newProduct, saleRatio: e.target.value })}
                                                    placeholder="1"
                                                    className="h-9 text-sm"
                                                />
                                            </div>
                                            <p className="col-span-2 text-[10px] text-blue-600 italic">
                                                * Dùng cho khách đặt trên Portal (VD: Đặt theo Trái, kho tính Kg)
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Product Name - Full Width */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        Tên sản phẩm <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        value={newProduct.name}
                                        onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                        placeholder="VD: Cà chua bi, Bắp cải thảo, Thịt heo ba rọi..."
                                        className="h-11 text-base border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        💡 Mã SKU sẽ được tạo tự động theo danh mục (VD: RAU-001)
                                    </p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-gray-100" />

                            {/* Section 2: Pricing */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                    💰 Thông tin giá
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Cost Price */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Giá nhập (Giá vốn)</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={newProduct.cost}
                                                onChange={e => setNewProduct({ ...newProduct, cost: e.target.value })}
                                                placeholder="0"
                                                className="h-11 pr-12 text-base border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">VNĐ</span>
                                        </div>
                                    </div>

                                    {/* Selling Price */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Giá bán</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                value={newProduct.price}
                                                onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                                                placeholder="0"
                                                className="h-11 pr-12 text-base border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">VNĐ</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Profit Margin Display */}
                                {parseFloat(newProduct.cost) > 0 && parseFloat(newProduct.price) > 0 && (
                                    <div className={cn(
                                        "p-3 rounded-lg flex items-center justify-between",
                                        parseFloat(newProduct.price) > parseFloat(newProduct.cost)
                                            ? "bg-green-50 border border-green-200"
                                            : "bg-red-50 border border-red-200"
                                    )}>
                                        <span className="text-sm font-medium">
                                            {parseFloat(newProduct.price) > parseFloat(newProduct.cost) ? "📈" : "📉"} Lợi nhuận dự kiến
                                        </span>
                                        <div className="text-right">
                                            <span className={cn(
                                                "font-bold",
                                                parseFloat(newProduct.price) > parseFloat(newProduct.cost) ? "text-green-600" : "text-red-600"
                                            )}>
                                                {new Intl.NumberFormat('vi-VN').format(parseFloat(newProduct.price) - parseFloat(newProduct.cost))}đ
                                            </span>
                                            <span className="text-xs text-gray-500 ml-2">
                                                ({((parseFloat(newProduct.price) - parseFloat(newProduct.cost)) / parseFloat(newProduct.cost) * 100).toFixed(1)}%)
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="border-t border-gray-100" />

                            {/* Section 3: Inventory & Image */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                    📦 Kho & Hình ảnh
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Initial Stock (only for CREATE) */}
                                    {mode === "CREATE" && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Tồn kho ban đầu</Label>
                                            <Input
                                                type="number"
                                                value={newProduct.stock}
                                                onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                                                placeholder="0"
                                                className="h-11 text-base border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            />
                                        </div>
                                    )}

                                    {/* Image URL */}
                                    <div className={cn("space-y-2", mode === "EDIT" && "col-span-2")}>
                                        <Label className="text-sm font-medium">Link hình ảnh (URL)</Label>
                                        <Input
                                            value={newProduct.imageUrl}
                                            onChange={e => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                                            placeholder="https://example.com/image.jpg"
                                            className="h-11 text-base border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                {/* Image Preview */}
                                {newProduct.imageUrl && (
                                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={getImageUrl(newProduct.imageUrl)}
                                            alt="Preview"
                                            className="w-16 h-16 object-cover rounded-lg border shadow-sm"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                        />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">Xem trước hình ảnh</p>
                                            <p className="text-xs text-gray-500 truncate">{newProduct.imageUrl}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setNewProduct({ ...newProduct, imageUrl: "" })}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer with Actions */}
                        <div className="border-t bg-gray-50 p-4 flex justify-between items-center">
                            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                                Hủy
                            </Button>
                            <Button
                                onClick={handleSaveProduct}
                                className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white px-8"
                            >
                                {mode === "CREATE" ? (
                                    <><Plus className="w-4 h-4 mr-2" /> Tạo sản phẩm</>
                                ) : (
                                    <><Edit className="w-4 h-4 mr-2" /> Lưu thay đổi</>
                                )}
                            </Button>
                        </div>
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

            {/* Excel Import Preview Dialog */}
            <Dialog open={isExcelOpen} onOpenChange={setIsExcelOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5" />
                            Import từ Excel ({excelData.length} sản phẩm)
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto">
                        <div className="mb-4">
                            <Label>Danh mục mặc định (nếu không có trong file)</Label>
                            <select
                                className="w-full mt-1 border rounded-md p-2"
                                value={selectedCategoryForImport}
                                onChange={e => setSelectedCategoryForImport(e.target.value)}
                            >
                                <option value="">-- Tự động tạo --</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name} ({cat.code})</option>
                                ))}
                            </select>
                        </div>
                        <div className="border rounded-md overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-2 text-left">Tên sản phẩm</th>
                                        <th className="p-2 text-left">SKU</th>
                                        <th className="p-2 text-right">Giá bán</th>
                                        <th className="p-2 text-right">Giá nhập</th>
                                        <th className="p-2 text-center">Tồn</th>
                                        <th className="p-2 text-left">ĐVT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {excelData.slice(0, 20).map((row, idx) => (
                                        <tr key={idx} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                                            <td className="p-2">{row.name}</td>
                                            <td className="p-2 font-mono text-xs">{row.sku || "-"}</td>
                                            <td className="p-2 text-right">{row.price?.toLocaleString()}</td>
                                            <td className="p-2 text-right">{row.cost?.toLocaleString()}</td>
                                            <td className="p-2 text-center">{row.stock}</td>
                                            <td className="p-2">{row.unit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {excelData.length > 20 && (
                                <p className="text-center text-sm text-muted-foreground py-2">
                                    ... và {excelData.length - 20} sản phẩm khác
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button variant="outline" onClick={() => setIsExcelOpen(false)}>Hủy</Button>
                        <Button onClick={handleExcelImport} disabled={isImporting}>
                            {isImporting ? "Đang import..." : `Import ${excelData.length} sản phẩm`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
