"use client";

import { useState, useRef } from "react";
import { Order, Customer, Supplier, OrderItem, Product } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Eye, Trash2, Package, ShoppingCart, Truck, Download, Loader2, ChevronRight, CheckCircle, Clock, XCircle, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteOrder, updateOrderStatus, getOrders } from "./actions";
import { ORDER_STATUSES, OrderStatus, getAllowedNextStatuses } from "./order-constants";
import { OrderReceipt } from "./order-receipt";
import { OrderEditableItems } from "./order-editable-items";
import { PendingOrdersPreparation } from "./pending-orders-preparation";
import { ShippingDialog } from "./shipping-dialog";
import { DeliveryDialog } from "./delivery-dialog";
import html2canvas from "html2canvas";

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
    const [isPrinting, setIsPrinting] = useState(false);
    const [viewMode, setViewMode] = useState<"receipt" | "edit">("receipt");
    const [showPreparation, setShowPreparation] = useState(false);
    const [showShippingDialog, setShowShippingDialog] = useState(false);
    const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
    const receiptRef = useRef<HTMLDivElement>(null);

    const refreshOrders = async () => {
        const newOrders = await getOrders();
        setOrders(newOrders);
        if (selectedOrder) {
            const updated = newOrders.find(o => o.id === selectedOrder.id);
            if (updated) setSelectedOrder(updated);
        }
    };

    const handlePrintOrder = async () => {
        if (!receiptRef.current || !selectedOrder) return;
        setIsPrinting(true);
        try {
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2,
                backgroundColor: "#ffffff",
                useCORS: true,
            });
            const link = document.createElement("a");
            link.download = `HoaDon_${selectedOrder.code}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (error) {
            console.error("Failed to generate image:", error);
            alert("Lỗi khi tạo hình ảnh đơn hàng");
        } finally {
            setIsPrinting(false);
        }
    };

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
        const statusInfo = ORDER_STATUSES[status as OrderStatus];
        if (!statusInfo) return <Badge variant="outline">{status}</Badge>;

        const colorClasses: Record<string, string> = {
            yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
            blue: "bg-blue-50 text-blue-700 border-blue-200",
            purple: "bg-purple-50 text-purple-700 border-purple-200",
            orange: "bg-orange-50 text-orange-700 border-orange-200",
            green: "bg-green-50 text-green-700 border-green-200",
            red: "bg-red-50 text-red-700 border-red-200",
        };

        const icons: Record<string, React.ReactNode> = {
            yellow: <Clock className="h-3 w-3 mr-1" />,
            blue: <Loader2 className="h-3 w-3 mr-1" />,
            purple: <Package className="h-3 w-3 mr-1" />,
            orange: <Truck className="h-3 w-3 mr-1" />,
            green: <CheckCircle className="h-3 w-3 mr-1" />,
            red: <XCircle className="h-3 w-3 mr-1" />,
        };

        return (
            <Badge variant="outline" className={colorClasses[statusInfo.color]}>
                {icons[statusInfo.color]}
                {statusInfo.label}
            </Badge>
        );
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
                    <Button
                        variant={showPreparation ? "default" : "outline"}
                        onClick={() => setShowPreparation(!showPreparation)}
                        className={showPreparation ? "bg-purple-600 hover:bg-purple-700" : ""}
                    >
                        <Package className="h-4 w-4 mr-2" />
                        Chuẩn bị hàng
                    </Button>
                </div>
            </div>

            {/* Pending Orders Preparation Section */}
            {showPreparation && (
                <PendingOrdersPreparation onOrderUpdated={refreshOrders} />
            )}

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
                <DialogContent className="max-w-md md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="shrink-0">
                        <DialogTitle className="flex items-center justify-between pr-8">
                            <span>Chi tiết đơn hàng #{selectedOrder?.code}</span>
                            {selectedOrder && getStatusBadge(selectedOrder.status)}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="flex-1 overflow-y-auto space-y-4">
                            {/* Status Progress - Only for SALE orders */}
                            {selectedOrder.type === "SALE" && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm font-medium text-gray-600 mb-3">Tiến trình xử lý</p>
                                    <div className="flex items-center justify-between">
                                        {(["PENDING", "PROCESSING", "READY", "SHIPPING", "COMPLETED"] as const).map((status, idx) => {
                                            const statusInfo = ORDER_STATUSES[status];
                                            const currentStep = ORDER_STATUSES[selectedOrder.status as OrderStatus]?.step || 0;
                                            const isActive = statusInfo.step <= currentStep;
                                            const isCurrent = selectedOrder.status === status;
                                            const isCancelled = selectedOrder.status === "CANCELLED";

                                            return (
                                                <div key={status} className="flex items-center">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                                                        isCancelled ? "bg-gray-200 text-gray-400" :
                                                            isCurrent ? "bg-purple-500 text-white ring-4 ring-purple-200" :
                                                                isActive ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
                                                    )}>
                                                        {isActive && !isCancelled ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                                                    </div>
                                                    {idx < 4 && (
                                                        <div className={cn(
                                                            "w-8 md:w-12 h-1 mx-1",
                                                            !isCancelled && statusInfo.step < currentStep ? "bg-green-500" : "bg-gray-200"
                                                        )} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between mt-2 text-[10px] md:text-xs text-gray-500">
                                        <span>Chờ</span>
                                        <span>Xử lý</span>
                                        <span>Đủ hàng</span>
                                        <span>Giao</span>
                                        <span>Xong</span>
                                    </div>

                                    {/* Status Change Buttons */}
                                    {selectedOrder.status !== "COMPLETED" && selectedOrder.status !== "CANCELLED" && (
                                        <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                                            <span className="text-sm text-gray-500 mr-2">Chuyển sang:</span>
                                            {getAllowedNextStatuses(selectedOrder.status).map(nextStatus => {
                                                // For READY -> SHIPPING, open shipping dialog
                                                if (selectedOrder.status === "READY" && nextStatus === "SHIPPING") {
                                                    return (
                                                        <Button
                                                            key={nextStatus}
                                                            size="sm"
                                                            className="bg-orange-600 hover:bg-orange-700"
                                                            onClick={() => setShowShippingDialog(true)}
                                                        >
                                                            <Truck className="w-4 h-4 mr-1" />
                                                            Giao hàng
                                                            <ChevronRight className="w-4 h-4 ml-1" />
                                                        </Button>
                                                    );
                                                }
                                                // For SHIPPING -> COMPLETED, open delivery dialog
                                                if (selectedOrder.status === "SHIPPING" && nextStatus === "COMPLETED") {
                                                    return (
                                                        <Button
                                                            key={nextStatus}
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700"
                                                            onClick={() => setShowDeliveryDialog(true)}
                                                        >
                                                            <CheckCircle className="w-4 h-4 mr-1" />
                                                            Hoàn tất
                                                            <ChevronRight className="w-4 h-4 ml-1" />
                                                        </Button>
                                                    );
                                                }
                                                // Other status changes - direct update
                                                return (
                                                    <Button
                                                        key={nextStatus}
                                                        size="sm"
                                                        variant={nextStatus === "CANCELLED" ? "destructive" : "default"}
                                                        onClick={async () => {
                                                            const result = await updateOrderStatus(selectedOrder.id, nextStatus);
                                                            if (result.success) {
                                                                setOrders(prev => prev.map(o =>
                                                                    o.id === selectedOrder.id ? { ...o, status: nextStatus } : o
                                                                ));
                                                                setSelectedOrder({ ...selectedOrder, status: nextStatus });
                                                            } else {
                                                                alert("Lỗi cập nhật trạng thái");
                                                            }
                                                        }}
                                                    >
                                                        {ORDER_STATUSES[nextStatus].label}
                                                        <ChevronRight className="w-4 h-4 ml-1" />
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* View Mode Tabs */}
                            <div className="flex gap-2 border-b pb-2">
                                <Button
                                    size="sm"
                                    variant={viewMode === "receipt" ? "default" : "outline"}
                                    onClick={() => setViewMode("receipt")}
                                >
                                    📄 Xem hóa đơn
                                </Button>
                                <Button
                                    size="sm"
                                    variant={viewMode === "edit" ? "default" : "outline"}
                                    onClick={() => setViewMode("edit")}
                                >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Chỉnh sửa
                                </Button>
                            </div>

                            {/* Content based on view mode */}
                            {viewMode === "receipt" ? (
                                <div className="border rounded-lg overflow-hidden shadow-sm">
                                    <OrderReceipt ref={receiptRef} order={selectedOrder} />
                                </div>
                            ) : (
                                <OrderEditableItems
                                    orderId={selectedOrder.id}
                                    items={selectedOrder.items}
                                    discount={(selectedOrder as any).discount || 0}
                                    status={selectedOrder.status}
                                    onUpdate={refreshOrders}
                                />
                            )}
                        </div>
                    )}
                    {/* Print Button Fixed at Bottom */}
                    <div className="shrink-0 pt-4 border-t">
                        <Button
                            onClick={handlePrintOrder}
                            disabled={isPrinting}
                            className="w-full h-12 text-lg"
                        >
                            {isPrinting ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Download className="mr-2 h-5 w-5" />
                            )}
                            {isPrinting ? "Đang tạo hình ảnh..." : "Tải hình ảnh hóa đơn"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Shipping Dialog */}
            {selectedOrder && (
                <ShippingDialog
                    open={showShippingDialog}
                    onClose={() => setShowShippingDialog(false)}
                    order={{
                        id: selectedOrder.id,
                        code: selectedOrder.code,
                        recipientName: selectedOrder.recipientName,
                        recipientPhone: selectedOrder.recipientPhone,
                        deliveryAddress: selectedOrder.deliveryAddress,
                        total: selectedOrder.total
                    }}
                    onSuccess={refreshOrders}
                />
            )}

            {/* Delivery Dialog */}
            {selectedOrder && (
                <DeliveryDialog
                    open={showDeliveryDialog}
                    onClose={() => setShowDeliveryDialog(false)}
                    order={{
                        id: selectedOrder.id,
                        code: selectedOrder.code,
                        total: selectedOrder.total,
                        paymentMethod: selectedOrder.paymentMethod,
                        shippingFee: selectedOrder.shippingFee,
                        shippingPaidBy: selectedOrder.shippingPaidBy,
                        items: selectedOrder.items.map(item => ({
                            id: item.id,
                            productName: item.product.name,
                            sku: item.product.sku,
                            quantity: item.quantity,
                            price: item.price,
                            unit: item.product.unit
                        }))
                    }}
                    onSuccess={refreshOrders}
                />
            )}
        </div>
    );
}
