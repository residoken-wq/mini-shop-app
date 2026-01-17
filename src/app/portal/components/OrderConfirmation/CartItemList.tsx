"use client";

import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CartItem, formatCurrency } from "../../types";
import { getImageUrl } from "@/lib/image-utils";

interface CartItemListProps {
    cart: CartItem[];
    getCartItemPrice: (product: Product, quantity: number) => number;
    onUpdateQuantity: (productId: string, delta: number) => void;
    onSetQuantity: (productId: string, qty: number) => void;
    onRemove: (productId: string) => void;
}

export function CartItemList({
    cart,
    getCartItemPrice,
    onUpdateQuantity,
    onSetQuantity,
    onRemove,
}: CartItemListProps) {
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="font-semibold">Sản phẩm ({cart.length})</h3>
                </div>
                <span className="text-sm text-gray-500">
                    {totalQuantity} đơn vị
                </span>
            </div>

            <div className="space-y-3">
                {cart.map((item) => {
                    const effectivePrice = getCartItemPrice(
                        item.product,
                        item.quantity
                    );

                    return (
                        <div
                            key={item.product.id}
                            className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 transition-colors"
                        >
                            {/* Top row: Image + Name + Delete */}
                            <div className="flex items-start gap-3">
                                {/* Product Image */}
                                <div className="w-12 h-12 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                    {item.product.imageUrl ? (
                                        <img
                                            src={getImageUrl(item.product.imageUrl)}
                                            alt={item.product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-lg">🍈</span>
                                    )}
                                </div>

                                {/* Name + Price */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 text-sm line-clamp-2">
                                        {item.product.name}
                                    </h4>
                                    <p className="text-xs text-gray-500">{item.product.sku}</p>
                                    <p className="text-sm text-purple-600 font-medium mt-1">
                                        {formatCurrency(effectivePrice)}đ/{item.product.unit}
                                    </p>
                                </div>

                                {/* Delete button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                                    onClick={() => onRemove(item.product.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Bottom row: Quantity + Total */}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                                {/* Quantity controls */}
                                <div className="flex items-center gap-1">
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-7 w-7"
                                        onClick={() => onUpdateQuantity(item.product.id, -1)}
                                    >
                                        <Minus className="w-3 h-3" />
                                    </Button>
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) =>
                                            onSetQuantity(item.product.id, parseInt(e.target.value) || 0)
                                        }
                                        className="w-14 h-7 text-center text-sm px-1"
                                        min="0"
                                    />
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-7 w-7"
                                        onClick={() => onUpdateQuantity(item.product.id, 1)}
                                    >
                                        <Plus className="w-3 h-3" />
                                    </Button>
                                </div>

                                {/* Total Price */}
                                <p className="font-bold text-lg text-purple-600">
                                    {formatCurrency(effectivePrice * item.quantity)}đ
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
