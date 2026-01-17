"use client";
/* eslint-disable @next/next/no-img-element */

import { Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Product, CartItem, formatCurrency } from "../../types";
import { getImageUrl } from "@/lib/image-utils";

interface ProductCardProps {
    product: Product;
    cartItem: CartItem | undefined;
    promotionPrice: number | null;
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

    // Price per Display Unit (Estimated if ratio != 1)
    const displayPrice = basePrice * ratio;

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
                    <p className="text-xs text-gray-500 mt-0.5">{product.sku}</p>
                    {customerType === "wholesale" && product.hasWholesalePrice && (
                        <Badge className="mt-1 bg-purple-100 text-purple-700 text-xs">
                            Giá sỉ
                        </Badge>
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
                        <span className={cn("font-bold text-lg", promotionPrice !== null ? "text-green-600" : "text-purple-600")}>
                            {formatCurrency(displayPrice)}đ
                        </span>
                        <span className="text-xs text-gray-500">/{displayUnit}</span>
                    </div>

                    {/* Secondary/Base Price Info if using Sale Unit */}
                    {hasSaleUnit && (
                        <div className="text-[10px] text-gray-400">
                            (≈ {ratio} {product.unit}) • {formatCurrency(basePrice)}đ/{product.unit}
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
                    <span className="text-sm text-gray-500">Tạm tính{hasSaleUnit ? "*" : ""}:</span>
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
