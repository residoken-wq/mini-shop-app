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
    format?: "thermal" | "a5";
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
    ({ order, shopSettings, format = "thermal" }, ref) => {
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

        const isA5 = format === "a5";

        return (
            <div
                ref={ref}
                className={`bg-white mx-auto font-sans ${isA5 ? "w-[148mm] min-h-[200mm] p-4" : "min-w-[320px] max-w-[400px] p-6"}`}
                style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}
            >
                {/* Header */}
                <div className={`text-center pb-2 mb-2 ${isA5 ? "border-b border-gray-800" : "border-b-2 border-dashed border-gray-300 pb-4 mb-4"}`}>
                    <h1 className={`${isA5 ? "text-xl" : "text-2xl"} font-bold text-gray-800 uppercase`}>{shopName}</h1>
                    {shopAddress && <p className="text-xs text-gray-500">{shopAddress}</p>}
                    {shopPhone && <p className="text-xs text-gray-500">ĐT: {shopPhone}</p>}
                </div>

                {/* Receipt Title */}
                <div className="text-center mb-2">
                    <h2 className={`${isA5 ? "text-lg" : "text-xl"} font-bold uppercase`}>HÓA ĐƠN BÁN HÀNG</h2>
                    <p className="text-xs text-gray-600">Mã: {order.code}</p>
                    <p className="text-xs text-gray-500">
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
                <div className={`pb-2 mb-2 ${isA5 ? "border-b border-gray-800 text-xs" : "border-b border-dashed border-gray-200 pb-3 mb-3 text-sm"}`}>
                    <p className={isA5 ? "mb-1" : "mb-1"}>
                        <span className="text-gray-500">Khách hàng:</span>{" "}
                        <span className="font-medium">
                            {order.recipientName || order.customer?.name || "Khách lẻ"}
                        </span>
                        {order.customer?.customerType === "wholesale" && (
                            <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">Sỉ</span>
                        )}
                    </p>
                    {(order.recipientPhone || order.customer?.phone) && (
                        <p className={`text-gray-500 ${isA5 ? "mb-1" : "mb-1"}`}>
                            ĐT: {order.recipientPhone || order.customer?.phone}
                        </p>
                    )}

                    {/* Customer Address - NEW */}
                    {customerAddress && (
                        <p className={`text-gray-500 ${isA5 ? "mb-1" : "mb-1"}`}>
                            📍 {customerAddress}
                        </p>
                    )}

                    {/* Delivery Method */}
                    <p className={isA5 ? "mb-1" : "mb-1"}>
                        <span className="text-gray-500">Nhận hàng:</span>{" "}
                        <span className="font-medium">
                            {order.deliveryMethod === "PICKUP" ? "🏪 Lấy tại shop" : "🛵 Giao hàng"}
                        </span>
                    </p>

                    {/* Payment Method Display */}
                    <p>
                        <span className="text-gray-500">Thanh toán:</span>{" "}
                        <span className="font-medium">
                            {order.paymentMethod === "CASH" ? "Tiền mặt" :
                                order.paymentMethod === "COD" ? "Thu hộ (COD)" :
                                    order.paymentMethod === "QR" ? "Chuyển khoản" : "Công nợ"}
                        </span>
                    </p>

                    {/* QR Code Toggle (Only show if not cancelled) */}
                    {order.status !== "CANCELLED" && (
                        <div className={`mt-2 pt-2 border-t no-print ${isA5 ? "border-gray-200" : "border-dashed border-gray-200"}`}>
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
                        <p className={`mt-2 p-1.5 bg-yellow-50 rounded border border-yellow-200 ${isA5 ? "text-xs" : "text-sm"}`}>
                            <span className="text-gray-600">📝 Ghi chú:</span> {order.note}
                        </p>
                    )}
                </div>

                {/* Items Table */}
                <div className="mb-2">
                    <table className={`w-full border-collapse ${isA5 ? "text-xs" : "text-sm"}`}>
                        <thead>
                            <tr className={`${isA5 ? "border-b border-gray-800" : "border-b border-gray-200"}`}>
                                <th className={`text-left py-1 font-medium text-gray-600 ${isA5 ? "border-r border-gray-300 px-1" : ""}`}>Sản phẩm</th>
                                <th className={`text-center py-1 font-medium text-gray-600 w-8 ${isA5 ? "border-r border-gray-300 px-1" : ""}`}>SL</th>
                                <th className={`text-right py-1 font-medium text-gray-600 w-16 ${isA5 ? "border-r border-gray-300 px-1" : ""}`}>Đ.Giá</th>
                                <th className={`text-right py-1 font-medium text-gray-600 w-20 ${isA5 ? "px-1" : ""}`}>T.Tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item, index) => (
                                <tr key={item.id} className={`${index % 2 === 0 ? "bg-gray-50" : ""} ${isA5 ? "border-b border-gray-200" : ""}`}>
                                    <td className={`py-1 pr-1 ${isA5 ? "border-r border-gray-300 px-1" : ""}`}>
                                        <div className="font-medium text-gray-800">{item.product.name}</div>
                                        <div className="text-[10px] text-gray-400">{item.product.unit}</div>
                                    </td>
                                    <td className={`text-center py-1 align-top ${isA5 ? "border-r border-gray-300 px-1" : ""}`}>{item.quantity}</td>
                                    <td className={`text-right py-1 align-top ${isA5 ? "border-r border-gray-300 px-1" : ""}`}>{formatPrice(item.price)}</td>
                                    <td className={`text-right py-1 align-top font-medium ${isA5 ? "px-1" : ""}`}>{formatPrice(item.price * item.quantity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary */}
                <div className={`pt-2 ${isA5 ? "border-t border-gray-800 text-xs" : "border-t border-dashed border-gray-300 text-sm"}`}>
                    <div className="flex justify-between py-0.5">
                        <span className="text-gray-600">Tổng tiền hàng:</span>
                        <span className="font-medium">{formatPrice(subtotal)}</span>
                    </div>

                    {shippingForCustomer > 0 && (
                        <div className="flex justify-between py-0.5">
                            <span className="text-gray-600">Phí vận chuyển:</span>
                            <span className="font-medium">{formatPrice(shippingForCustomer)}</span>
                        </div>
                    )}

                    {order.discount && order.discount > 0 && (
                        <div className="flex justify-between py-0.5 text-green-600">
                            <span>Giảm giá:</span>
                            <span>-{formatPrice(order.discount)}</span>
                        </div>
                    )}

                    <div className={`flex justify-between py-1 mt-1 ${isA5 ? "border-t border-gray-300 text-base" : "border-t border-dashed border-gray-200 text-base"}`}>
                        <span className="font-bold">TỔNG CỘNG:</span>
                        <span className="font-bold text-blue-600">{formatCurrency(grandTotal)}</span>
                    </div>

                    {/* Paid / Remaining */}
                    {order.paid && order.paid > 0 && (
                        <div className="flex justify-between py-0.5 text-gray-600">
                            <span>Đã thanh toán:</span>
                            <span>{formatPrice(order.paid)}</span>
                        </div>
                    )}

                    {amountDue > 0 ? (
                        <div className="flex justify-between py-0.5 font-bold text-red-500">
                            <span>Cần thanh toán:</span>
                            <span>{formatCurrency(amountDue)}</span>
                        </div>
                    ) : (
                        <div className="mt-1 text-center text-green-600 font-bold border border-green-200 bg-green-50 p-1 rounded">
                            ĐÃ THANH TOÁN ĐỦ
                        </div>
                    )}
                </div>

                {/* Delivery Note */}
                {order.deliveryNote && (
                    <div className={`mb-2 p-1.5 bg-blue-50 rounded border border-blue-200 ${isA5 ? "text-xs" : "text-sm"}`}>
                        <span className="text-gray-600">📝 Ghi chú giao hàng:</span> {order.deliveryNote}
                    </div>
                )}

                {/* VietQR Code - Only show for bank transfer */}
                {/* VietQR Code - Only show for bank transfer */}
                {paymentMethod === "BANK" && vietQRUrl && (
                    <div className={`mt-2 ${isA5 ? "flex items-start gap-3 border-t border-gray-800 pt-2" : "text-center"}`}>
                        <div className={isA5 ? "shrink-0" : ""}>
                            <p className={`font-medium text-gray-700 mb-1 ${isA5 ? "hidden" : "text-sm"}`}>Quét mã để thanh toán</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={vietQRUrl}
                                alt="VietQR Payment"
                                className={`rounded-lg border border-gray-200 ${isA5 ? "" : "mx-auto"}`}
                                style={{ maxWidth: isA5 ? "100px" : "150px" }}
                            />
                        </div>
                        <div className={isA5 ? "flex-1 text-left" : "mt-2 text-xs text-gray-500"}>
                            {isA5 && <p className="font-bold text-xs mb-1">QUÉT MÃ THANH TOÁN</p>}
                            <div className={isA5 ? "text-[10px] space-y-0.5" : ""}>
                                <p><span className={isA5 ? "font-semibold" : ""}>Ngân hàng:</span> {shopSettings?.bankName}</p>
                                <p><span className={isA5 ? "font-semibold" : ""}>STK:</span> <span className="font-bold text-blue-600">{shopSettings?.bankAccount}</span></p>
                                <p><span className={isA5 ? "font-semibold" : ""}>Chủ TK:</span> {shopSettings?.bankOwner}</p>
                                <p className={isA5 ? "" : "font-medium text-gray-700"}>
                                    <span className={isA5 ? "font-semibold" : ""}>Số tiền:</span> {formatCurrency(amountDue > 0 ? amountDue : grandTotal)}
                                </p>
                                <p><span className={isA5 ? "font-semibold" : ""}>Nội dung:</span> {order.code}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bank info fallback if no QR available */}
                {paymentMethod === "BANK" && !vietQRUrl && shopSettings?.bankAccount && (
                    <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                        <div className="text-center bg-blue-50 p-2 rounded-lg">
                            <p className={`font-medium text-gray-700 mb-1 ${isA5 ? "text-xs" : "text-sm"}`}>Thông tin chuyển khoản</p>
                            <p className="text-xs">{shopSettings?.bankName}</p>
                            <p className="text-sm font-bold text-blue-600">{shopSettings?.bankAccount}</p>
                            <p className="text-xs">{shopSettings?.bankOwner}</p>
                            <p className="text-xs mt-1 font-medium">Nội dung: {order.code}</p>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className={`text-center mt-4 pt-2 border-t border-dashed border-gray-200 ${isA5 ? "text-[10px]" : "text-xs"}`}>
                    <p className="text-gray-500">Cảm ơn quý khách!</p>
                </div>
            </div>
        );
    }
);

OrderReceipt.displayName = "OrderReceipt";
