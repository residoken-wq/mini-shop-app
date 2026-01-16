"use client";

import { useState } from "react";
import { OrderItem, Product } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Save, X, Percent, DollarSign, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateOrderItem, updateOrderDiscount, deleteOrderItem } from "./actions";

type OrderItemWithProduct = OrderItem & { product: Product };

interface OrderEditableItemsProps {
    orderId: string;
    items: OrderItemWithProduct[];
    discount: number;
    status: string;
    onUpdate: () => void;
}

const NON_EDITABLE_STATUSES = ["SHIPPING", "COMPLETED"];

export function OrderEditableItems({ orderId, items, discount, status, onUpdate }: OrderEditableItemsProps) {
    const [editingItems, setEditingItems] = useState<Record<string, { quantity: number; price: number }>>({});
    const [currentDiscount, setCurrentDiscount] = useState(discount);
    const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
    const [discountPercent, setDiscountPercent] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    const isEditable = !NON_EDITABLE_STATUSES.includes(status);

    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

    const getSubtotal = () => {
        return items.reduce((sum, item) => {
            const edited = editingItems[item.id];
            if (edited) {
                return sum + (edited.price * edited.quantity);
            }
            return sum + (item.price * item.quantity);
        }, 0);
    };

    const getTotal = () => {
        const subtotal = getSubtotal();
        if (discountType === "percent" && discountPercent > 0) {
            return subtotal - (subtotal * discountPercent / 100);
        }
        return subtotal - currentDiscount;
    };

    const handleEditItem = (itemId: string, quantity: number, price: number) => {
        setEditingItems(prev => ({
            ...prev,
            [itemId]: { quantity, price }
        }));
    };

    const handleSaveItem = async (itemId: string) => {
        const edited = editingItems[itemId];
        if (!edited) return;

        setIsSaving(true);
        const result = await updateOrderItem(itemId, edited);
        if (result.success) {
            setEditingItems(prev => {
                const newState = { ...prev };
                delete newState[itemId];
                return newState;
            });
            onUpdate();
        }
        setIsSaving(false);
    };

    const handleCancelEdit = (itemId: string) => {
        setEditingItems(prev => {
            const newState = { ...prev };
            delete newState[itemId];
            return newState;
        });
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm("Xóa sản phẩm này khỏi đơn hàng?")) return;
        setIsSaving(true);
        const result = await deleteOrderItem(itemId);
        if (result.success) {
            onUpdate();
        }
        setIsSaving(false);
    };

    const handleSaveDiscount = async () => {
        setIsSaving(true);
        let finalDiscount = currentDiscount;
        if (discountType === "percent" && discountPercent > 0) {
            finalDiscount = getSubtotal() * discountPercent / 100;
        }
        const result = await updateOrderDiscount(orderId, finalDiscount);
        if (result.success) {
            onUpdate();
        }
        setIsSaving(false);
    };

    return (
        <div className="space-y-4">
            {/* Items List */}
            <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 flex items-center justify-between">
                    <span>📦 Danh sách sản phẩm</span>
                    {!isEditable && (
                        <Badge variant="secondary" className="text-xs">
                            Không thể chỉnh sửa (đơn đang giao/hoàn tất)
                        </Badge>
                    )}
                </div>
                <div className="divide-y">
                    {items.map(item => {
                        const edited = editingItems[item.id];
                        const isEditing = !!edited;
                        const displayQty = isEditing ? edited.quantity : item.quantity;
                        const displayPrice = isEditing ? edited.price : item.price;

                        return (
                            <div key={item.id} className="p-3 space-y-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{item.product.name}</p>
                                        <p className="text-xs text-gray-500">SKU: {item.product.sku}</p>
                                    </div>
                                    {isEditable && (
                                        <div className="flex gap-1">
                                            {isEditing ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleSaveItem(item.id)}
                                                        disabled={isSaving}
                                                        className="h-7 w-7 p-0 text-green-600"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleCancelEdit(item.id)}
                                                        className="h-7 w-7 p-0"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="h-7 w-7 p-0 text-red-500"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    {/* Quantity */}
                                    <div>
                                        <label className="text-xs text-gray-500">SL</label>
                                        {isEditable ? (
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={displayQty}
                                                onChange={(e) => handleEditItem(item.id, parseFloat(e.target.value) || 0, displayPrice)}
                                                className="h-8 text-sm"
                                            />
                                        ) : (
                                            <p className="font-medium">{displayQty}</p>
                                        )}
                                    </div>

                                    {/* Price */}
                                    <div>
                                        <label className="text-xs text-gray-500">
                                            Đơn giá
                                            {isEditing && item.price !== displayPrice && (
                                                <span className="ml-1 text-orange-500">
                                                    (cũ: {formatCurrency(item.price)})
                                                </span>
                                            )}
                                        </label>
                                        {isEditable ? (
                                            <Input
                                                type="number"
                                                value={displayPrice}
                                                onChange={(e) => handleEditItem(item.id, displayQty, parseFloat(e.target.value) || 0)}
                                                className="h-8 text-sm"
                                            />
                                        ) : (
                                            <p className="font-medium">{formatCurrency(displayPrice)}đ</p>
                                        )}
                                    </div>

                                    {/* Subtotal */}
                                    <div>
                                        <label className="text-xs text-gray-500">T.Tiền</label>
                                        <p className={cn(
                                            "font-bold",
                                            isEditing && "text-purple-600"
                                        )}>
                                            {formatCurrency(displayQty * displayPrice)}đ
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Discount Section */}
            {isEditable && (
                <div className="border rounded-lg p-3 bg-orange-50">
                    <p className="text-sm font-medium text-orange-700 mb-2">🏷️ Giảm giá</p>

                    {/* Discount Type Toggle */}
                    <div className="flex gap-2 mb-3">
                        <Button
                            size="sm"
                            variant={discountType === "fixed" ? "default" : "outline"}
                            onClick={() => setDiscountType("fixed")}
                            className="flex-1"
                        >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Số tiền
                        </Button>
                        <Button
                            size="sm"
                            variant={discountType === "percent" ? "default" : "outline"}
                            onClick={() => setDiscountType("percent")}
                            className="flex-1"
                        >
                            <Percent className="w-4 h-4 mr-1" />
                            Phần trăm
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        {discountType === "fixed" ? (
                            <Input
                                type="number"
                                value={currentDiscount}
                                onChange={(e) => setCurrentDiscount(parseFloat(e.target.value) || 0)}
                                placeholder="Nhập số tiền giảm"
                                className="flex-1"
                            />
                        ) : (
                            <div className="flex-1 flex gap-2 items-center">
                                <Input
                                    type="number"
                                    value={discountPercent}
                                    onChange={(e) => setDiscountPercent(Math.min(100, parseFloat(e.target.value) || 0))}
                                    placeholder="%"
                                    className="w-20"
                                />
                                <span className="text-sm text-gray-600">
                                    = {formatCurrency(getSubtotal() * discountPercent / 100)}đ
                                </span>
                            </div>
                        )}
                        <Button onClick={handleSaveDiscount} disabled={isSaving}>
                            <Save className="w-4 h-4 mr-1" />
                            Lưu
                        </Button>
                    </div>
                </div>
            )}

            {/* Summary */}
            <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tạm tính:</span>
                    <span>{formatCurrency(getSubtotal())}đ</span>
                </div>
                {(currentDiscount > 0 || discountPercent > 0) && (
                    <div className="flex justify-between text-sm text-orange-600">
                        <span>Giảm giá:</span>
                        <span>
                            -{discountType === "percent"
                                ? formatCurrency(getSubtotal() * discountPercent / 100)
                                : formatCurrency(currentDiscount)
                            }đ
                        </span>
                    </div>
                )}
                <div className="flex justify-between text-lg font-bold text-purple-600">
                    <span>Thành tiền:</span>
                    <span>{formatCurrency(getTotal())}đ</span>
                </div>
            </div>
        </div>
    );
}
