"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Package, CheckCircle, AlertTriangle, ChevronRight, ChevronDown, ChevronUp, Box } from "lucide-react";
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
    const [activeTab, setActiveTab] = useState<"products" | "orders">("orders");

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
        <div className="space-y-3">
            {/* Mobile Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-600" />
                    <h2 className="text-base sm:text-lg font-semibold">Chuẩn bị hàng</h2>
                    <Badge variant="secondary" className="text-xs">{totalOrders} đơn</Badge>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="h-8 px-2 sm:px-3">
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    <span className="hidden sm:inline ml-2">Làm mới</span>
                </Button>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex gap-2 md:hidden">
                <Button
                    variant={activeTab === "orders" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("orders")}
                    className="flex-1 h-10"
                >
                    📋 Đơn hàng ({totalOrders})
                </Button>
                <Button
                    variant={activeTab === "products" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("products")}
                    className="flex-1 h-10"
                >
                    📦 Sản phẩm ({aggregatedProducts.length})
                </Button>
            </div>

            {/* Mobile: Orders List (Primary View) */}
            <div className={cn("md:hidden", activeTab !== "orders" && "hidden")}>
                <div className="space-y-3">
                    {orders.map(order => (
                        <Card key={order.id} className={cn(
                            "overflow-hidden",
                            order.allItemsAvailable ? "border-green-200" : "border-orange-200"
                        )}>
                            {/* Order Header - Clickable */}
                            <div
                                className="p-3 cursor-pointer active:bg-gray-50"
                                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-purple-700">{order.code}</span>
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                {order.status === "PENDING" ? "Chờ" : "Đang xử lý"}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                                            {order.recipientName || order.customerName}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                            <span>{order.itemCount} SP</span>
                                            <span className="font-medium text-foreground">{formatCurrency(order.total)}đ</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {order.allItemsAvailable ? (
                                            <Badge className="bg-green-100 text-green-700 text-xs">
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Đủ
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-orange-100 text-orange-700 text-xs">
                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                Thiếu
                                            </Badge>
                                        )}
                                        {expandedOrder === order.id ? (
                                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Items */}
                            {expandedOrder === order.id && (
                                <div className="border-t bg-gray-50">
                                    <div className="p-3 space-y-2">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{item.productName}</p>
                                                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm">
                                                    <div className="text-right">
                                                        <p className="font-bold">{item.quantity}</p>
                                                        <p className="text-[10px] text-muted-foreground">cần</p>
                                                    </div>
                                                    <div className={cn(
                                                        "text-right min-w-[50px]",
                                                        item.currentStock >= item.quantity ? "text-green-600" : "text-red-600"
                                                    )}>
                                                        <p className="font-bold">{item.currentStock}</p>
                                                        <p className="text-[10px]">kho</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Button - Full Width */}
                                    <div className="p-3 pt-0">
                                        <Button
                                            className={cn(
                                                "w-full h-12 text-base font-semibold",
                                                order.allItemsAvailable
                                                    ? "bg-purple-600 hover:bg-purple-700"
                                                    : "bg-gray-300 text-gray-500"
                                            )}
                                            disabled={!order.allItemsAvailable || confirmingOrder === order.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleConfirmReady(order.id);
                                            }}
                                        >
                                            {confirmingOrder === order.id ? (
                                                <RefreshCw className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <>
                                                    {order.allItemsAvailable ? "✓ Xác nhận đủ hàng" : "Chưa đủ hàng"}
                                                    {order.allItemsAvailable && <ChevronRight className="h-5 w-5 ml-2" />}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>

            {/* Mobile: Products List (Secondary View) */}
            <div className={cn("md:hidden", activeTab !== "products" && "hidden")}>
                <div className="space-y-2">
                    {aggregatedProducts.map(product => (
                        <Card key={product.productId} className={cn(
                            "p-3",
                            product.isEnough ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
                        )}>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={cn(
                                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                        product.isEnough ? "bg-green-100" : "bg-red-100"
                                    )}>
                                        <Box className={cn(
                                            "h-5 w-5",
                                            product.isEnough ? "text-green-600" : "text-red-600"
                                        )} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="text-center">
                                        <p className="font-bold text-lg">{product.totalRequired}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase">Cần</p>
                                    </div>
                                    <div className={cn(
                                        "text-center min-w-[50px]",
                                        product.isEnough ? "text-green-600" : "text-red-600"
                                    )}>
                                        <p className="font-bold text-lg">{product.currentStock}</p>
                                        <p className="text-[10px] uppercase">Kho</p>
                                    </div>
                                </div>
                            </div>
                            {!product.isEnough && (
                                <div className="mt-2 pt-2 border-t border-red-200">
                                    <Badge className="bg-red-100 text-red-700 text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Thiếu {product.shortage} {product.unit}
                                    </Badge>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>

            {/* Desktop View - Original Table Layout */}
            <div className="hidden md:block space-y-4">
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
        </div>
    );
}
