"use client";

import { Gift, Percent } from "lucide-react";
import { Promotion, formatCurrency } from "../../types";

interface PromotionBannerProps {
    promotions: Promotion[];
}

export function PromotionBanner({ promotions }: PromotionBannerProps) {
    if (promotions.length === 0) return null;

    return (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
                <Gift className="w-5 h-5" />
                <span className="font-semibold">Chương trình khuyến mãi</span>
            </div>
            <div className="space-y-2">
                {promotions.map((promo) => (
                    <div key={promo.id} className="bg-white/60 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <Percent className="w-4 h-4 text-orange-500 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-medium text-gray-800">{promo.name}</p>
                                {promo.description && (
                                    <p className="text-sm text-gray-600">{promo.description}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                    Đến {new Date(promo.endDate).toLocaleDateString('vi-VN')}
                                </p>
                            </div>
                        </div>
                        {/* Show promotional products */}
                        <div className="mt-2 flex flex-wrap gap-2">
                            {promo.products.slice(0, 3).map((pp) => (
                                <div key={pp.productId} className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                                    <span className="font-medium">{pp.productName}</span>
                                    {pp.tiers.length > 0 && (
                                        <span className="ml-1">
                                            - Mua {pp.tiers[0].minQuantity}+ chỉ {formatCurrency(pp.tiers[0].price)}đ
                                        </span>
                                    )}
                                </div>
                            ))}
                            {promo.products.length > 3 && (
                                <span className="text-xs text-amber-600">
                                    +{promo.products.length - 3} sản phẩm khác
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
