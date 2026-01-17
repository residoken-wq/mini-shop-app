"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Users, Phone, ArrowRight, AlertCircle, PackageSearch } from "lucide-react";
import { findWholesaleCustomer } from "../actions";
import { Customer } from "../types";

interface CustomerTypeSelectionProps {
    onSelectRetail: () => void;
    onSelectWholesale: (customer: Customer) => void;
    onTrackOrder: () => void;
}

export function CustomerTypeSelection({
    onSelectRetail,
    onSelectWholesale,
    onTrackOrder,
}: CustomerTypeSelectionProps) {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [phoneError, setPhoneError] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    const handleSearchWholesale = async () => {
        setPhoneError("");
        if (!phoneNumber.trim()) {
            setPhoneError("Vui lòng nhập số điện thoại");
            return;
        }

        setIsSearching(true);
        try {
            const result = await findWholesaleCustomer(phoneNumber);
            if (result.success && result.customer) {
                onSelectWholesale(result.customer);
            } else {
                setPhoneError(result.error || "Không tìm thấy khách sỉ");
            }
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <h2 className="text-xl font-bold text-center">Bạn là?</h2>

            <div className="grid md:grid-cols-2 gap-4">
                {/* Retail Customer */}
                <button
                    onClick={onSelectRetail}
                    className="p-6 border-2 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200">
                            <User className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-semibold">Khách Lẻ</h3>
                            <p className="text-sm text-gray-500">Mua hàng với giá bán lẻ</p>
                        </div>
                    </div>
                </button>

                {/* Wholesale Customer */}
                <div className="p-6 border-2 rounded-xl space-y-4">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                            <Users className="w-8 h-8 text-purple-600" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-semibold">Khách Sỉ</h3>
                            <p className="text-sm text-gray-500">Nhập SĐT đã đăng ký</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    type="tel"
                                    placeholder="Số điện thoại"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="pl-10"
                                    onKeyDown={(e) => e.key === "Enter" && handleSearchWholesale()}
                                />
                            </div>
                            <Button onClick={handleSearchWholesale} disabled={isSearching}>
                                {isSearching ? "..." : <ArrowRight className="w-4 h-4" />}
                            </Button>
                        </div>
                        {phoneError && (
                            <p className="text-red-500 text-sm flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {phoneError}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Order Tracking Link */}
            <div className="border-t pt-4">
                <button
                    onClick={onTrackOrder}
                    className="w-full p-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl hover:from-amber-500 hover:to-orange-600 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                    <PackageSearch className="w-6 h-6" />
                    <span className="font-bold text-lg">Tra cứu đơn hàng đã đặt</span>
                </button>
            </div>
        </div>
    );
}
