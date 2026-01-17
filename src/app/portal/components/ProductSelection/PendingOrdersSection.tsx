"use client";

import { Clock, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PendingOrder, formatCurrency } from "../../types";

interface PendingOrdersSectionProps {
    pendingOrders: PendingOrder[];
}

export function PendingOrdersSection({ pendingOrders }: PendingOrdersSectionProps) {
    if (pendingOrders.length === 0) return null;

    return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">Đơn hàng đang chờ</span>
            </div>
            <div className="space-y-2">
                {pendingOrders.map((order) => (
                    <div
                        key={order.id}
                        className="bg-white rounded-lg p-3 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <Package className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="font-medium">{order.code}</p>
                                <p className="text-sm text-gray-500">
                                    {order.itemCount} sản phẩm •{" "}
                                    {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-purple-600">
                                {formatCurrency(order.total)}đ
                            </p>
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                                {order.status}
                            </Badge>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
