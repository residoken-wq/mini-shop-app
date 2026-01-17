"use client";

import { ShoppingCart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartItem, formatCurrency } from "../../types";

interface BottomCartBarProps {
    cart: CartItem[];
    total: number;
    hasExpiredItems: boolean;
    onConfirm: () => void;
}

export function BottomCartBar({ cart, total, hasExpiredItems, onConfirm }: BottomCartBarProps) {
    if (cart.length === 0) return null;

    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <>
            {/* Fixed Bottom Cart Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <ShoppingCart className="w-6 h-6" />
                            <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {totalQuantity}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{cart.length} sản phẩm</p>
                            <p className="font-bold text-lg">{formatCurrency(total)}đ</p>
                        </div>
                    </div>
                    <Button
                        onClick={onConfirm}
                        className="bg-gradient-to-r from-purple-500 to-pink-500"
                        disabled={hasExpiredItems}
                    >
                        Xác nhận đơn
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>

            {/* Spacer for fixed cart */}
            <div className="h-24" />
        </>
    );
}
