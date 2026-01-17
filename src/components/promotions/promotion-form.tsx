"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { createPromotion, updatePromotion } from "@/app/promotions/actions";

interface Product {
    id: string;
    name: string;
    price: number;
}

interface PromotionFormProps {
    initialData?: any;
    products: Product[];
}

interface ProductTier {
    minQuantity: number;
    price: number;
}

interface SelectedProduct {
    productId: string;
    productName: string;
    productPrice: number;
    tiers: ProductTier[];
}

export function PromotionForm({ initialData, products }: PromotionFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Form State
    const [name, setName] = useState(initialData?.name || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [startDate, setStartDate] = useState(
        initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : ""
    );
    const [endDate, setEndDate] = useState(
        initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : ""
    );
    const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

    // Products State
    const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
        initialData?.products?.map((p: any) => ({
            productId: p.productId,
            productName: p.product.name,
            productPrice: p.product.price,
            tiers: p.tiers.map((t: any) => ({
                minQuantity: t.minQuantity,
                price: t.price
            }))
        })) || []
    );

    // Product Picker State
    const [searchQuery, setSearchQuery] = useState("");
    const [pickerOpen, setPickerOpen] = useState(false);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !selectedProducts.find(sp => sp.productId === p.id)
    );

    const handleAddProduct = (product: Product) => {
        setSelectedProducts([
            ...selectedProducts,
            {
                productId: product.id,
                productName: product.name,
                productPrice: product.price,
                tiers: [{ minQuantity: 2, price: product.price * 0.9 }] // Default tier
            }
        ]);
        setPickerOpen(false);
        setSearchQuery("");
    };

    const handleRemoveProduct = (productId: string) => {
        setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
    };

    const handleUpdateTier = (productId: string, tierIndex: number, field: keyof ProductTier, value: number) => {
        setSelectedProducts(selectedProducts.map(p => {
            if (p.productId === productId) {
                const newTiers = [...p.tiers];
                newTiers[tierIndex] = { ...newTiers[tierIndex], [field]: value };
                return { ...p, tiers: newTiers };
            }
            return p;
        }));
    };

    const handleAddTier = (productId: string) => {
        setSelectedProducts(selectedProducts.map(p => {
            if (p.productId === productId) {
                const lastTier = p.tiers[p.tiers.length - 1];
                return {
                    ...p,
                    tiers: [...p.tiers, {
                        minQuantity: lastTier ? lastTier.minQuantity + 5 : 2,
                        price: lastTier ? lastTier.price * 0.9 : p.productPrice * 0.9
                    }]
                };
            }
            return p;
        }));
    };

    const handleRemoveTier = (productId: string, tierIndex: number) => {
        setSelectedProducts(selectedProducts.map(p => {
            if (p.productId === productId) {
                return { ...p, tiers: p.tiers.filter((_, idx) => idx !== tierIndex) };
            }
            return p;
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (!name || !startDate || !endDate) {
            setError("Vui lòng nhập đầy đủ thông tin bắt buộc");
            setLoading(false);
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            setError("Ngày kết thúc phải sau ngày bắt đầu");
            setLoading(false);
            return;
        }

        if (selectedProducts.length === 0) {
            setError("Vui lòng chọn ít nhất một sản phẩm");
            setLoading(false);
            return;
        }

        const payload = {
            name,
            description,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            isActive,
            products: selectedProducts
        };

        let result;
        if (initialData?.id) {
            result = await updatePromotion(initialData.id, payload);
        } else {
            result = await createPromotion(payload);
        }

        if (result.success) {
            router.push("/promotions");
            router.refresh();
        } else {
            setError(result.error || "Có lỗi xảy ra");
        }
        setLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto pb-10">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">{initialData ? "Sửa Chương Trình" : "Tạo Khuyến Mãi"}</h1>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Hủy</Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <span className="animate-spin mr-2">⏳</span>}
                        Lưu chương trình
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
                    {error}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="name">Tên chương trình <span className="text-red-500">*</span></Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ví dụ: Giảm giá mùa hè"
                        required
                    />
                </div>
                <div className="flex items-end pb-2">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="isActive" className="cursor-pointer">Kích hoạt ngay</Label>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="startDate">Ngày bắt đầu <span className="text-red-500">*</span></Label>
                    <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="endDate">Ngày kết thúc <span className="text-red-500">*</span></Label>
                    <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                    />
                </div>

                <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Mô tả</Label>
                    <Input
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ghi chú thêm về chương trình..."
                    />
                </div>
            </div>

            <div className="space-y-4 pt-6 border-t">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Sản phẩm áp dụng</h2>

                    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Thêm sản phẩm</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Chọn sản phẩm</DialogTitle>
                            </DialogHeader>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm tên sản phẩm..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto mt-2 border rounded-md">
                                {filteredProducts.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500">Không tìm thấy sản phẩm</div>
                                ) : (
                                    <div className="divide-y">
                                        {filteredProducts.map((product) => (
                                            <div
                                                key={product.id}
                                                className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                                                onClick={() => handleAddProduct(product)}
                                            >
                                                <span>{product.name}</span>
                                                <span className="text-sm font-medium">{product.price.toLocaleString()}đ</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {selectedProducts.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed text-gray-500">
                        Chưa có sản phẩm nào được chọn
                    </div>
                ) : (
                    <div className="space-y-6">
                        {selectedProducts.map((sp, idx) => (
                            <div key={sp.productId} className="border rounded-lg p-4 bg-white shadow-sm space-y-4">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <div className="font-medium text-lg text-blue-700">
                                        {idx + 1}. {sp.productName}
                                        <span className="ml-2 text-sm text-gray-500 font-normal">
                                            (Giá gốc: {sp.productPrice.toLocaleString()}đ)
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleRemoveProduct(sp.productId)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/50">
                                            <TableHead className="w-1/3">Số lượng tối thiểu (Mua &ge;)</TableHead>
                                            <TableHead className="w-1/3">Giá ưu đãi (đ)</TableHead>
                                            <TableHead className="w-1/3 text-right">Thao tác</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sp.tiers.map((tier, tIdx) => (
                                            <TableRow key={tIdx}>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        value={tier.minQuantity}
                                                        onChange={(e) => handleUpdateTier(sp.productId, tIdx, "minQuantity", parseInt(e.target.value) || 0)}
                                                        className="w-24"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={tier.price}
                                                        onChange={(e) => handleUpdateTier(sp.productId, tIdx, "price", parseFloat(e.target.value) || 0)}
                                                        className="w-32"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => handleRemoveTier(sp.productId, tIdx)}>
                                                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="flex justify-center">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddTier(sp.productId)}
                                        className="text-xs border-dashed"
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> Thêm mức giá
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </form>
    );
}
