"use client";

import { useState } from "react";
import Image from "next/image";
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
    MapPin,
    CreditCard,
    QrCode
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
    paid: number;
    discount: number;
    shippingFee: number;
    shippingPaidBy: string;
    paymentMethod: string;
    recipientName: string | null;
    recipientPhone: string | null;
    deliveryAddress: string | null;
    carrierName: string | null;
    deliveryNote: string | null;
    createdAt: Date;
    items: { name: string; quantity: number; price: number }[];
}

interface BankInfo {
    bankName: string;
    bankAccount: string;
    bankOwner: string;
}

export default function OrderTracking() {
    const [phone, setPhone] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [orders, setOrders] = useState<TrackedOrder[]>([]);
    const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
    const [error, setError] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [showQR, setShowQR] = useState<string | null>(null);

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
                if (result.bankInfo) {
                    setBankInfo(result.bankInfo as BankInfo);
                }
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

    // Generate VietQR URL
    const getVietQRUrl = (order: TrackedOrder) => {
        if (!bankInfo?.bankAccount || !bankInfo?.bankName) return null;
        const bankCodes: Record<string, string> = {
            'Vietcombank': 'VCB', 'VCB': 'VCB',
            'Techcombank': 'TCB', 'TCB': 'TCB',
            'MB Bank': 'MB', 'MB': 'MB', 'BIDV': 'BIDV',
            'Agribank': 'VBA', 'VBA': 'VBA', 'ACB': 'ACB',
            'VPBank': 'VPB', 'VPB': 'VPB',
            'Sacombank': 'STB', 'STB': 'STB',
            'TPBank': 'TPB', 'TPB': 'TPB',
            'Vietinbank': 'CTG', 'CTG': 'CTG',
        };
        const bankCode = bankCodes[bankInfo.bankName] || bankInfo.bankName.toUpperCase();
        const amount = order.total - order.paid;
        const info = encodeURIComponent(`${order.code}`);
        return `https://img.vietqr.io/image/${bankCode}-${bankInfo.bankAccount}-compact2.png?amount=${amount}&addInfo=${info}&accountName=${encodeURIComponent(bankInfo.bankOwner)}`;
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
                                    <div className="flex items-start justify-between">
                                        {(["PENDING", "PROCESSING", "READY", "SHIPPING", "COMPLETED"] as const).map((status, idx) => {
                                            const statusInfo = ORDER_STATUSES[status];
                                            const currentStep = order.statusInfo.step || 0;
                                            const isCompleted = statusInfo.step < currentStep; // Steps before current
                                            const isCurrent = statusInfo.step === currentStep; // Current step
                                            const isCancelled = order.status === "CANCELLED";

                                            return (
                                                <div key={status} className="flex items-center">
                                                    <div className="flex flex-col items-center">
                                                        <div className={cn(
                                                            "w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold transition-all",
                                                            isCancelled ? "bg-gray-200 text-gray-400" :
                                                                isCurrent ? "bg-purple-500 text-white ring-2 ring-purple-200" :
                                                                    isCompleted ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
                                                        )}>
                                                            {isCompleted && !isCancelled ? <CheckCircle className="w-3 h-3 md:w-4 md:h-4" /> : idx + 1}
                                                        </div>
                                                        <span className={cn(
                                                            "text-[8px] md:text-[10px] mt-1 text-center max-w-[45px] md:max-w-[60px] leading-tight",
                                                            isCancelled ? "text-gray-400" :
                                                                isCurrent ? "text-purple-600 font-semibold" :
                                                                    isCompleted ? "text-green-600" : "text-gray-400"
                                                        )}>
                                                            {statusInfo.label}
                                                        </span>
                                                    </div>
                                                    {idx < 4 && (
                                                        <div className={cn(
                                                            "w-4 md:w-8 h-0.5 mx-0.5 mb-4",
                                                            !isCancelled && isCompleted ? "bg-green-500" : "bg-gray-200"
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
                                    {(order.recipientName || order.deliveryAddress || order.carrierName || order.deliveryNote) && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-gray-600">Thông tin giao hàng</p>
                                            <div className="bg-white rounded-lg p-3 text-sm space-y-1">
                                                {order.recipientName && (
                                                    <p><span className="text-gray-500">Người nhận:</span> {order.recipientName}</p>
                                                )}
                                                {order.recipientPhone && (
                                                    <p><span className="text-gray-500">SĐT:</span> {order.recipientPhone}</p>
                                                )}
                                                {order.deliveryAddress && (
                                                    <p className="flex items-start gap-1">
                                                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                                        <span>{order.deliveryAddress}</span>
                                                    </p>
                                                )}
                                                {order.carrierName && (
                                                    <p className="flex items-center gap-1 pt-1 border-t mt-1">
                                                        <Truck className="w-4 h-4 text-orange-500" />
                                                        <span className="text-gray-500">Đơn vị vận chuyển:</span>
                                                        <span className="font-medium">{order.carrierName}</span>
                                                    </p>
                                                )}
                                                {order.deliveryNote && (
                                                    <div className="pt-2 border-t mt-2">
                                                        <p className="text-gray-500 text-xs mb-1">📝 Ghi chú giao hàng:</p>
                                                        <p className="bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-200 text-xs">
                                                            {order.deliveryNote}
                                                        </p>
                                                    </div>
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
                                                    {order.paymentMethod === "CASH" ? "💵 Tiền mặt" :
                                                        order.paymentMethod === "COD" ? "💵 Tiền mặt (COD)" :
                                                            order.paymentMethod === "QR" ? "📱 Chuyển khoản" : "📋 Công nợ"}
                                                </span>
                                            </div>

                                            {/* Payment Status */}
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-500">Trạng thái:</span>
                                                {order.paid >= order.total ? (
                                                    <Badge className="bg-green-100 text-green-700 text-xs text-nowrap">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Đã thanh toán
                                                    </Badge>
                                                ) : order.paid > 0 ? (
                                                    <Badge className="bg-blue-100 text-blue-700 text-xs text-nowrap">
                                                        <CreditCard className="w-3 h-3 mr-1" />
                                                        Thanh toán 1 phần
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-yellow-100 text-yellow-700 text-xs text-nowrap">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        Chưa thanh toán
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Order Summary Breakdown */}
                                            <div className="space-y-1 pt-2 border-t text-sm">
                                                <div className="flex justify-between text-gray-600">
                                                    <span>Tạm tính:</span>
                                                    <span>{formatCurrency(order.total + order.discount - (order.shippingFee || 0))}đ</span>
                                                </div>

                                                {order.shippingFee > 0 && (
                                                    <div className="flex justify-between text-gray-600">
                                                        <span>Phí vận chuyển:</span>
                                                        <span>{formatCurrency(order.shippingFee)}đ</span>
                                                    </div>
                                                )}

                                                {order.discount > 0 && (
                                                    <div className="flex justify-between text-orange-600">
                                                        <span>🏷️ Giảm giá:</span>
                                                        <span className="font-medium">-{formatCurrency(order.discount)}đ</span>
                                                    </div>
                                                )}

                                                <div className="flex justify-between font-medium text-base pt-2 border-t">
                                                    <span>Tổng tiền:</span>
                                                    <span className="text-purple-600">{formatCurrency(order.total)}đ</span>
                                                </div>

                                                {order.paid > 0 && (
                                                    <div className="flex justify-between text-green-600 font-medium">
                                                        <span>✓ Đã thanh toán:</span>
                                                        <span>{formatCurrency(order.paid)}đ</span>
                                                    </div>
                                                )}

                                                {(order.total - order.paid) > 0 && (
                                                    <div className="flex justify-between text-orange-600 font-bold">
                                                        <span>⏳ Còn lại:</span>
                                                        <span>{formatCurrency(order.total - order.paid)}đ</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* QR Payment Button */}
                                            {order.paid < order.total && order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                                                <div className="pt-3 border-t mt-3">
                                                    <Button
                                                        onClick={() => setShowQR(showQR === order.id ? null : order.id)}
                                                        variant="outline"
                                                        className="w-full bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-purple-100"
                                                    >
                                                        <QrCode className="w-4 h-4 mr-2" />
                                                        {showQR === order.id ? "Ẩn mã QR" : "Thanh toán qua QR"}
                                                    </Button>

                                                    {showQR === order.id && bankInfo && (
                                                        <div className="mt-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg text-center space-y-2">
                                                            <p className="text-xs text-gray-600">Quét mã để thanh toán</p>
                                                            {getVietQRUrl(order) && (
                                                                <Image
                                                                    src={getVietQRUrl(order)!}
                                                                    alt="QR Code"
                                                                    className="mx-auto rounded-lg shadow-md"
                                                                    width={192}
                                                                    height={192}
                                                                    unoptimized
                                                                />
                                                            )}
                                                            <div className="text-xs text-gray-600 space-y-1">
                                                                <p><span className="text-gray-500">Ngân hàng:</span> {bankInfo.bankName}</p>
                                                                <p><span className="text-gray-500">STK:</span> <span className="font-mono font-bold">{bankInfo.bankAccount}</span></p>
                                                                <p><span className="text-gray-500">Chủ TK:</span> {bankInfo.bankOwner}</p>
                                                                <p><span className="text-gray-500">Số tiền:</span> <span className="font-bold text-purple-600">{formatCurrency(order.total - order.paid)}đ</span></p>
                                                                <p><span className="text-gray-500">Nội dung:</span> <span className="font-mono">{order.code}</span></p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

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
