"use client";

import { useState } from "react";
import { Category, Product } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Plus, Search, ChevronRight, Package, ArrowLeft } from "lucide-react";
import { createCategory, updateCategory, deleteCategory, getProductsByCategory } from "./actions";

interface CategoriesPageProps {
    initialCategories: (Category & { _count: { products: number } })[];
}

export default function CategoriesClient({ initialCategories }: CategoriesPageProps) {
    const [categories, setCategories] = useState(initialCategories);
    const [search, setSearch] = useState("");

    // Dialog State
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<"CREATE" | "EDIT">("CREATE");
    const [selectedCat, setSelectedCat] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ name: "", code: "" });

    // Product list view
    const [viewingCategory, setViewingCategory] = useState<(Category & { _count: { products: number } }) | null>(null);
    const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    const filtered = categories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
    );

    const handleOpenCreate = () => {
        setMode("CREATE");
        setFormData({ name: "", code: "" });
        setIsOpen(true);
    };

    const handleOpenEdit = (cat: Category) => {
        setMode("EDIT");
        setSelectedCat(cat);
        setFormData({ name: cat.name, code: cat.code });
        setIsOpen(true);
    };

    const handleSubmit = async () => {
        if (mode === "CREATE") {
            const res = await createCategory(formData.name, formData.code);
            if (res.success && res.category) {
                setCategories([...categories, { ...res.category, _count: { products: 0 } }]);
                setIsOpen(false);
            } else {
                alert("Lỗi: " + res.error);
            }
        } else {
            if (!selectedCat) return;
            const res = await updateCategory(selectedCat.id, formData.name, formData.code);
            if (res.success && res.category) {
                setCategories(categories.map(c => c.id === selectedCat.id ? { ...res.category!, _count: c._count } : c));
                setIsOpen(false);
            } else {
                alert("Lỗi: " + res.error);
            }
        }
    };

    const handleDelete = async (id: string, count: number) => {
        if (count > 0) {
            alert("Không thể xóa danh mục đang có sản phẩm!");
            return;
        }
        if (!confirm("Bạn có chắc muốn xóa?")) return;

        const res = await deleteCategory(id);
        if (res.success) {
            setCategories(categories.filter(c => c.id !== id));
        } else {
            alert("Lỗi: " + res.error);
        }
    };

    const handleViewProducts = async (cat: Category & { _count: { products: number } }) => {
        setViewingCategory(cat);
        setLoadingProducts(true);
        const products = await getProductsByCategory(cat.id);
        setCategoryProducts(products);
        setLoadingProducts(false);
    };

    const handleBackToList = () => {
        setViewingCategory(null);
        setCategoryProducts([]);
    };

    // If viewing a category's products
    if (viewingCategory) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handleBackToList}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{viewingCategory.name}</h1>
                        <p className="text-sm text-muted-foreground">
                            Mã: {viewingCategory.code} • {viewingCategory._count.products} sản phẩm
                        </p>
                    </div>
                </div>

                {loadingProducts ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : categoryProducts.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Package className="h-12 w-12 mb-4 opacity-50" />
                            <p>Danh mục này chưa có sản phẩm</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {categoryProducts.map(product => (
                            <Card key={product.id}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">{product.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm space-y-1">
                                    <p className="text-muted-foreground">SKU: {product.sku}</p>
                                    <div className="flex justify-between">
                                        <span>Giá bán:</span>
                                        <span className="font-medium">
                                            {new Intl.NumberFormat('vi-VN').format(product.price)} ₫/{product.unit}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Tồn kho:</span>
                                        <span className={product.stock <= 5 ? "text-red-500 font-bold" : "font-medium"}>
                                            {product.stock}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Quản lý Danh mục</h1>
                <Button onClick={handleOpenCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Thêm Danh Mục
                </Button>
            </div>

            <div className="flex items-center gap-2 max-w-sm">
                <Search className="h-4 w-4" />
                <Input
                    placeholder="Tìm danh mục..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.length > 0 ? filtered.map(cat => (
                    <Card key={cat.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleViewProducts(cat)}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{cat.name}</CardTitle>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground font-mono">{cat.code}</span>
                                <span className="font-medium">{cat._count.products} sản phẩm</span>
                            </div>
                            <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(cat)}>
                                    <Edit className="h-4 w-4 mr-1" /> Sửa
                                </Button>
                                <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(cat.id, cat._count.products)}>
                                    <Trash2 className="h-4 w-4 mr-1" /> Xóa
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )) : (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        Chưa có danh mục nào
                    </div>
                )}
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{mode === "CREATE" ? "Thêm Danh Mục" : "Sửa Danh Mục"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                            <Label className="text-left md:text-right">Tên</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                            <Label className="text-left md:text-right">Mã (Prefix)</Label>
                            <Input
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                className="col-span-3"
                                placeholder="VD: RAU"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSubmit}>Lưu</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
