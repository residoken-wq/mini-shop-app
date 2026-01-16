"use client";

import { forwardRef } from "react";
import { Order, Customer, OrderItem, Product } from "@prisma/client";

type OrderWithRelations = Order & {
    customer: Customer | null;
    items: (OrderItem & { product: Product })[];
};

interface OrderReceiptProps {
    order: OrderWithRelations;
    shopName?: string;
    shopPhone?: string;
    shopAddress?: string;
}

export const OrderReceipt = forwardRef<HTMLDivElement, OrderReceiptProps>(
    ({ order, shopName = "MINI SHOP", shopPhone = "0123 456 789", shopAddress = "TP. Hồ Chí Minh" }, ref) => {
        const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN').format(price);
        const formatCurrency = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

        return (
            <div
                ref={ref}
                className="bg-white p-6 min-w-[320px] max-w-[400px] mx-auto font-sans"
                style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
            >
                {/* Header */}
                <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">{shopName}</h1>
                    <p className="text-sm text-gray-500">{shopAddress}</p>
                    <p className="text-sm text-gray-500">ĐT: {shopPhone}</p>
                </div>

                {/* Receipt Title */}
                <div className="text-center mb-4">
                    <h2 className="text-xl font-bold">HÓA ĐƠN BÁN HÀNG</h2>
                    <p className="text-sm text-gray-600">Mã: {order.code}</p>
                    <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                </div>

                {/* Customer Info */}
                <div className="border-b border-dashed border-gray-200 pb-3 mb-3">
                    <p className="text-sm">
                        <span className="text-gray-500">Khách hàng:</span>{" "}
                        <span className="font-medium">
                            {order.recipientName || order.customer?.name || "Khách lẻ"}
                        </span>
                    </p>
                    {(order.recipientPhone || order.customer?.phone) && (
                        <p className="text-sm text-gray-500">
                            ĐT: {order.recipientPhone || order.customer?.phone}
                        </p>
                    )}
                    {/* Delivery Method */}
                    <p className="text-sm">
                        <span className="text-gray-500">Nhận hàng:</span>{" "}
                        <span className="font-medium">
                            {order.deliveryMethod === "PICKUP" ? "🏪 Lấy tại shop" : "🛵 Giao hàng"}
                        </span>
                    </p>
                    {order.deliveryAddress && (
                        <p className="text-sm text-gray-500">
                            📍 {order.deliveryAddress}
                        </p>
                    )}
                    {order.paymentMethod && (
                        <p className="text-sm">
                            <span className="text-gray-500">Thanh toán:</span>{" "}
                            <span className="font-medium">
                                {order.paymentMethod === "COD" ? "💵 Tiền mặt (COD)" :
                                    order.paymentMethod === "QR" ? "📱 Chuyển khoản" :
                                        order.paymentMethod === "CREDIT" ? "📋 Công nợ" : order.paymentMethod}
                            </span>
                        </p>
                    )}
                    {/* Note */}
                    {order.note && (
                        <p className="text-sm mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                            <span className="text-gray-600">📝 Ghi chú:</span> {order.note}
                        </p>
                    )}
                </div>

                {/* Items Table */}
                <div className="mb-4">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-2 font-medium text-gray-600">Sản phẩm</th>
                                <th className="text-center py-2 font-medium text-gray-600 w-12">SL</th>
                                <th className="text-right py-2 font-medium text-gray-600 w-20">Đ.Giá</th>
                                <th className="text-right py-2 font-medium text-gray-600 w-24">T.Tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item, index) => (
                                <tr key={item.id} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                                    <td className="py-2 pr-2">
                                        <div className="font-medium text-gray-800">{item.product.name}</div>
                                        <div className="text-xs text-gray-400">{item.product.unit}</div>
                                    </td>
                                    <td className="text-center py-2 text-gray-700">{item.quantity}</td>
                                    <td className="text-right py-2 text-gray-600">{formatPrice(item.price)}</td>
                                    <td className="text-right py-2 font-medium text-gray-800">
                                        {formatPrice(item.price * item.quantity)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="border-t-2 border-dashed border-gray-300 pt-3">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-600">Số lượng SP:</span>
                        <span className="font-medium">{order.items.reduce((sum, i) => sum + i.quantity, 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-lg font-bold text-gray-800 border-t border-gray-200 pt-2 mt-2">
                        <span>TỔNG CỘNG:</span>
                        <span className="text-primary">{formatCurrency(order.total)}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 pt-4 border-t border-dashed border-gray-200">
                    <p className="text-sm text-gray-500">Cảm ơn quý khách!</p>
                    <p className="text-xs text-gray-400 mt-1">Hẹn gặp lại ❤️</p>
                </div>
            </div>
        );
    }
);

OrderReceipt.displayName = "OrderReceipt";
