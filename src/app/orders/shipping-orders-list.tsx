"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, RefreshCw, CheckCircle, MapPin, Phone, Package, ChevronDown, ChevronUp, MessageCircle, Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOrders, updateOrderStatus, sendShippingNotification } from "./actions";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type ShippingOrder = {
    id: string;
    code: string;
    status: string;
    total: number;
    recipientName: string | null;
    recipientPhone: string | null;
    deliveryAddress: string | null;
    carrierName: string | null;
    shippingFee: number;
    shippingPaidBy: string;
    shippedAt: Date | null;
    lastNotificationAt: Date | null;
    lastNotificationType: string | null;
    customer: { name: string; phone?: string } | null;
    items: { product: { name: string }; quantity: number }[];
};

interface ShippingOrdersListProps {
    onOrderUpdated: () => void;
}

export function ShippingOrdersList({ onOrderUpdated }: ShippingOrdersListProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [orders, setOrders] = useState<ShippingOrder[]>([]);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
    const [sendingMessage, setSendingMessage] = useState<string | null>(null);
    const [messageDialog, setMessageDialog] = useState<{ open: boolean; message: string; phone: string; orderCode: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        const allOrders = await getOrders();
        const shippingOrders = allOrders.filter(
            (o: { type: string; status: string }) => o.type === "SALE" && o.status === "SHIPPING"
        ) as ShippingOrder[];
        setOrders(shippingOrders);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleMarkDelivered = async (orderId: string) => {
        setUpdatingOrder(orderId);
        const result = await updateOrderStatus(orderId, "DELIVERED");
        if (result.success) {
            await loadData();
            onOrderUpdated();
        } else {
            alert("Lỗi cập nhật trạng thái đơn hàng");
        }
        setUpdatingOrder(null);
    };

    const handleSendMessage = async (order: ShippingOrder) => {
        setSendingMessage(order.id);
        const result = await sendShippingNotification(order.id);
        if (result.success && result.message) {
            const phone = order.recipientPhone || order.customer?.phone || "";
            setMessageDialog({
                open: true,
                message: result.message,
                phone: phone.replace(/\D/g, ''),
                orderCode: order.code
            });
            await loadData(); // Refresh to show notification sent status
        } else {
            alert(result.error || "Lỗi tạo tin nhắn");
        }
        setSendingMessage(null);
    };

    const handleCopyMessage = () => {
        if (messageDialog?.message) {
            navigator.clipboard.writeText(messageDialog.message);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleOpenZalo = () => {
        if (messageDialog?.phone) {
            window.open(`https://zalo.me/${messageDialog.phone}`, '_blank');
        }
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

    const formatTime = (date: Date | null) => {
        if (!date) return "";
        return new Date(date).toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <Card className="bg-green-50 border-green-200">
                <CardContent className="py-8 text-center">
                    <Truck className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-green-700 font-medium">Không có đơn hàng đang giao</p>
                    <p className="text-green-600 text-sm mt-1">Tất cả đơn đã giao thành công</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-orange-600" />
                        <h2 className="text-base sm:text-lg font-semibold">Đang giao hàng</h2>
                        <Badge variant="secondary" className="text-xs">{orders.length} đơn</Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading} className="h-8 px-2 sm:px-3">
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                        <span className="hidden sm:inline ml-2">Làm mới</span>
                    </Button>
                </div>

                {/* Orders List */}
                <div className="space-y-3">
                    {orders.map(order => (
                        <Card key={order.id} className="border-orange-200 overflow-hidden">
                            {/* Order Header */}
                            <div
                                className="p-3 cursor-pointer active:bg-gray-50"
                                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-orange-700">{order.code}</span>
                                            {order.carrierName && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                    🚚 {order.carrierName}
                                                </Badge>
                                            )}
                                            {order.lastNotificationAt && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300">
                                                    ✓ Đã gửi tin
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm font-medium mt-0.5">
                                            {order.recipientName || order.customer?.name || "Khách lẻ"}
                                        </p>
                                        {order.recipientPhone && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                {order.recipientPhone}
                                            </p>
                                        )}
                                        {order.shippedAt && (
                                            <p className="text-xs text-orange-600 mt-1">
                                                Giao lúc: {formatTime(order.shippedAt)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="font-bold">{formatCurrency(order.total)}đ</span>
                                        {order.shippingFee > 0 && (
                                            <span className="text-xs text-muted-foreground">
                                                Ship: {formatCurrency(order.shippingFee)}đ
                                                {order.shippingPaidBy === "SHOP" && " (Shop)"}
                                            </span>
                                        )}
                                        {expandedOrder === order.id ? (
                                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedOrder === order.id && (
                                <div className="border-t bg-gray-50">
                                    {/* Delivery Address */}
                                    {order.deliveryAddress && (
                                        <div className="p-3 border-b flex items-start gap-2">
                                            <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                            <p className="text-sm text-gray-700">{order.deliveryAddress}</p>
                                        </div>
                                    )}

                                    {/* Items */}
                                    <div className="p-3 space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                            <Package className="h-3 w-3" />
                                            Sản phẩm ({order.items.length})
                                        </p>
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span>{item.product.name}</span>
                                                <span className="font-medium">x{item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="p-3 pt-0 space-y-2">
                                        {/* Send Message Button */}
                                        <Button
                                            variant="outline"
                                            className="w-full h-10 text-green-700 border-green-300 hover:bg-green-50"
                                            disabled={sendingMessage === order.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSendMessage(order);
                                            }}
                                        >
                                            {sendingMessage === order.id ? (
                                                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <MessageCircle className="h-4 w-4 mr-2" />
                                            )}
                                            {order.lastNotificationAt ? "Gửi lại tin nhắn" : "Gửi tin nhắn Zalo"}
                                        </Button>

                                        {/* Mark Delivered Button */}
                                        <Button
                                            className="w-full h-12 text-base font-semibold bg-teal-600 hover:bg-teal-700"
                                            disabled={updatingOrder === order.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkDelivered(order.id);
                                            }}
                                        >
                                            {updatingOrder === order.id ? (
                                                <RefreshCw className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <CheckCircle className="h-5 w-5 mr-2" />
                                                    Đã giao - Chờ xác nhận thanh toán
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

            {/* Message Dialog */}
            <Dialog open={messageDialog?.open || false} onOpenChange={(open) => !open && setMessageDialog(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5 text-green-600" />
                            Gửi tin nhắn Zalo - {messageDialog?.orderCode}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-3 bg-gray-50 rounded-lg border">
                            <p className="text-sm whitespace-pre-wrap">{messageDialog?.message}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleCopyMessage}
                            >
                                {copied ? (
                                    <><Check className="h-4 w-4 mr-2" /> Đã copy!</>
                                ) : (
                                    <><Copy className="h-4 w-4 mr-2" /> Copy tin nhắn</>
                                )}
                            </Button>
                            <Button
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                onClick={handleOpenZalo}
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Mở Zalo
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 text-center">
                            Nhấn &quot;Copy tin nhắn&quot; rồi dán vào Zalo để gửi cho khách
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
