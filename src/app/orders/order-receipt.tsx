"use client";

import { forwardRef, useState } from "react";
import { Order, Customer, OrderItem, Product, ShopSettings } from "@prisma/client";

type OrderWithRelations = Order & {
    customer: Customer | null;
    items: (OrderItem & { product: Product })[];
};

interface OrderReceiptProps {
    order: OrderWithRelations;
    shopSettings?: ShopSettings | null;
}

// VietQR bank codes mapping
const BANK_BINS: Record<string, string> = {
    "Vietcombank": "970436",
    "VCB": "970436",
    "Techcombank": "970407",
    "TCB": "970407",
    "BIDV": "970418",
    "Agribank": "970405",
    "VPBank": "970432",
    "MBBank": "970422",
    "MB": "970422",
    "ACB": "970416",
    "Sacombank": "970403",
    "VIB": "970441",
    "TPBank": "970423",
    "HDBank": "970437",
    "OCB": "970448",
    "SHB": "970443",
    "SeABank": "970440",
    "MSB": "970426",
    "LienVietPostBank": "970449",
    "VietinBank": "970415",
    "CTG": "970415",
    "Eximbank": "970431",
    "NamABank": "970428",
    "PVcomBank": "970412",
    "BacABank": "970409",
    "DongABank": "970406",
    "BaoVietBank": "970438",
    "ABBank": "970425",
    "NCB": "970419",
    "VietABank": "970427",
    "Kienlongbank": "970452",
    "GPBank": "970408",
    "CIMB": "422589",
    "UOB": "970458",
    "HSBC": "458761",
    "Standard Chartered": "970410",
    "Shinhan": "970424",
    "Woori": "970457",
    "Public Bank": "970439",
};

function getBankBin(bankName: string): string | null {
    // Direct match
    if (BANK_BINS[bankName]) {
        return BANK_BINS[bankName];
    }
    // Case-insensitive partial match
    const lowerBankName = bankName.toLowerCase();
    for (const [key, bin] of Object.entries(BANK_BINS)) {
        if (lowerBankName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerBankName)) {
            return bin;
        }
    }
    return null;
}

function generateVietQRUrl(
    bankName: string,
    accountNo: string,
    accountName: string,
    amount: number,
    content: string
): string | null {
    const bankBin = getBankBin(bankName);
    if (!bankBin || !accountNo) return null;

    // VietQR URL format
    const template = "compact2"; // or "compact", "qr_only", "print"
    const encodedContent = encodeURIComponent(content);
    const encodedAccountName = encodeURIComponent(accountName);

    return `https://img.vietqr.io/image/${bankBin}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodedContent}&accountName=${encodedAccountName}`;
}

