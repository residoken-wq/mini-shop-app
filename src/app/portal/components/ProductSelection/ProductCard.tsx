"use client";
/* eslint-disable @next/next/no-img-element */

import { Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Product, CartItem, formatCurrency, Promotion } from "../../types";
import { getImageUrl } from "@/lib/image-utils";

interface ProductCardProps {
    product: Product;
    cartItem: CartItem | undefined;
    promotionPrice: number | null;
    activePromotion?: { promo: Promotion; promoProduct: { tiers: { minQuantity: number; price: number }[] } } | null;
    customerType: "retail" | "wholesale" | null;
    onAdd: () => void;
    onUpdateQuantity: (delta: number) => void;
    onSetQuantity: (qty: number) => void;
    onRemove: () => void;
}

export function ProductCard({
    product,
    cartItem,
    promotionPrice,
    activePromotion,
    customerType,
    onAdd,
    onUpdateQuantity,
    onSetQuantity,
    onRemove,
}: ProductCardProps) {
    const inCart = cartItem !== undefined;
    const quantity = cartItem?.quantity || 0;

    // Base Price (per kg/base unit)
    const basePrice = promotionPrice !== null ? promotionPrice : product.displayPrice;

    // Determine Display Unit and Price
    const hasSaleUnit = !!product.saleUnit;
    const displayUnit = hasSaleUnit ? product.saleUnit : product.unit;
    const ratio = hasSaleUnit ? (product.saleRatio || 1) : 1;

    // Tiered Price Logic
    // Find applicable tier based on CURRENT quantity
    const baseQty = quantity * ratio;
    const activeTier = !promotionPrice && product.priceTiers
        ? product.priceTiers.filter(t => baseQty >= t.minQuantity).sort((a, b) => b.minQuantity - a.minQuantity)[0]
        : null;

    const effectiveBasePrice = activeTier ? activeTier.price : basePrice;

    // Price per Display Unit
    const displayPrice = effectiveBasePrice * ratio;

    // Total Estimation
    const totalEstimate = displayPrice * quantity;

    return (
        <div className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all ${product.isExpired ? "border-2 border-red-300 bg-red-50" : ""}`}>
            {/* Top: Image + Info */}
            <div className="flex gap-3">
                {/* Product Image */}
                <div className="w-16 h-16 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                    {product.imageUrl ? (
                        <img
                            src={getImageUrl(product.imageUrl)}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-2xl">🍈</span>
                    )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 leading-tight line-clamp-2">
                        {product.name}
                    </h3>

                    {/* Promotion Display for Retail */}
                    {customerType === "retail" && activePromotion && (
                        <div className="mt-1 flex flex-col gap-1">
                            <Badge className="w-fit bg-red-50 text-red-600 border-red-100 text-[10px] px-1.5 py-0.5 hover:bg-red-50">
                                🎁 {activePromotion.promo.name}
                            </Badge>
                            <div className="flex flex-wrap gap-1">
                                {activePromotion.promoProduct.tiers.map(t => (
                                    <span
                                        key={t.minQuantity}
                                        className={cn(
                                            "text-[10px] px-1 py-0.5 rounded border transition-colors",
                                            baseQty >= t.minQuantity
                                                ? "bg-red-100 border-red-200 text-red-700 font-bold"
                                                : "bg-gray-50 border-gray-100 text-gray-500"
                                        )}
                                    >
                                        Mua ≥{t.minQuantity}: {formatCurrency(t.price)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {customerType === "wholesale" && product.hasWholesalePrice && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            <Badge className="bg-purple-100 text-purple-700 text-xs hover:bg-purple-100">
                                Giá sỉ
                            </Badge>
                            {/* Display Tiers if available */}
                            {product.priceTiers && product.priceTiers.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {product.priceTiers.map(t => (
                                        <span key={t.minQuantity} className={`text-[10px] px-1 py-0.5 rounded border ${baseQty >= t.minQuantity ? 'bg-green-100 border-green-200 text-green-700 font-bold' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                            ≥{t.minQuantity}: {formatCurrency(t.price)}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {product.isExpired && (
                        <Badge className="mt-1 bg-red-100 text-red-700 text-xs ml-1">
                            Hết hạn
                        </Badge>
                    )}
                </div>
            </div>

            {/* Price + Actions Row */}
            <div className="mt-3 flex items-center justify-between">
                {/* Price Display */}
                <div>
                    <div className="flex items-center gap-1">
                        <span className={cn("font-bold text-lg", promotionPrice !== null ? "text-green-600" : (activeTier ? "text-blue-600" : "text-purple-600"))}>
                            {formatCurrency(displayPrice)}đ
                        </span>
                        <span className="text-xs text-gray-500">/{displayUnit}</span>
                    </div>

                    {/* Secondary/Base Price Info if using Sale Unit */}
                    {hasSaleUnit && (
                        <div className="text-[10px] text-gray-400">
                            (≈ {ratio} {product.unit}) • {formatCurrency(effectiveBasePrice)}đ/{product.unit}
                        </div>
                    )}

                    {/* Original Price Strikethrough if Promotion */}
                    {promotionPrice !== null && (
                        <div className="text-xs text-gray-400 line-through">
                            {formatCurrency(product.displayPrice * ratio)}đ
                        </div>
                    )}
                </div>

                {/* Cart Actions */}
                {!inCart ? (
                    <Button
                        size="sm"
                        onClick={onAdd}
                        className="bg-purple-500 hover:bg-purple-600"
                        disabled={product.isExpired}
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                ) : (
                    <div className="flex items-center gap-1">
                        <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => onUpdateQuantity(-1)}
                        >
                            <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                            type="number"
                            value={quantity}
                            onChange={(e) => onSetQuantity(parseInt(e.target.value) || 0)}
                            className="w-14 h-8 text-center text-sm px-1"
                            min="0"
                        />
                        <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => onUpdateQuantity(1)}
                        >
                            <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={onRemove}
                        >
                            <Trash2 className="w-3 h-3" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Total if in cart */}
            {inCart && (
                <div className="mt-2 pt-2 border-t flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                        Tạm tính{hasSaleUnit ? "*" : ""}
                        {activeTier && <span className="text-xs ml-1 text-blue-600">(Đã áp dụng giá sỉ)</span>}
                    </span>
                    <span className="font-bold text-purple-600">
                        {formatCurrency(totalEstimate)}đ
                    </span>
                </div>
            )}
        </div>
    );
}

// Helper for classNames (simple version or import from utils)
function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(" ");
}
