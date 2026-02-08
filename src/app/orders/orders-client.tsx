"use client";

import { useState, useRef } from "react";
import { Order, Customer, Supplier, OrderItem, Product, ShopSettings } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Eye, Trash2, Package, ShoppingCart, Truck, Download, Loader2, ChevronRight, CheckCircle, Clock, XCircle, Edit, ChevronLeft, Calendar, MessageSquare, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteOrder, updateOrderStatus, getOrders, addOrderPayment } from "./actions";
import { ORDER_STATUSES, OrderStatus, getAllowedNextStatuses } from "./order-constants";
import { OrderReceipt } from "./order-receipt";
import { OrderEditableItems } from "./order-editable-items";
import { printContent } from "@/lib/print-utils";
import { PendingOrdersPreparation } from "./pending-orders-preparation";
import { ShippingOrdersList } from "./shipping-orders-list";
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
    expensesTotal: number;
    shopSettings?: ShopSettings | null;
}

export function OrdersClient({ initialOrders, expensesTotal, shopSettings }: OrdersClientProps) {
    const [orders, setOrders] = useState(initialOrders);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"SALE" | "PURCHASE">("SALE");
    const [selectedOrder, setSelectedOrder] = useState<OrderWithRelations | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [viewMode, setViewMode] = useState<"receipt" | "edit">("receipt");
    const [showPreparation, setShowPreparation] = useState(false);
    const [showShippingList, setShowShippingList] = useState(false);
    const [showShippingDialog, setShowShippingDialog] = useState(false);
    const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);

    // Manual Payment State
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [paymentNote, setPaymentNote] = useState("");

    const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;
    const receiptRef = useRef<HTMLDivElement>(null);
    const [receiptFormat, setReceiptFormat] = useState<"thermal" | "a5">("thermal");

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

    const handlePrintImmediate = () => {
        if (!receiptRef.current) return;
        // Use the imported printContent utility
        printContent(receiptRef.current);
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.supplier?.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = order.type === activeTab;

        // Date filter logic
        let matchesDate = true;
        if (dateFilter !== "ALL") {
            const orderDate = new Date(order.createdAt);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            if (dateFilter === "TODAY") {
                matchesDate = orderDate >= today;
            } else if (dateFilter === "WEEK") {
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                matchesDate = orderDate >= weekAgo;
            } else if (dateFilter === "MONTH") {
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                matchesDate = orderDate >= monthAgo;
            }
        }

        return matchesSearch && matchesType && matchesDate;
    });

    // Pagination
    const totalPages = Math.ceil(filteredOrders.length / pageSize);
    const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Reset page when filters change
    const handleTabChange = (tab: string) => {
        setActiveTab(tab as "SALE" | "PURCHASE");
        setCurrentPage(1);
    };
    const handleDateFilterChange = (filter: "ALL" | "TODAY" | "WEEK" | "MONTH") => {
        setDateFilter(filter);
        setCurrentPage(1);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa đơn hàng này?")) return;
        const result = await deleteOrder(id);
        if (result.success) {
            setOrders(prev => prev.filter(o => o.id !== id));
        } else {
            alert("Lỗi xóa đơn hàng");
        }
    };

    const handleAddPayment = async () => {
        if (!selectedOrder) return;
        if (paymentAmount <= 0) {
            alert("Số tiền phải lớn hơn 0");
            return;
        }

        const result = await addOrderPayment({
            orderId: selectedOrder.id,
            amount: paymentAmount,
            paymentMethod,
            note: paymentNote
        });

        if (result.success) {
            alert("Đã thêm thanh toán thành công");
            setShowPaymentDialog(false);
            setPaymentAmount(0);
            setPaymentNote("");
            refreshOrders();
        } else {
            alert(result.error || "Lỗi thêm thanh toán");
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

    // Calculate profits based on filtered orders
    const completedSaleOrders = filteredOrders.filter(o => o.type === "SALE" && o.status === "COMPLETED");

    // Revenue
    const totalRevenue = completedSaleOrders.reduce((sum, o) => sum + o.total, 0);

    // Order Profit = Revenue - COGS
    const totalOrderProfit = completedSaleOrders.reduce((sum, o) => {
        const cost = o.items.reduce((c, item) => c + (item.quantity * item.product.cost), 0);
        return sum + (o.total - cost);
    }, 0);

    // Shop shipping fees (paid by shop)
    const shopShippingFees = filteredOrders
        .filter(o => o.type === "SALE" && o.status === "COMPLETED" && o.shippingPaidBy === "SHOP")
        .reduce((sum, o) => sum + (o.shippingFee || 0), 0);

    // Gross Profit = Order Profit - Expenses - Shop Shipping Fees
    // Note: expensesTotal is global, so it might need adjustment if we want it filtered by date too, 
    // but for now we only filter order-related metrics. 
    // If expensesTotal needs to be filtered, we'd need to fetch filtered expenses.
    // Assuming user wants to see Order Profit primarily changed by filter.
    const grossProfit = totalOrderProfit - expensesTotal - shopShippingFees;

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
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <TabsList className="grid grid-cols-2 w-[300px]">
                        <TabsTrigger value="SALE" className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            Đơn bán
                        </TabsTrigger>
                        <TabsTrigger value="PURCHASE" className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Đơn mua
                        </TabsTrigger>
                    </TabsList>

                    {/* Action buttons - Only show for SALE tab */}
                    {activeTab === "SALE" && (
                        <div className="flex gap-2">
                            <Button
                                variant={showPreparation ? "default" : "outline"}
                                onClick={() => setShowPreparation(!showPreparation)}
                                className={showPreparation ? "bg-purple-600 hover:bg-purple-700" : ""}
                            >
                                <Package className="h-4 w-4 mr-2" />
                                Chuẩn bị hàng
                            </Button>
                            <Button
                                variant={showShippingList ? "default" : "outline"}
                                onClick={() => setShowShippingList(!showShippingList)}
                                className={showShippingList ? "bg-orange-600 hover:bg-orange-700" : ""}
                            >
                                <Truck className="h-4 w-4 mr-2" />
                                Giao hàng
                            </Button>
                        </div>
                    )}
                </div>

                {/* Date Filter */}
                <div className="flex gap-2 items-center flex-wrap">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Lọc theo:</span>
                    <Button size="sm" variant={dateFilter === "ALL" ? "default" : "outline"} onClick={() => handleDateFilterChange("ALL")}>
                        Tất cả
                    </Button>
                    <Button size="sm" variant={dateFilter === "TODAY" ? "default" : "outline"} onClick={() => handleDateFilterChange("TODAY")}>
                        Hôm nay
                    </Button>
                    <Button size="sm" variant={dateFilter === "WEEK" ? "default" : "outline"} onClick={() => handleDateFilterChange("WEEK")}>
                        7 ngày
                    </Button>
                    <Button size="sm" variant={dateFilter === "MONTH" ? "default" : "outline"} onClick={() => handleDateFilterChange("MONTH")}>
                        30 ngày
                    </Button>
                    <span className="ml-auto text-sm text-muted-foreground">
                        Hiển thị {paginatedOrders.length} / {filteredOrders.length} đơn
                    </span>
                </div>

                {/* Pending Orders Preparation Section */}
                {showPreparation && (
                    <PendingOrdersPreparation onOrderUpdated={refreshOrders} />
                )}

                {/* Shipping Orders Section */}
                {showShippingList && (
                    <ShippingOrdersList onOrderUpdated={refreshOrders} />
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card>
                        <CardHeader className="pb-2 p-3">
                            <CardTitle className="text-xs font-medium text-muted-foreground">Tổng đơn</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className="text-lg font-bold">{orders.length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2 p-3">
                            <CardTitle className="text-xs font-medium text-muted-foreground">Đơn bán</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className="text-lg font-bold text-blue-600">{orders.filter(o => o.type === "SALE").length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2 p-3">
                            <CardTitle className="text-xs font-medium text-muted-foreground">Đơn mua</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className="text-lg font-bold text-purple-600">{orders.filter(o => o.type === "PURCHASE").length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2 p-3">
                            <CardTitle className="text-xs font-medium text-muted-foreground">Doanh thu</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className="text-lg font-bold text-green-600">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2 p-3">
                            <CardTitle className="text-xs font-medium text-muted-foreground">LN Đơn hàng</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className="text-lg font-bold text-teal-600">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalOrderProfit)}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2 p-3">
                            <CardTitle className="text-xs font-medium text-muted-foreground">LN Gộp</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className={cn("text-lg font-bold", grossProfit >= 0 ? "text-blue-600" : "text-red-600")}>
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(grossProfit)}
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
                                        <TableHead className="text-right">Phí VC / Ghi chú</TableHead>
                                        <TableHead className="text-right">Thanh toán</TableHead>
                                        <TableHead className="text-right">Lợi nhuận</TableHead>
                                        <TableHead className="text-right">Tổng tiền</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead>Ngày tạo</TableHead>
                                        <TableHead className="w-[100px]">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedOrders.map(order => {
                                        const cost = order.items.reduce((sum, item) => sum + (item.quantity * item.product.cost), 0);
                                        const shipCost = order.shippingPaidBy === "SHOP" ? (order.shippingFee || 0) : 0;
                                        const profit = order.total - cost - shipCost;
                                        const isPaid = (order as any).paid >= order.total;

                                        return (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-medium">{order.code}</TableCell>
                                                <TableCell>{getTypeBadge(order.type)}</TableCell>
                                                <TableCell>
                                                    {order.type === "SALE"
                                                        ? (order.customer
                                                            ? order.customer.name
                                                            : (order.recipientName ? `Khách lẻ - ${order.recipientName}` : "Khách lẻ"))
                                                        : (order.supplier?.name || "-")}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        {order.shippingFee > 0 ? (
                                                            <div className="flex items-center justify-end gap-1">
                                                                <span>{new Intl.NumberFormat('vi-VN').format(order.shippingFee)}</span>
                                                                <span title={order.shippingPaidBy === "SHOP" ? "Shop trả" : "Khách trả"}>
                                                                    {order.shippingPaidBy === "SHOP" ? "🏪" : "👤"}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                        {order.note && (
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[150px] truncate" title={order.note}>
                                                                <MessageSquare className="h-3 w-3 shrink-0" />
                                                                <span className="truncate">{order.note}</span>
                                                            </div>
                                                        )}
                                                        {order.deliveryNote && (
                                                            <div className="flex items-center gap-1 text-xs text-blue-600 max-w-[150px] truncate" title={order.deliveryNote}>
                                                                <Truck className="h-3 w-3 shrink-0" />
                                                                <span className="truncate">{order.deliveryNote}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className={cn("font-bold", isPaid ? "text-green-600" : "text-orange-600")}>
                                                            {new Intl.NumberFormat('vi-VN').format((order as any).paid || 0)}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            / {new Intl.NumberFormat('vi-VN').format(order.total)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {order.type === "SALE" ? (
                                                        <span className={cn("font-medium", profit >= 0 ? "text-green-600" : "text-red-600")}>
                                                            {new Intl.NumberFormat('vi-VN').format(profit)}
                                                        </span>
                                                    ) : "-"}
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
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            Trang {currentPage} / {totalPages}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Trước
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Sau
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}

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
                                {selectedOrder && (
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
                                            <span>{selectedOrder.type === "PURCHASE" ? "Vận chuyển" : "Giao"}</span>
                                            <span>Xong</span>
                                        </div>

                                        {/* Status Change Buttons */}
                                        {selectedOrder.status !== "COMPLETED" && selectedOrder.status !== "CANCELLED" && (
                                            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 items-center">
                                                {selectedOrder.status === "SHIPPING" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setShowShippingDialog(true)}
                                                        className="mr-2"
                                                    >
                                                        <Truck className="w-4 h-4 mr-1" />
                                                        Cập nhật giao hàng
                                                    </Button>
                                                )}
                                                <span className="text-sm text-gray-500 mr-2">Chuyển sang:</span>
                                                {getAllowedNextStatuses(selectedOrder.status).map(nextStatus => {
                                                    // For READY -> SHIPPING, open shipping dialog (Only for SALE?)
                                                    // For PURCHASE, maybe we skip shipping dialog or treat it simply?
                                                    // Let's allow simple transition for now.
                                                    if (selectedOrder.type === "SALE" && selectedOrder.status === "READY" && nextStatus === "SHIPPING") {
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
                                                    // For SHIPPING -> COMPLETED, open delivery dialog (Only for SALE?)
                                                    if (selectedOrder.type === "SALE" && selectedOrder.status === "SHIPPING" && nextStatus === "COMPLETED") {
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

                                                    // For PURCHASE, allow direct transition
                                                    // Maybe rename "Giao hàng" to "Đang về" for Purchase?

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

                                {/* Manual Payment Button */}
                                {selectedOrder.status === "COMPLETED" && (selectedOrder as any).paid < selectedOrder.total && (
                                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 mt-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-orange-800">Thanh toán chưa đủ</p>
                                            <p className="text-xs text-orange-600">
                                                Đã thanh toán: {new Intl.NumberFormat('vi-VN').format((selectedOrder as any).paid || 0)} / {new Intl.NumberFormat('vi-VN').format(selectedOrder.total)}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setPaymentAmount(selectedOrder.total - ((selectedOrder as any).paid || 0));
                                                setShowPaymentDialog(true);
                                            }}
                                            className="bg-orange-600 hover:bg-orange-700"
                                        >
                                            Thêm thanh toán
                                        </Button>
                                    </div>
                                )}

                                {/* View Mode Tabs */}
                                {selectedOrder && (
                                    <div className="flex gap-2 border-b pb-2 mt-4 items-center justify-between">
                                        <div className="flex gap-2">
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

                                        {/* Format Selection (Only visible in receipt mode) */}
                                        {viewMode === "receipt" && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-500">Khổ giấy:</span>
                                                <select
                                                    className="h-8 text-sm border rounded px-2"
                                                    value={receiptFormat}
                                                    onChange={(e) => setReceiptFormat(e.target.value as "thermal" | "a5")}
                                                >
                                                    <option value="thermal">Hóa đơn (K80)</option>
                                                    <option value="a5">Hóa đơn (A5)</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Content based on view mode */}
                                {selectedOrder && (
                                    <div className="mt-4">
                                        {viewMode === "receipt" ? (
                                            <div className="border rounded-lg overflow-hidden shadow-sm flex justify-center bg-gray-100 p-4">
                                                <OrderReceipt
                                                    ref={receiptRef}
                                                    order={selectedOrder}
                                                    shopSettings={shopSettings}
                                                    format={receiptFormat}
                                                />
                                            </div>
                                        ) : (
                                            <OrderEditableItems
                                                orderId={selectedOrder.id}
                                                items={selectedOrder.items}
                                                discount={(selectedOrder as any).discount || 0}
                                                shippingFee={selectedOrder.shippingFee || 0}
                                                carrierName={selectedOrder.carrierName || undefined}
                                                type={selectedOrder.type as "SALE" | "PURCHASE"}
                                                status={selectedOrder.status}
                                                paymentMethod={selectedOrder.paymentMethod || "COD"}
                                                onUpdate={refreshOrders}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Print Button Fixed at Bottom */}
                        <div className="shrink-0 pt-4 border-t flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={handlePrintOrder}
                                disabled={isPrinting || viewMode !== "receipt"}
                            >
                                {isPrinting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                                Tải ảnh
                            </Button>

                            <Button
                                onClick={handlePrintImmediate}
                                disabled={viewMode !== "receipt"}
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                In ngay
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Payment Dialog */}
                <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Thêm thanh toán</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Số tiền</label>
                                <Input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Hình thức</label>
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                >
                                    <option value="CASH">Tiền mặt</option>
                                    <option value="QR">Chuyển khoản</option>
                                    <option value="COD">Thu hộ (COD)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Ghi chú</label>
                                <Input
                                    value={paymentNote}
                                    onChange={(e) => setPaymentNote(e.target.value)}
                                    placeholder="Ghi chú thanh toán..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Hủy</Button>
                            <Button onClick={handleAddPayment}>Xác nhận</Button>
                        </DialogFooter>
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
                            total: selectedOrder.total,
                            status: selectedOrder.status,
                            carrierName: selectedOrder.carrierName,
                            shippingFee: selectedOrder.shippingFee,
                            shippingPaidBy: selectedOrder.shippingPaidBy as "SHOP" | "CUSTOMER" | null,
                            deliveryNote: selectedOrder.deliveryNote
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
            </Tabs>
        </div>
    );
}
