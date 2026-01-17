"use client";

import { CreditCard, QrCode, Wallet } from "lucide-react";
import { BankInfo } from "../../types";

interface PaymentMethodSelectorProps {
    paymentMethod: "COD" | "QR" | "CREDIT";
    customerType: "retail" | "wholesale" | null;
    bankInfo: BankInfo | null;
    onPaymentMethodChange: (method: "COD" | "QR" | "CREDIT") => void;
}

export function PaymentMethodSelector({
    paymentMethod,
    customerType,
    bankInfo,
    onPaymentMethodChange,
}: PaymentMethodSelectorProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="font-semibold">Phương thức thanh toán</h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {/* COD */}
                <button
                    onClick={() => onPaymentMethodChange("COD")}
                    className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === "COD"
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                >
                    <div className="flex flex-col items-center gap-2">
                        <Wallet className={`w-6 h-6 ${paymentMethod === "COD" ? "text-purple-600" : "text-gray-400"
                            }`} />
                        <span className={`text-sm font-medium ${paymentMethod === "COD" ? "text-purple-700" : "text-gray-600"
                            }`}>Tiền mặt</span>
                        <span className="text-xs text-gray-500">COD</span>
                    </div>
                </button>

                {/* QR */}
                <button
                    onClick={() => onPaymentMethodChange("QR")}
                    className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === "QR"
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                >
                    <div className="flex flex-col items-center gap-2">
                        <QrCode className={`w-6 h-6 ${paymentMethod === "QR" ? "text-purple-600" : "text-gray-400"
                            }`} />
                        <span className={`text-sm font-medium ${paymentMethod === "QR" ? "text-purple-700" : "text-gray-600"
                            }`}>Chuyển khoản</span>
                        <span className="text-xs text-gray-500">QR Code</span>
                    </div>
                </button>

                {/* Credit (Wholesale Only) */}
                <button
                    onClick={() => customerType === "wholesale" && onPaymentMethodChange("CREDIT")}
                    disabled={customerType !== "wholesale"}
                    className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === "CREDIT"
                            ? "border-purple-500 bg-purple-50"
                            : customerType === "wholesale"
                                ? "border-gray-200 hover:border-gray-300"
                                : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                        }`}
                >
                    <div className="flex flex-col items-center gap-2">
                        <CreditCard className={`w-6 h-6 ${paymentMethod === "CREDIT" ? "text-purple-600" : "text-gray-400"
                            }`} />
                        <span className={`text-sm font-medium ${paymentMethod === "CREDIT" ? "text-purple-700" : "text-gray-600"
                            }`}>Công nợ</span>
                        <span className="text-xs text-gray-500">Chỉ sỉ</span>
                    </div>
                </button>
            </div>

            {/* Bank Info for QR */}
            {paymentMethod === "QR" && bankInfo && (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">Thông tin chuyển khoản:</h4>
                    <div className="space-y-1 text-sm">
                        <p><span className="text-gray-600">Ngân hàng:</span> <span className="font-medium">{bankInfo.bankName}</span></p>
                        <p><span className="text-gray-600">Số TK:</span> <span className="font-medium">{bankInfo.bankAccount}</span></p>
                        <p><span className="text-gray-600">Chủ TK:</span> <span className="font-medium">{bankInfo.bankOwner}</span></p>
                    </div>
                </div>
            )}
        </div>
    );
}
