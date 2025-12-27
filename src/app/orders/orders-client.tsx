"use client";

import { useState } from "react";
import { Order, Customer, Supplier, OrderItem, Product } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Eye, Trash2, Package, ShoppingCart, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteOrder } from "./actions";

type OrderWithRelations = Order & {
    customer: Customer | null;
    supplier: Supplier | null;
    items: (OrderItem & { product: Product })[];
};

interface OrdersClientProps {
    initialOrders: OrderWithRelations[];
}

export function OrdersClient({ initialOrders }: OrdersClientProps) {
    const [orders, setOrders] = useState(initialOrders);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<"ALL" | "SALE" | "PURCHASE">("ALL");
    const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.supplier?.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "ALL" || order.type === filterType;
        return matchesSearch && matchesType;
    });

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa đơn hàng này?")) return;
        const result = await deleteOrder(id);
        if (result.success) {
            setOrders(prev => prev.filter(o => o.id !== id));
        } else {
            alert("Lỗi xóa đơn hàng");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Chờ xử lý</Badge>;
            case "COMPLETED":
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Hoàn thành</Badge>;
            case "CANCELLED":
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Đã hủy</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getTypeBadge = (type: string) => {
        return type === "SALE" ? (
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                <ShoppingCart className="h-3 w-3 mr-1" />
                Bán
            </Badge>
        ) : (
            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                <Truck className="h-3 w-3 mr-1" />
                Mua
            </Badge>
        );
    };

    return (
        <div className="space-y-4">
            {/* Search & Filter */}
            <div className="flex gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm theo mã đơn, khách hàng..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant={filterType === "ALL" ? "default" : "outline"} onClick={() => setFilterType("ALL")}>
                        Tất cả
                    </Button>
                    <Button variant={filterType === "SALE" ? "default" : "outline"} onClick={() => setFilterType("SALE")}>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Bán hàng
                    </Button>
                    <Button variant={filterType === "PURCHASE" ? "default" : "outline"} onClick={() => setFilterType("PURCHASE")}>
                        <Truck className="h-4 w-4 mr-2" />
                        Mua hàng
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tổng đơn</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{orders.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Đơn bán</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-blue-600">{orders.filter(o => o.type === "SALE").length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Đơn mua</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-purple-600">{orders.filter(o => o.type === "PURCHASE").length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tổng doanh thu</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-green-600">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                orders.filter(o => o.type === "SALE" && o.status === "COMPLETED").reduce((sum, o) => sum + o.total, 0)
                            )}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Orders Table */}
            <Card>
                <CardContent className="p-0">
                    {filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Package className="h-12 w-12 mb-4 opacity-50" />
                            <p>Không có đơn hàng nào</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã đơn</TableHead>
                                    <TableHead>Loại</TableHead>
                                    <TableHead>Khách/NCC</TableHead>
                                    <TableHead className="text-right">Tổng tiền</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead>Ngày tạo</TableHead>
                                    <TableHead className="w-[100px]">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.map(order => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.code}</TableCell>
                                        <TableCell>{getTypeBadge(order.type)}</TableCell>
                                        <TableCell>
                                            {order.type === "SALE"
                                                ? (order.customer?.name || "Khách lẻ")
                                                : (order.supplier?.name || "-")}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {new Intl.NumberFormat('vi-VN').format(order.total)} đ
                                        </TableCell>
                                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(order.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Chi tiết đơn hàng #{selectedOrder?.code}</DialogTitle>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Loại</p>
                                    <p className="font-medium">{selectedOrder.type === "SALE" ? "Bán hàng" : "Mua hàng"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Trạng thái</p>
                                    <p>{getStatusBadge(selectedOrder.status)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">{selectedOrder.type === "SALE" ? "Khách hàng" : "Nhà cung cấp"}</p>
                                    <p className="font-medium">
                                        {selectedOrder.type === "SALE"
                                            ? (selectedOrder.customer?.name || "Khách lẻ")
                                            : (selectedOrder.supplier?.name || "-")}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Ngày tạo</p>
                                    <p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleString('vi-VN')}</p>
                                </div>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Sản phẩm</TableHead>
                                        <TableHead className="text-center">SL</TableHead>
                                        <TableHead className="text-right">Đơn giá</TableHead>
                                        <TableHead className="text-right">Thành tiền</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedOrder.items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.product.name}</TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right">{new Intl.NumberFormat('vi-VN').format(item.price)}</TableCell>
                                            <TableCell className="text-right font-medium">{new Intl.NumberFormat('vi-VN').format(item.price * item.quantity)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="flex justify-end text-lg font-bold">
                                <span>Tổng: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedOrder.total)}</span>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
