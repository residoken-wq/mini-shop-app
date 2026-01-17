"use client";

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
    const effectivePrice = promotionPrice !== null ? promotionPrice : product.displayPrice;

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
                {/* Price */}
                <div>
                    {promotionPrice !== null ? (
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-lg text-green-600">
                                {formatCurrency(promotionPrice)}đ
                            </span>
                            <span className="text-sm text-gray-400 line-through">
                                {formatCurrency(product.displayPrice)}đ
                            </span>
                        </div>
                    ) : (
                        <span className="font-bold text-lg text-purple-600">
                            {formatCurrency(product.displayPrice)}đ
                        </span>
                    )}
                    <span className="text-xs text-gray-500">/{product.unit}</span>
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
                    <span className="text-sm text-gray-500">Thành tiền:</span>
                    <span className="font-bold text-purple-600">
                        {formatCurrency(effectivePrice * quantity)}đ
                    </span>
                </div>
            )}
        </div>
    );
}
