"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Truck, Plus, RefreshCw } from "lucide-react";
import { getCarriers, createCarrier, startShipping } from "./actions";

interface ShippingDialogProps {
    open: boolean;
    onClose: () => void;
    order: {
        id: string;
        code: string;
        recipientName?: string | null;
        recipientPhone?: string | null;
        deliveryAddress?: string | null;
        total: number;
    };
    onSuccess: () => void;
}

type Carrier = {
    id: string;
    name: string;
    phone: string | null;
};

export function ShippingDialog({ open, onClose, order, onSuccess }: ShippingDialogProps) {
    const [carriers, setCarriers] = useState<Carrier[]>([]);
    const [selectedCarrier, setSelectedCarrier] = useState("");
    const [shippingFee, setShippingFee] = useState(0);
    const [shippingPaidBy, setShippingPaidBy] = useState<"SHOP" | "CUSTOMER">("CUSTOMER");
    const [isLoading, setIsLoading] = useState(false);
    const [isAddingCarrier, setIsAddingCarrier] = useState(false);
    const [newCarrierName, setNewCarrierName] = useState("");
    const [newCarrierPhone, setNewCarrierPhone] = useState("");

    useEffect(() => {
        if (open) {
            loadCarriers();
        }
    }, [open]);

    const loadCarriers = async () => {
        const result = await getCarriers();
        setCarriers(result as Carrier[]);
    };

    const handleAddCarrier = async () => {
        if (!newCarrierName.trim()) return;
        setIsLoading(true);
        const result = await createCarrier(newCarrierName.trim(), newCarrierPhone.trim() || undefined);
        if (result.success && result.carrier) {
            await loadCarriers();
            setSelectedCarrier(result.carrier.name);
            setNewCarrierName("");
            setNewCarrierPhone("");
            setIsAddingCarrier(false);
        }
        setIsLoading(false);
    };

    const handleSubmit = async () => {
        if (!selectedCarrier) {
            alert("Vui lòng chọn nhà vận chuyển");
            return;
        }

        setIsLoading(true);
        const result = await startShipping(order.id, {
            carrierName: selectedCarrier,
            shippingFee,
            shippingPaidBy
        });

        if (result.success) {
            onSuccess();
            onClose();
        } else {
            alert(result.error || "Lỗi bắt đầu giao hàng");
        }
        setIsLoading(false);
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-orange-500" />
                        Giao hàng - {order.code}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Delivery Address */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="font-medium text-blue-900">
                                    {order.recipientName || "Khách hàng"}
                                </p>
                                {order.recipientPhone && (
                                    <p className="text-blue-700">{order.recipientPhone}</p>
                                )}
                                <p className="text-blue-600 mt-1">
                                    {order.deliveryAddress || "Chưa có địa chỉ"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Order Total */}
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <span className="text-sm text-muted-foreground">Giá trị đơn hàng:</span>
                        <span className="font-bold text-lg">{formatCurrency(order.total)}đ</span>
                    </div>

                    {/* Carrier Selection */}
                    <div className="space-y-2">
                        <Label>Nhà vận chuyển</Label>
                        {!isAddingCarrier ? (
                            <div className="flex gap-2">
                                <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Chọn nhà vận chuyển" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {carriers.map(carrier => (
                                            <SelectItem key={carrier.id} value={carrier.name}>
                                                {carrier.name}
                                                {carrier.phone && ` - ${carrier.phone}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setIsAddingCarrier(true)}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                                <Input
                                    placeholder="Tên nhà vận chuyển"
                                    value={newCarrierName}
                                    onChange={(e) => setNewCarrierName(e.target.value)}
                                />
                                <Input
                                    placeholder="Số điện thoại (tùy chọn)"
                                    value={newCarrierPhone}
                                    onChange={(e) => setNewCarrierPhone(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsAddingCarrier(false)}
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleAddCarrier}
                                        disabled={!newCarrierName.trim() || isLoading}
                                    >
                                        Thêm
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Shipping Fee */}
                    <div className="space-y-2">
                        <Label>Phí vận chuyển</Label>
                        <Input
                            type="number"
                            value={shippingFee}
                            onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
                            placeholder="Nhập phí vận chuyển"
                        />
                    </div>

                    {/* Who Pays */}
                    <div className="space-y-2">
                        <Label>Ai trả phí vận chuyển?</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={shippingPaidBy === "CUSTOMER" ? "default" : "outline"}
                                className="flex-1"
                                onClick={() => setShippingPaidBy("CUSTOMER")}
                            >
                                👤 Khách trả
                            </Button>
                            <Button
                                type="button"
                                variant={shippingPaidBy === "SHOP" ? "default" : "outline"}
                                className="flex-1"
                                onClick={() => setShippingPaidBy("SHOP")}
                            >
                                🏪 Shop trả
                            </Button>
                        </div>
                    </div>

                    {/* Summary */}
                    {shippingFee > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <div className="flex items-center justify-between text-sm">
                                <span>Phí ship:</span>
                                <span className="font-medium">{formatCurrency(shippingFee)}đ</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span>Người trả:</span>
                                <Badge variant="outline">
                                    {shippingPaidBy === "CUSTOMER" ? "Khách hàng" : "Shop"}
                                </Badge>
                            </div>
                            {shippingPaidBy === "CUSTOMER" && (
                                <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-orange-200">
                                    <span className="font-medium">Tổng thu khách:</span>
                                    <span className="font-bold text-orange-700">
                                        {formatCurrency(order.total + shippingFee)}đ
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || !selectedCarrier}
                        className="bg-orange-600 hover:bg-orange-700"
                    >
                        {isLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Truck className="h-4 w-4 mr-2" />
                        )}
                        Bắt đầu giao hàng
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
