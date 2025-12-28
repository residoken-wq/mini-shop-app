"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Trash2,
    Edit,
    Copy,
    Percent,
    ArrowLeft,
    CheckCircle,
    XCircle,
    Calculator
} from "lucide-react";
import Link from "next/link";
import {
    createWholesalePrice,
    updateWholesalePrice,
    deleteWholesalePrice,
    applyProfitMargin,
    applyProfitMarginAll,
    copyPricingTable
} from "./actions";

interface Product {
    id: string;
    name: string;
    sku: string;
    cost: number;
    price: number;
    unit: string;
    hasWholesalePrice?: boolean;
}

interface WholesalePrice {
    id: string;
    customerId: string;
    productId: string;
    price: number;
    validFrom: Date;
    validTo: Date;
    isExpired: boolean;
    isActive: boolean;
    product: Product;
}

interface WholesaleCustomer {
    id: string;
    name: string;
    phone: string | null;
}

interface Props {
    customerId: string;
    customerName: string;
    wholesalePrices: WholesalePrice[];
    allProducts: Product[];
    wholesaleCustomers: WholesaleCustomer[];
}

export function PricingClient({
    customerId,
    customerName,
    wholesalePrices,
    allProducts,
    wholesaleCustomers
}: Props) {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isApplyAllOpen, setIsApplyAllOpen] = useState(false);
    const [isCopyOpen, setIsCopyOpen] = useState(false);
    const [editingPrice, setEditingPrice] = useState<WholesalePrice | null>(null);

    // Form states
    const [selectedProductId, setSelectedProductId] = useState("");
    const [price, setPrice] = useState("");
    const [marginPercent, setMarginPercent] = useState("20");
    const [validTo, setValidTo] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() + 3);
        return date.toISOString().split('T')[0];
    });
    const [copyToCustomerId, setCopyToCustomerId] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('vi-VN');
    };

    const productsWithoutPrice = allProducts.filter(p => !p.hasWholesalePrice);
    const selectedProduct = allProducts.find(p => p.id === selectedProductId);

    // Calculate price from margin
    const calculatePriceFromMargin = (cost: number, margin: number) => {
        return Math.round(cost * (1 + margin / 100));
    };

    const handleAdd = async () => {
        if (!selectedProductId || !price || !validTo) return;
        setIsLoading(true);
        try {
            await createWholesalePrice({
                customerId,
                productId: selectedProductId,
                price: parseFloat(price),
                validTo: new Date(validTo)
            });
            setIsAddOpen(false);
            setSelectedProductId("");
            setPrice("");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = async () => {
        if (!editingPrice || !price) return;
        setIsLoading(true);
        try {
            await updateWholesalePrice(editingPrice.id, {
                price: parseFloat(price),
                validTo: new Date(validTo)
            });
            setIsEditOpen(false);
            setEditingPrice(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Xác nhận xóa giá này?")) return;
        await deleteWholesalePrice(id);
    };

    const handleApplyMargin = async (productId: string, cost: number) => {
        const margin = parseFloat(marginPercent);
        if (isNaN(margin)) return;
        setIsLoading(true);
        try {
            await applyProfitMargin(customerId, productId, margin, new Date(validTo));
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyAllMargin = async () => {
        const margin = parseFloat(marginPercent);
        if (isNaN(margin)) return;
        setIsLoading(true);
        try {
            await applyProfitMarginAll(customerId, margin, new Date(validTo));
            setIsApplyAllOpen(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!copyToCustomerId) return;
        setIsLoading(true);
        try {
            const result = await copyPricingTable(customerId, copyToCustomerId);
            if (result.success) {
                alert(`Đã copy ${result.count} giá sang khách hàng mới`);
                setIsCopyOpen(false);
            } else {
                alert(result.error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const openEdit = (wp: WholesalePrice) => {
        setEditingPrice(wp);
        setPrice(wp.price.toString());
        setValidTo(new Date(wp.validTo).toISOString().split('T')[0]);
        setIsEditOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-wrap gap-2">
                <Link href="/customers">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Quay lại
                    </Button>
                </Link>

                {/* Add Price Button */}
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Thêm giá
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Thêm giá sản phẩm</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label>Sản phẩm</Label>
                                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn sản phẩm" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {productsWithoutPrice.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} ({p.sku}) - Giá nhập: {formatCurrency(p.cost)}đ
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedProduct && (
                                <div className="p-3 bg-muted rounded-lg text-sm">
                                    <p>Giá nhập: <strong>{formatCurrency(selectedProduct.cost)}đ</strong></p>
                                    <p>Giá bán lẻ: <strong>{formatCurrency(selectedProduct.price)}đ</strong></p>
                                </div>
                            )}
                            <div>
                                <Label>Đơn giá bán sỉ</Label>
                                <Input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="Nhập đơn giá"
                                />
                            </div>
                            <div>
                                <Label>Hoặc tính từ % lợi nhuận</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        value={marginPercent}
                                        onChange={(e) => setMarginPercent(e.target.value)}
                                        placeholder="%"
                                        className="w-24"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (selectedProduct) {
                                                const calculated = calculatePriceFromMargin(
                                                    selectedProduct.cost,
                                                    parseFloat(marginPercent)
                                                );
                                                setPrice(calculated.toString());
                                            }
                                        }}
                                        disabled={!selectedProduct}
                                    >
                                        <Calculator className="mr-2 h-4 w-4" />
                                        Tính
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Label>Hiệu lực đến</Label>
                                <Input
                                    type="date"
                                    value={validTo}
                                    onChange={(e) => setValidTo(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleAdd} disabled={isLoading} className="w-full">
                                {isLoading ? "Đang xử lý..." : "Thêm"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Apply All Margin Button */}
                <Dialog open={isApplyAllOpen} onOpenChange={setIsApplyAllOpen}>
                    <DialogTrigger asChild>
                        <Button variant="secondary">
                            <Percent className="mr-2 h-4 w-4" />
                            Apply All
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Áp dụng % lợi nhuận cho tất cả</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Tự động tính giá bán = Giá nhập × (1 + % lợi nhuận) cho tất cả sản phẩm
                            </p>
                            <div>
                                <Label>% Lợi nhuận mong muốn</Label>
                                <Input
                                    type="number"
                                    value={marginPercent}
                                    onChange={(e) => setMarginPercent(e.target.value)}
                                    placeholder="VD: 20"
                                />
                            </div>
                            <div>
                                <Label>Hiệu lực đến</Label>
                                <Input
                                    type="date"
                                    value={validTo}
                                    onChange={(e) => setValidTo(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleApplyAllMargin} disabled={isLoading} className="w-full">
                                {isLoading ? "Đang xử lý..." : `Áp dụng ${marginPercent}% cho ${allProducts.length} sản phẩm`}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Copy Pricing Table Button */}
                {wholesaleCustomers.length > 0 && (
                    <Dialog open={isCopyOpen} onOpenChange={setIsCopyOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Copy className="mr-2 h-4 w-4" />
                                Copy bảng giá
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Copy bảng giá sang khách hàng khác</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Sao chép toàn bộ bảng giá của <strong>{customerName}</strong> sang khách hàng sỉ khác.
                                    Bảng giá cũ của khách đích sẽ bị thay thế.
                                </p>
                                <div>
                                    <Label>Khách hàng đích</Label>
                                    <Select value={copyToCustomerId} onValueChange={setCopyToCustomerId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn khách hàng" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {wholesaleCustomers.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name} {c.phone && `(${c.phone})`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleCopy} disabled={isLoading || !copyToCustomerId} className="w-full">
                                    {isLoading ? "Đang xử lý..." : "Copy bảng giá"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Pricing Table */}
            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sản phẩm</TableHead>
                            <TableHead className="text-right">Giá nhập</TableHead>
                            <TableHead className="text-right">Giá sỉ</TableHead>
                            <TableHead className="text-right">% Lợi nhuận</TableHead>
                            <TableHead>Hiệu lực</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {wholesalePrices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                    Chưa có giá nào. Bấm "Thêm giá" hoặc "Apply All" để bắt đầu.
                                </TableCell>
                            </TableRow>
                        ) : (
                            wholesalePrices.map((wp) => {
                                const margin = wp.product.cost > 0
                                    ? ((wp.price - wp.product.cost) / wp.product.cost * 100).toFixed(1)
                                    : "N/A";
                                return (
                                    <TableRow key={wp.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{wp.product.name}</div>
                                                <div className="text-sm text-muted-foreground">{wp.product.sku}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(wp.product.cost)}đ
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {formatCurrency(wp.price)}đ
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline">{margin}%</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {formatDate(wp.validFrom)} - {formatDate(wp.validTo)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {wp.isActive ? (
                                                <Badge className="bg-green-100 text-green-800">
                                                    <CheckCircle className="mr-1 h-3 w-3" />
                                                    Active
                                                </Badge>
                                            ) : wp.isExpired ? (
                                                <Badge variant="destructive">
                                                    <XCircle className="mr-1 h-3 w-3" />
                                                    Hết hạn
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">Chưa hiệu lực</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleApplyMargin(wp.productId, wp.product.cost)}
                                                    title={`Áp dụng ${marginPercent}% lợi nhuận`}
                                                >
                                                    <Percent className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEdit(wp)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(wp.id)}
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Sửa giá sản phẩm</DialogTitle>
                    </DialogHeader>
                    {editingPrice && (
                        <div className="space-y-4">
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="font-medium">{editingPrice.product.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    Giá nhập: {formatCurrency(editingPrice.product.cost)}đ
                                </p>
                            </div>
                            <div>
                                <Label>Đơn giá bán sỉ</Label>
                                <Input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Tính từ % lợi nhuận</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        value={marginPercent}
                                        onChange={(e) => setMarginPercent(e.target.value)}
                                        placeholder="%"
                                        className="w-24"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            const calculated = calculatePriceFromMargin(
                                                editingPrice.product.cost,
                                                parseFloat(marginPercent)
                                            );
                                            setPrice(calculated.toString());
                                        }}
                                    >
                                        <Calculator className="mr-2 h-4 w-4" />
                                        Tính
                                    </Button>
                                </div>
                            </div>
                            <div>
                                <Label>Hiệu lực đến</Label>
                                <Input
                                    type="date"
                                    value={validTo}
                                    onChange={(e) => setValidTo(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleEdit} disabled={isLoading} className="w-full">
                                {isLoading ? "Đang xử lý..." : "Lưu"}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
