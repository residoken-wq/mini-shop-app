"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Phone,
    Package,
    Truck,
    CheckCircle,
    Clock,
    XCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    MapPin
} from "lucide-react";
import { trackOrdersByPhone } from "./actions";
import { ORDER_STATUSES, OrderStatus } from "@/app/orders/order-constants";
import { cn } from "@/lib/utils";

interface TrackedOrder {
    id: string;
    code: string;
    status: string;
    statusInfo: { label: string; color: string; step: number };
    total: number;
    paymentMethod: string;
    recipientName: string | null;
    recipientPhone: string | null;
    deliveryAddress: string | null;
    createdAt: Date;
    items: { name: string; quantity: number; price: number }[];
}

export default function OrderTracking() {
    const [phone, setPhone] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [orders, setOrders] = useState<TrackedOrder[]>([]);
    const [error, setError] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

    const handleSearch = async () => {
        if (!phone.trim()) {
            setError("Vui lòng nhập số điện thoại");
            return;
        }

        setIsSearching(true);
        setError("");
        setHasSearched(true);

        try {
            const result = await trackOrdersByPhone(phone);
            if (result.success && result.orders) {
                setOrders(result.orders as TrackedOrder[]);
            } else {
                setError(result.error || "Không tìm thấy đơn hàng");
                setOrders([]);
            }
        } catch (e) {
            setError("Đã xảy ra lỗi, vui lòng thử lại");
            setOrders([]);
        } finally {
            setIsSearching(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    const getStatusIcon = (color: string) => {
        const icons: Record<string, React.ReactNode> = {
            yellow: <Clock className="w-4 h-4" />,
            blue: <Loader2 className="w-4 h-4" />,
            purple: <Package className="w-4 h-4" />,
            orange: <Truck className="w-4 h-4" />,
            green: <CheckCircle className="w-4 h-4" />,
            red: <XCircle className="w-4 h-4" />,
        };
        return icons[color] || <Package className="w-4 h-4" />;
    };

    const getStatusColorClasses = (color: string) => {
        const classes: Record<string, string> = {
            yellow: "bg-yellow-100 text-yellow-700 border-yellow-300",
            blue: "bg-blue-100 text-blue-700 border-blue-300",
            purple: "bg-purple-100 text-purple-700 border-purple-300",
            orange: "bg-orange-100 text-orange-700 border-orange-300",
            green: "bg-green-100 text-green-700 border-green-300",
            red: "bg-red-100 text-red-700 border-red-300",
        };
        return classes[color] || "bg-gray-100 text-gray-700";
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="text-center">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold">Tra cứu đơn hàng</h2>
                <p className="text-sm text-gray-500 mt-1">Nhập số điện thoại để xem trạng thái đơn hàng</p>
            </div>

            {/* Search Input */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        type="tel"
                        placeholder="Nhập số điện thoại..."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-10 h-12 text-lg"
                    />
                </div>
                <Button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="h-12 px-6 bg-gradient-to-r from-purple-500 to-pink-500"
                >
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </Button>
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
                    {error}
                </div>
            )}

            {/* Results */}
            {hasSearched && orders.length === 0 && !error && (
                <div className="text-center py-8 text-gray-500">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Không tìm thấy đơn hàng nào</p>
                </div>
            )}

            {orders.length > 0 && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">Tìm thấy {orders.length} đơn hàng</p>

                    {orders.map(order => (
                        <div
                            key={order.id}
                            className="border rounded-xl overflow-hidden"
                        >
                            {/* Order Header */}
                            <div
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-bold text-lg">#{order.code}</p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={cn("text-xs", getStatusColorClasses(order.statusInfo.color))}>
                                            {getStatusIcon(order.statusInfo.color)}
                                            <span className="ml-1">{order.statusInfo.label}</span>
                                        </Badge>
                                    </div>
                                </div>

                                {/* Status Progress */}
                                <div className="mt-4">
                                    <div className="flex items-center justify-between">
                                        {(["PENDING", "PROCESSING", "READY", "SHIPPING", "COMPLETED"] as const).map((status, idx) => {
                                            const statusInfo = ORDER_STATUSES[status];
                                            const currentStep = order.statusInfo.step || 0;
                                            const isActive = statusInfo.step <= currentStep;
                                            const isCurrent = order.status === status;
                                            const isCancelled = order.status === "CANCELLED";

                                            return (
                                                <div key={status} className="flex items-center">
                                                    <div className={cn(
                                                        "w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold transition-all",
                                                        isCancelled ? "bg-gray-200 text-gray-400" :
                                                            isCurrent ? "bg-purple-500 text-white ring-2 ring-purple-200" :
                                                                isActive ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
                                                    )}>
                                                        {isActive && !isCancelled ? <CheckCircle className="w-3 h-3 md:w-4 md:h-4" /> : idx + 1}
                                                    </div>
                                                    {idx < 4 && (
                                                        <div className={cn(
                                                            "w-4 md:w-8 h-0.5 mx-0.5",
                                                            !isCancelled && statusInfo.step < currentStep ? "bg-green-500" : "bg-gray-200"
                                                        )} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="mt-3 flex justify-between items-center">
                                    <span className="text-sm text-gray-500">{order.items.length} sản phẩm</span>
                                    <span className="font-bold text-lg text-purple-600">{formatCurrency(order.total)}đ</span>
                                </div>

                                {/* View Details Button */}
                                <div className={cn(
                                    "mt-4 py-3 px-4 -mx-4 -mb-4 flex items-center justify-center gap-2 font-medium transition-all",
                                    expandedOrder === order.id
                                        ? "bg-purple-100 text-purple-700"
                                        : "bg-gradient-to-r from-purple-50 to-pink-50 text-purple-600 hover:from-purple-100 hover:to-pink-100"
                                )}>
                                    {expandedOrder === order.id ? (
                                        <>
                                            <ChevronUp className="w-5 h-5" />
                                            Thu gọn
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-5 h-5 animate-bounce" />
                                            Xem chi tiết đơn hàng
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedOrder === order.id && (
                                <div className="border-t bg-gray-50 p-4 space-y-4">
                                    {/* Delivery Info */}
                                    {order.recipientName && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-gray-600">Thông tin giao hàng</p>
                                            <div className="bg-white rounded-lg p-3 text-sm space-y-1">
                                                <p><span className="text-gray-500">Người nhận:</span> {order.recipientName}</p>
                                                <p><span className="text-gray-500">SĐT:</span> {order.recipientPhone}</p>
                                                {order.deliveryAddress && (
                                                    <p className="flex items-start gap-1">
                                                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                                        <span>{order.deliveryAddress}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Items */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-600">Chi tiết sản phẩm</p>
                                        <div className="bg-white rounded-lg divide-y">
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="p-3 flex justify-between text-sm">
                                                    <div>
                                                        <p className="font-medium">{item.name}</p>
                                                        <p className="text-gray-500">{formatCurrency(item.price)}đ x {item.quantity}</p>
                                                    </div>
                                                    <p className="font-bold">{formatCurrency(item.price * item.quantity)}đ</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Payment Info */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-600">Thông tin thanh toán</p>
                                        <div className="bg-white rounded-lg p-3 text-sm space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Phương thức:</span>
                                                <span className="font-medium">
                                                    {order.paymentMethod === "COD" ? "💵 Tiền mặt (COD)" :
                                                        order.paymentMethod === "QR" ? "📱 Chuyển khoản" : "📋 Công nợ"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Trạng thái:</span>
                                                {order.status === "COMPLETED" ? (
                                                    <Badge className="bg-green-100 text-green-700 text-xs">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Đã thanh toán
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        Chưa thanh toán
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex justify-between pt-2 border-t">
                                                <span className="font-medium">Tổng cộng:</span>
                                                <span className="font-bold text-purple-600">{formatCurrency(order.total)}đ</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Thank You Message */}
                    <div className="text-center py-6 px-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                        <p className="text-purple-700 font-medium">
                            🙏 Cảm ơn Quý khách đã ủng hộ!
                        </p>
                        <p className="text-purple-600 text-sm mt-1">
                            Rất hân hạnh được phục vụ Quý khách!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
