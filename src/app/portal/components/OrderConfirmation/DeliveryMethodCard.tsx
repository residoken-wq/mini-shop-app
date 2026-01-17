"use client";

import { Truck, Store } from "lucide-react";

interface DeliveryMethodCardProps {
    deliveryMethod: "PICKUP" | "DELIVERY";
    onMethodChange: (method: "PICKUP" | "DELIVERY") => void;
}

export function DeliveryMethodCard({ deliveryMethod, onMethodChange }: DeliveryMethodCardProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    🚚
                </div>
                <h3 className="font-semibold">Phương thức nhận hàng</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Delivery Option */}
                <button
                    onClick={() => onMethodChange("DELIVERY")}
                    className={`p-4 rounded-xl border-2 transition-all ${deliveryMethod === "DELIVERY"
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                >
                    <div className="flex flex-col items-center gap-2">
                        <Truck className={`w-6 h-6 ${deliveryMethod === "DELIVERY" ? "text-purple-600" : "text-gray-400"
                            }`} />
                        <span className={`font-medium ${deliveryMethod === "DELIVERY" ? "text-purple-700" : "text-gray-600"
                            }`}>
                            Giao hàng
                        </span>
                    </div>
                </button>

                {/* Pickup Option */}
                <button
                    onClick={() => onMethodChange("PICKUP")}
                    className={`p-4 rounded-xl border-2 transition-all ${deliveryMethod === "PICKUP"
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                >
                    <div className="flex flex-col items-center gap-2">
                        <Store className={`w-6 h-6 ${deliveryMethod === "PICKUP" ? "text-purple-600" : "text-gray-400"
                            }`} />
                        <span className={`font-medium ${deliveryMethod === "PICKUP" ? "text-purple-700" : "text-gray-600"
                            }`}>
                            Nhận tại shop
                        </span>
                    </div>
                </button>
            </div>
        </div>
    );
}
