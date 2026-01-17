"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, RefreshCw, Package, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { completeDelivery } from "./actions";

interface DeliveryItem {
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    price: number;
    unit: string;
}

interface DeliveryDialogProps {
    open: boolean;
    onClose: () => void;
    order: {
        id: string;
        code: string;
        total: number;
        paymentMethod: string;
        shippingFee?: number;
        shippingPaidBy?: string;
        items: DeliveryItem[];
    };
    onSuccess: () => void;
}

export function DeliveryDialog({ open, onClose, order, onSuccess }: DeliveryDialogProps) {
    const [returnedItems, setReturnedItems] = useState<Record<string, number>>({});
    const [refundAmount, setRefundAmount] = useState(0);
    const [returnNote, setReturnNote] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

    // Calculate total returned value
    const calculateReturnedAmount = () => {
        return order.items.reduce((total, item) => {
            const returnedQty = returnedItems[item.id] || 0;
            return total + (returnedQty * item.price);
        }, 0);
    };

    const returnedAmount = calculateReturnedAmount();
    const hasReturns = returnedAmount > 0;

    // Calculate final amount
    const shippingFee = order.shippingFee || 0;
    const customerPaysShipping = order.shippingPaidBy === "CUSTOMER";
    const finalAmount = order.total - returnedAmount + (customerPaysShipping ? shippingFee : 0);

    const handleSubmit = async () => {
        setIsLoading(true);
        const result = await completeDelivery(order.id, {
            returnedAmount,
            refundAmount,
            returnNote: returnNote.trim() || undefined
        });

        if (result.success) {
            onSuccess();
            onClose();
            // Reset state
            setReturnedItems({});
            setRefundAmount(0);
            setReturnNote("");
        } else {
            alert(result.error || "Lỗi hoàn tất đơn hàng");
        }
        setIsLoading(false);
    };

    const handleReturnQtyChange = (itemId: string, value: number, maxQty: number) => {
        const qty = Math.max(0, Math.min(value, maxQty));
        setReturnedItems(prev => ({
            ...prev,
            [itemId]: qty
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Hoàn tất đơn hàng - {order.code}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4">
                    {/* Items List with Return Input */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Sản phẩm đã giao
                        </Label>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Sản phẩm</th>
                                        <th className="px-3 py-2 text-right w-16">SL</th>
                                        <th className="px-3 py-2 text-center w-24">Trả lại</th>
                                        <th className="px-3 py-2 text-right w-24">Tiền trả</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {order.items.map(item => {
                                        const returnedQty = returnedItems[item.id] || 0;
                                        const returnValue = returnedQty * item.price;

                                        return (
                                            <tr key={item.id}>
                                                <td className="px-3 py-2">
                                                    <p className="font-medium">{item.productName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatCurrency(item.price)}đ/{item.unit}
                                                    </p>
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={item.quantity}
                                                        step={0.1}
                                                        value={returnedQty || ""}
                                                        onChange={(e) => handleReturnQtyChange(
                                                            item.id,
                                                            parseFloat(e.target.value) || 0,
                                                            item.quantity
                                                        )}
                                                        className="h-8 w-20 text-center"
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className={cn(
                                                    "px-3 py-2 text-right font-medium",
                                                    returnValue > 0 && "text-red-600"
                                                )}>
                                                    {returnValue > 0 ? `-${formatCurrency(returnValue)}đ` : "-"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Return Summary */}
                    {hasReturns && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <span className="font-medium text-red-700">Có hàng trả lại</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-red-600">Tổng giá trị trả:</span>
                                <span className="font-bold text-red-700">
                                    {formatCurrency(returnedAmount)}đ
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Refund Amount (if pre-paid) */}
                    {order.paymentMethod === "QR" && hasReturns && (
                        <div className="space-y-2">
                            <Label>Số tiền hoàn trả khách (đã thanh toán CK)</Label>
                            <Input
                                type="number"
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                                placeholder="Nhập số tiền hoàn trả"
                            />
                            <p className="text-xs text-muted-foreground">
                                Khách đã thanh toán chuyển khoản, nhập số tiền cần hoàn lại
                            </p>
                        </div>
                    )}

                    {/* Return Note */}
                    {hasReturns && (
                        <div className="space-y-2">
                            <Label>Ghi chú trả hàng</Label>
                            <Input
                                value={returnNote}
                                onChange={(e) => setReturnNote(e.target.value)}
                                placeholder="Lý do trả hàng, tình trạng hàng..."
                            />
                        </div>
                    )}

                    {/* Final Summary */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span>Giá trị đơn hàng:</span>
                            <span>{formatCurrency(order.total)}đ</span>
                        </div>
                        {returnedAmount > 0 && (
                            <div className="flex items-center justify-between text-sm text-red-600">
                                <span>Hàng trả lại:</span>
                                <span>-{formatCurrency(returnedAmount)}đ</span>
                            </div>
                        )}
                        {shippingFee > 0 && customerPaysShipping && (
                            <div className="flex items-center justify-between text-sm">
                                <span>Phí ship (khách trả):</span>
                                <span>+{formatCurrency(shippingFee)}đ</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-green-200">
                            <span className="font-medium text-green-700">Tổng thu:</span>
                            <span className="font-bold text-lg text-green-700">
                                {formatCurrency(finalAmount)}đ
                            </span>
                        </div>
                        {refundAmount > 0 && (
                            <div className="flex items-center justify-between text-sm text-orange-600">
                                <span>Hoàn tiền khách:</span>
                                <span className="font-medium">{formatCurrency(refundAmount)}đ</span>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Hoàn tất đơn hàng
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
