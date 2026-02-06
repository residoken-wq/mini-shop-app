"use client";

import { Gift, Percent } from "lucide-react";
import { Promotion, formatCurrency } from "../../types";

interface PromotionBannerProps {
    promotions: Promotion[];
}

export function PromotionBanner({ promotions }: PromotionBannerProps) {
    if (promotions.length === 0) return null;

    const getBannerUrl = (url: string | null) => {
        if (!url) return undefined;
        try {
            // Handle Google Drive links
            if (url.includes('drive.google.com')) {
                const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (idMatch && idMatch[1]) {
                    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1200`;
                }
            }
            return url;
        } catch (e) {
            return url;
        }
    };

    return promotions.length > 0 ? getBannerUrl : null;
}

export function PromotionImages({ promotions }: PromotionBannerProps) {
    if (promotions.length === 0) return null;

    const getBannerUrl = (url: string | null) => {
        if (!url) return undefined;
        try {
            // Handle Google Drive links
            if (url.includes('drive.google.com')) {
                const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (idMatch && idMatch[1]) {
                    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1200`;
                }
            }
            return url;
        } catch (e) {
            return url;
        }
    };

    return (
        <div className="space-y-4">
            {promotions.map((promo) => (
                promo.bannerUrl && (
                    <div key={promo.id} className="relative w-full overflow-hidden rounded-lg">
                        <img
                            src={getBannerUrl(promo.bannerUrl)}
                            alt={promo.name}
                            className="w-full h-auto object-contain"
                        />
                    </div>
                )
            ))}
        </div>
    );
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
                        <div key={promo.id} className="bg-white/60 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <Percent className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">{promo.name}</p>
                                    {promo.description && (
                                        <div
                                            className="text-sm text-gray-600 prose prose-sm max-w-none [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
                                            dangerouslySetInnerHTML={{ __html: promo.description }}
                                        />
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