export const OrderReceipt = forwardRef<HTMLDivElement, OrderReceiptProps>(
    ({ order, shopSettings }, ref) => {
        const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BANK">(
            order.paymentMethod === "QR" ? "BANK" : "CASH"
        );

        const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN').format(price);
        const formatCurrency = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

        // Shop info from settings or defaults
        const shopName = shopSettings?.name || "MINI SHOP";
        const shopPhone = shopSettings?.phone || "";
        const shopAddress = shopSettings?.address || "";

        // Calculate amounts
        const subtotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const shippingForCustomer = order.shippingPaidBy === "CUSTOMER" && order.shippingFee ? order.shippingFee : 0;
        const grandTotal = order.total + shippingForCustomer;
        const amountDue = grandTotal - (order.paid || 0);

        // Customer address (from order delivery address or customer profile)
        const customerAddress = order.deliveryAddress || order.customer?.address;

        // VietQR URL
        const vietQRUrl = paymentMethod === "BANK" && shopSettings?.bankName && shopSettings?.bankAccount
            ? generateVietQRUrl(
                shopSettings.bankName,
                shopSettings.bankAccount,
                shopSettings.bankOwner || shopName,
                amountDue > 0 ? amountDue : grandTotal,
                order.code
            )
            : null;

        return (
            <div
                ref={ref}
                className="bg-white p-6 min-w-[320px] max-w-[400px] mx-auto font-sans"
                style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
            >
                {/* Header */}
                <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                    <h1 className="text-2xl font-bold text-gray-800">{shopName}</h1>
                    {shopAddress && <p className="text-sm text-gray-500">{shopAddress}</p>}
                    {shopPhone && <p className="text-sm text-gray-500">ĐT: {shopPhone}</p>}
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
                        {order.customer?.customerType === "wholesale" && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Sỉ</span>
                        )}
                    </p>
                    {(order.recipientPhone || order.customer?.phone) && (
                        <p className="text-sm text-gray-500">
                            ĐT: {order.recipientPhone || order.customer?.phone}
                        </p>
                    )}

                    {/* Customer Address - NEW */}
                    {customerAddress && (
                        <p className="text-sm text-gray-500">
                            📍 {customerAddress}
                        </p>
                    )}

                    {/* Delivery Method */}
                    <p className="text-sm">
                        <span className="text-gray-500">Nhận hàng:</span>{" "}
                        <span className="font-medium">
                            {order.deliveryMethod === "PICKUP" ? "🏪 Lấy tại shop" : "🛵 Giao hàng"}
                        </span>
                    </p>

                    {/* Payment Method Display */}
                    <p className="text-sm">
                        <span className="text-gray-500">Thanh toán:</span>{" "}
                        <span className="font-medium">
                            {order.paymentMethod === "CASH" ? "Tiền mặt" :
                                order.paymentMethod === "COD" ? "Thu hộ (COD)" :
                                    order.paymentMethod === "QR" ? "Chuyển khoản" : "Công nợ"}
                        </span>
                    </p>

                    {/* QR Code Toggle (Only show if not cancelled) */}
                    {order.status !== "CANCELLED" && (
                        <div className="mt-2 pt-2 border-t border-dashed no-print">
                            <span className="text-xs text-gray-500 block mb-1">Hiển thị mã thanh toán:</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("CASH")}
                                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${paymentMethod === "CASH"
                                        ? "bg-green-500 text-white border-green-500"
                                        : "bg-white text-gray-600 border-gray-300 hover:border-green-400"
                                        }`}
                                >
                                    Ẩn QR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("BANK")}
                                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${paymentMethod === "BANK"
                                        ? "bg-blue-500 text-white border-blue-500"
                                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                                        }`}
                                >
                                    Hiện QR
                                </button>
                            </div>
                        </div>
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

                    {/* Subtotal when has discount or shipping */}
                    {((order.discount && order.discount > 0) || shippingForCustomer > 0) && (
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-600">Tiền hàng:</span>
                            <span className="font-medium">{formatPrice(subtotal)}đ</span>
                        </div>
                    )}

                    {/* Discount */}
                    {order.discount && order.discount > 0 && (
                        <div className="flex justify-between items-center mb-1 text-orange-600">
                            <span>🏷️ Giảm giá:</span>
                            <span className="font-medium">-{formatPrice(order.discount)}đ</span>
                        </div>
                    )}

                    {/* Shipping Info */}
                    {order.shippingFee && order.shippingFee > 0 && (
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-600">
                                🚚 Phí vận chuyển {order.carrierName ? `(${order.carrierName})` : ''}:
                            </span>
                            <span className="font-medium">
                                {order.shippingPaidBy === "SHOP" ? (
                                    <span className="text-green-600">Shop trả</span>
                                ) : (
                                    <span>{formatPrice(order.shippingFee)}đ</span>
                                )}
                            </span>
                        </div>
                    )}

                    {/* Delivery Note */}
                    {order.deliveryNote && (
                        <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200 text-sm">
                            <span className="text-gray-600">📝 Ghi chú giao hàng:</span> {order.deliveryNote}
                        </div>
                    )}

                    {/* Grand Total */}
                    <div className="flex justify-between items-center text-lg font-bold text-gray-800 border-t border-gray-200 pt-2 mt-2">
                        <span>TỔNG CỘNG:</span>
                        <span className="text-primary">{formatCurrency(grandTotal)}</span>
                    </div>

                    {/* Paid amount if partially paid */}
                    {order.paid && order.paid > 0 && order.paid < grandTotal && (
                        <>
                            <div className="flex justify-between items-center mt-1 text-green-600">
                                <span>✓ Đã thanh toán:</span>
                                <span className="font-medium">{formatPrice(order.paid)}đ</span>
                            </div>
                            <div className="flex justify-between items-center text-orange-600 font-bold">
                                <span>⏳ Còn lại:</span>
                                <span>{formatPrice(amountDue)}đ</span>
                            </div>
                        </>
                    )}
                </div>

                {/* VietQR Code - Only show for bank transfer */}
                {paymentMethod === "BANK" && vietQRUrl && (
                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-700 mb-2">Quét mã để thanh toán</p>
                            <img
                                src={vietQRUrl}
                                alt="VietQR Payment"
                                className="mx-auto rounded-lg border border-gray-200"
                                style={{ maxWidth: "200px" }}
                            />
                            <div className="mt-2 text-xs text-gray-500">
                                <p>{shopSettings?.bankName} - {shopSettings?.bankAccount}</p>
                                <p>{shopSettings?.bankOwner}</p>
                                <p className="font-medium text-gray-700">Số tiền: {formatCurrency(amountDue > 0 ? amountDue : grandTotal)}</p>
                                <p>Nội dung: {order.code}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bank info fallback if no QR available */}
                {paymentMethod === "BANK" && !vietQRUrl && shopSettings?.bankAccount && (
                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                        <div className="text-center bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-1">Thông tin chuyển khoản</p>
                            <p className="text-sm">{shopSettings?.bankName}</p>
                            <p className="text-lg font-bold text-blue-600">{shopSettings?.bankAccount}</p>
                            <p className="text-sm">{shopSettings?.bankOwner}</p>
                            <p className="text-sm mt-1 font-medium">Nội dung: {order.code}</p>
                        </div>
                    </div>
                )}

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
