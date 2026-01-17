"use client";

import { useState } from "react";
import { Order, Supplier, OrderItem, Product } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Eye, Truck, Package, CreditCard, Check, X, Clock } from "lucide-react";
import { paySupplierDebt, updatePurchaseOrderStatus } from "./actions";

type PurchaseOrderWithRelations = Order & {
    supplier: Supplier | null;
    items: (OrderItem & { product: Product })[];
};

interface PurchaseHistoryProps {
    initialOrders: PurchaseOrderWithRelations[];
    suppliers: Supplier[];
}

export default function PurchaseHistory({ initialOrders, suppliers }: PurchaseHistoryProps) {
    const [orders, setOrders] = useState(initialOrders);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterSupplier, setFilterSupplier] = useState<string>("ALL");
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderWithRelations | null>(null);

    // Pay debt dialog
    const [payDebtOpen, setPayDebtOpen] = useState(false);
    const [payDebtSupplier, setPayDebtSupplier] = useState<Supplier | null>(null);
    const [payDebtAmount, setPayDebtAmount] = useState("");

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.supplier?.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSupplier = filterSupplier === "ALL" || order.supplierId === filterSupplier;
        return matchesSearch && matchesSupplier;
    });

    // Calculate totals
    const totalPurchases = orders.reduce((sum, o) => sum + o.total, 0);
    const totalDebt = suppliers.reduce((sum, s) => sum + s.debt, 0);

    const handlePayDebt = async () => {
        if (!payDebtSupplier || !payDebtAmount) return;

        const amount = parseFloat(payDebtAmount);
        if (amount <= 0) {
            alert("Số tiền phải lớn hơn 0");
            return;
        }

        const result = await paySupplierDebt({
            supplierId: payDebtSupplier.id,
            amount: amount,
            paymentMethod: "CASH",
            date: new Date()
        });

        if (result.success) {
            alert("Trả nợ NCC thành công!");
            setPayDebtOpen(false);
            setPayDebtAmount("");
            // Refresh would be needed here - for now just close dialog
            window.location.reload();
        } else {
            alert("Lỗi: " + result.error);
        }
    };

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        const res = await updatePurchaseOrderStatus(orderId, newStatus);
        if (res.success) {
            // Optimistic update
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        } else {
            alert("Lỗi cập nhật trạng thái: " + res.error);
        }
    };

    return (
        <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tổng đơn mua</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{orders.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tổng tiền mua</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-purple-600">
                            {new Intl.NumberFormat('vi-VN').format(totalPurchases)}đ
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tổng nợ NCC</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-red-600">
                            {new Intl.NumberFormat('vi-VN').format(totalDebt)}đ
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Số NCC</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{suppliers.length}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm theo mã đơn, NCC..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <select
                    className="border rounded-md px-3 py-2 text-sm"
                    value={filterSupplier}
                    onChange={(e) => setFilterSupplier(e.target.value)}
                >
                    <option value="ALL">Tất cả NCC</option>
                    {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            </div>

            {/* Suppliers with Debt */}
            {suppliers.filter(s => s.debt > 0).length > 0 && (
                <Card className="border-red-200 bg-red-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            NCC có công nợ
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {suppliers.filter(s => s.debt > 0).map(s => (
                                <div
                                    key={s.id}
                                    className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border cursor-pointer hover:border-red-400"
                                    onClick={() => { setPayDebtSupplier(s); setPayDebtOpen(true); }}
                                >
                                    <Truck className="h-4 w-4 text-purple-600" />
                                    <span className="font-medium">{s.name}</span>
                                    <Badge variant="destructive">
                                        {new Intl.NumberFormat('vi-VN').format(s.debt)}đ
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Orders Table */}
            <Card>
                <CardContent className="p-0">
                    {filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Package className="h-12 w-12 mb-4 opacity-50" />
                            <p>Chưa có đơn mua hàng nào</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã đơn</TableHead>
                                    <TableHead>Nhà cung cấp</TableHead>
                                    <TableHead className="text-right">Tổng tiền</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead>Ngày tạo</TableHead>
                                    <TableHead className="w-[80px]">Xem</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.map(order => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.code}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Truck className="h-4 w-4 text-purple-600" />
                                                {order.supplier?.name || "Không xác định"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {new Intl.NumberFormat('vi-VN').format(order.total)}đ
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        order.status === "COMPLETED"
                                                            ? "bg-green-50 text-green-700 border-green-200"
                                                            : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                                    }
                                                >
                                                    {order.status === "COMPLETED" ? "Hoàn thành" : "Chưa hoàn thành"}
                                                </Badge>
                                                {order.status !== "COMPLETED" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        title="Đánh dấu hoàn thành"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm("Xác nhận đơn hàng đã hoàn thành?")) {
                                                                handleUpdateStatus(order.id, "COMPLETED");
                                                            }
                                                        }}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Order Detail Dialog */}
            <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
                <DialogContent className="max-w-md md:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Chi tiết đơn mua #{selectedOrder?.code}</DialogTitle>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Nhà cung cấp:</span>
                                    <p className="font-medium">{selectedOrder.supplier?.name || "Không xác định"}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Ngày tạo:</span>
                                    <p className="font-medium">
                                        {new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}
                                    </p>
                                </div>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Sản phẩm</TableHead>
                                        <TableHead className="text-right">Giá nhập</TableHead>
                                        <TableHead className="text-right">SL</TableHead>
                                        <TableHead className="text-right">Thành tiền</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedOrder.items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <p className="font-medium">{item.product.name}</p>
                                                <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {new Intl.NumberFormat('vi-VN').format(item.price)}đ
                                            </TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right font-bold">
                                                {new Intl.NumberFormat('vi-VN').format(item.price * item.quantity)}đ
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="flex justify-between items-center pt-4 border-t">
                                <span className="text-lg font-semibold">Tổng cộng:</span>
                                <span className="text-xl font-bold text-purple-600">
                                    {new Intl.NumberFormat('vi-VN').format(selectedOrder.total)}đ
                                </span>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Pay Debt Dialog */}
            <Dialog open={payDebtOpen} onOpenChange={setPayDebtOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Trả nợ nhà cung cấp</DialogTitle>
                    </DialogHeader>
                    {payDebtSupplier && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="font-medium">{payDebtSupplier.name}</p>
                                <p className="text-sm text-muted-foreground">SĐT: {payDebtSupplier.phone || "---"}</p>
                                <p className="text-lg font-bold text-red-600 mt-2">
                                    Công nợ: {new Intl.NumberFormat('vi-VN').format(payDebtSupplier.debt)}đ
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Số tiền trả</Label>
                                <Input
                                    type="number"
                                    placeholder="Nhập số tiền..."
                                    value={payDebtAmount}
                                    onChange={(e) => setPayDebtAmount(e.target.value)}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPayDebtAmount(payDebtSupplier.debt.toString())}
                                >
                                    Trả hết
                                </Button>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayDebtOpen(false)}>Hủy</Button>
                        <Button onClick={handlePayDebt}>Xác nhận trả nợ</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
