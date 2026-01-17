"use client";

import { Gift } from "lucide-react";
import { CartItem, formatCurrency } from "../../types";

interface OrderSummaryProps {
    cart: CartItem[];
    productTotal: number;
    productTotalWithPromo: number;
    shippingFee: number;
    finalTotal: number;
}

export function OrderSummary({
    cart,
    productTotal,
    productTotalWithPromo,
    shippingFee,
    finalTotal,
}: OrderSummaryProps) {
    const discountAmount = productTotal - productTotalWithPromo;
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex justify-between items-center py-3 border-b">
                <span className="text-gray-600">Tổng sản phẩm</span>
                <span className="font-medium">{cart.length} loại</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
                <span className="text-gray-600">Tổng số lượng</span>
                <span className="font-medium">{totalQuantity} đơn vị</span>
            </div>

            {/* Bill Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-gray-600">
                    <span>Tạm tính</span>
                    <span>{formatCurrency(productTotal)}đ</span>
                </div>

                {/* Promotion discount */}
                {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                        <span className="flex items-center gap-1">
                            <Gift className="w-4 h-4" />
                            Khuyến mãi
                        </span>
                        <span>-{formatCurrency(discountAmount)}đ</span>
                    </div>
                )}

                <div className="flex justify-between text-gray-600">
                    <span>Phí vận chuyển</span>
                    <span>{formatCurrency(shippingFee)}đ</span>
                </div>

                <div className="flex justify-between font-bold text-lg pt-2 border-t text-purple-600">
                    <span>Tổng cộng</span>
                    <span>{formatCurrency(finalTotal)}đ</span>
                </div>
            </div>
        </div>
    );
}
