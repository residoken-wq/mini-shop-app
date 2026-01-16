"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Package, CheckCircle, AlertTriangle, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPendingOrdersSummary, updateOrderStatus } from "./actions";

type AggregatedProduct = {
    productId: string;
    name: string;
    sku: string;
    unit: string;
    totalRequired: number;
    currentStock: number;
    isEnough: boolean;
    shortage: number;
};

type PendingOrder = {
    id: string;
    code: string;
    status: string;
    customerName: string;
    recipientName: string | null;
    itemCount: number;
    total: number;
    createdAt: Date;
    allItemsAvailable: boolean;
    items: {
        productName: string;
        sku: string;
        quantity: number;
        unit: string;
        currentStock: number;
    }[];
};

interface PendingOrdersPreparationProps {
    onOrderUpdated: () => void;
}

export function PendingOrdersPreparation({ onOrderUpdated }: PendingOrdersPreparationProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [aggregatedProducts, setAggregatedProducts] = useState<AggregatedProduct[]>([]);
    const [orders, setOrders] = useState<PendingOrder[]>([]);
    const [totalOrders, setTotalOrders] = useState(0);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [confirmingOrder, setConfirmingOrder] = useState<string | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        const result = await getPendingOrdersSummary();
        if (result.success && result.aggregatedProducts && result.orders) {
            setAggregatedProducts(result.aggregatedProducts);
            setOrders(result.orders as PendingOrder[]);
            setTotalOrders(result.totalOrders || 0);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleConfirmReady = async (orderId: string) => {
        setConfirmingOrder(orderId);
        const result = await updateOrderStatus(orderId, "READY");
        if (result.success) {
            await loadData();
            onOrderUpdated();
        } else {
            alert("Lỗi cập nhật trạng thái đơn hàng");
        }
        setConfirmingOrder(null);
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (totalOrders === 0) {
        return (
            <Card className="bg-green-50 border-green-200">
                <CardContent className="py-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-green-700 font-medium">Không có đơn hàng nào cần chuẩn bị</p>
                    <p className="text-green-600 text-sm mt-1">Tất cả đơn hàng đã được xử lý</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-600" />
                    <h2 className="text-lg font-semibold">Chuẩn bị hàng</h2>
                    <Badge variant="secondary">{totalOrders} đơn chờ</Badge>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                    Làm mới
                </Button>
            </div>

            {/* Aggregated Products Table */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        📦 Tổng hợp sản phẩm cần chuẩn bị
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sản phẩm</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead className="text-right">Cần giao</TableHead>
                                <TableHead className="text-right">Tồn kho</TableHead>
                                <TableHead>Trạng thái</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {aggregatedProducts.map(product => (
                                <TableRow key={product.productId}>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                                    <TableCell className="text-right font-bold">
                                        {product.totalRequired} {product.unit}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn(
                                            "font-medium",
                                            product.isEnough ? "text-green-600" : "text-red-600"
                                        )}>
                                            {product.currentStock} {product.unit}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {product.isEnough ? (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Đủ hàng
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                Thiếu {product.shortage} {product.unit}
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Orders List */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        📋 Đơn hàng cần xử lý
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {orders.map(order => (
                            <div key={order.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => setExpandedOrder(
                                                expandedOrder === order.id ? null : order.id
                                            )}
                                        >
                                            {expandedOrder === order.id ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{order.code}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {order.status === "PENDING" ? "Chờ xử lý" : "Đang xử lý"}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {order.recipientName || order.customerName} • {order.itemCount} sản phẩm • {formatCurrency(order.total)}đ
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {order.allItemsAvailable ? (
                                            <Badge className="bg-green-100 text-green-700">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Đủ hàng
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-orange-100 text-orange-700">
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                Chưa đủ
                                            </Badge>
                                        )}
                                        <Button
                                            size="sm"
                                            disabled={!order.allItemsAvailable || confirmingOrder === order.id}
                                            onClick={() => handleConfirmReady(order.id)}
                                            className={cn(
                                                order.allItemsAvailable
                                                    ? "bg-purple-600 hover:bg-purple-700"
                                                    : "bg-gray-300"
                                            )}
                                        >
                                            {confirmingOrder === order.id ? (
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    Đủ hàng
                                                    <ChevronRight className="h-4 w-4 ml-1" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Expanded Items */}
                                {expandedOrder === order.id && (
                                    <div className="mt-3 ml-11 bg-gray-50 rounded-lg p-3">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-muted-foreground">
                                                    <th className="pb-2">Sản phẩm</th>
                                                    <th className="pb-2 text-right">Cần</th>
                                                    <th className="pb-2 text-right">Kho</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {order.items.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="py-1">{item.productName}</td>
                                                        <td className="py-1 text-right font-medium">
                                                            {item.quantity} {item.unit}
                                                        </td>
                                                        <td className={cn(
                                                            "py-1 text-right font-medium",
                                                            item.currentStock >= item.quantity
                                                                ? "text-green-600"
                                                                : "text-red-600"
                                                        )}>
                                                            {item.currentStock} {item.unit}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
