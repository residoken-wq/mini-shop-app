"use client";

import { CheckCircle, XCircle, Home, Copy, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderResult as OrderResultType, BankInfo, formatCurrency } from "../types";

interface OrderResultProps {
    result: OrderResultType;
    bankInfo: BankInfo | null;
    onReset: () => void;
}

export function OrderResult({ result, bankInfo, onReset }: OrderResultProps) {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    if (result.success) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center space-y-6">
                <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Đặt hàng thành công!</h2>
                    <p className="text-gray-600 mt-2">Cảm ơn bạn đã đặt hàng</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-gray-600">Mã đơn hàng</p>
                    <p className="text-2xl font-bold text-purple-600">{result.orderCode}</p>
                    <p className="text-lg font-medium text-gray-800">
                        Tổng tiền: {formatCurrency(result.total || 0)}đ
                    </p>
                </div>

                {/* Bank transfer info if QR payment */}
                {result.paymentMethod === "QR" && bankInfo && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 space-y-3 text-left">
                        <div className="flex items-center gap-2 text-blue-800 font-medium">
                            <QrCode className="w-5 h-5" />
                            Thông tin chuyển khoản
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Ngân hàng:</span>
                                <span className="font-medium">{bankInfo.bankName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Số TK:</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{bankInfo.bankAccount}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => copyToClipboard(bankInfo.bankAccount)}
                                    >
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Chủ TK:</span>
                                <span className="font-medium">{bankInfo.bankOwner}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Nội dung CK:</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{result.orderCode}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => copyToClipboard(result.orderCode || "")}
                                    >
                                        <Copy className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <Button onClick={onReset} className="w-full">
                    <Home className="w-4 h-4 mr-2" />
                    Đặt đơn mới
                </Button>
            </div>
        );
    }

    // Error state
    return (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Đặt hàng thất bại</h2>
                <p className="text-red-600 mt-2">{result.error}</p>
            </div>
            <Button onClick={onReset} variant="outline" className="w-full">
                Thử lại
            </Button>
        </div>
    );
}
