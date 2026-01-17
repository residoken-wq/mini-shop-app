"use client";

import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { District } from "../../types";

interface AddressFormProps {
    recipientName: string;
    recipientPhone: string;
    deliveryAddress: string;
    selectedDistrict: string;
    isOutsideHCMC: boolean;
    orderNote: string;
    districts: District[];
    onRecipientNameChange: (value: string) => void;
    onRecipientPhoneChange: (value: string) => void;
    onDeliveryAddressChange: (value: string) => void;
    onDistrictChange: (value: string) => void;
    onOutsideHCMCChange: (value: boolean) => void;
    onOrderNoteChange: (value: string) => void;
}

export function AddressForm({
    recipientName,
    recipientPhone,
    deliveryAddress,
    selectedDistrict,
    isOutsideHCMC,
    orderNote,
    districts,
    onRecipientNameChange,
    onRecipientPhoneChange,
    onDeliveryAddressChange,
    onDistrictChange,
    onOutsideHCMCChange,
    onOrderNoteChange,
}: AddressFormProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            {/* Recipient Info */}
            <div>
                <div className="flex items-center gap-2 text-gray-700 mb-3">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                        👤
                    </div>
                    <h3 className="font-semibold">Thông tin người nhận</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm text-gray-600 mb-1 block">Họ tên</label>
                        <Input
                            placeholder="Tên người nhận"
                            value={recipientName}
                            onChange={(e) => onRecipientNameChange(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-sm text-gray-600 mb-1 block">Số điện thoại</label>
                        <Input
                            placeholder="SĐT người nhận"
                            value={recipientPhone}
                            onChange={(e) => onRecipientPhoneChange(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Address */}
            <div>
                <div className="flex items-center gap-2 text-gray-700 mb-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-orange-600" />
                    </div>
                    <h3 className="font-semibold">Địa chỉ giao hàng</h3>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-sm text-gray-600 mb-1 block">Địa chỉ chi tiết</label>
                        <Input
                            placeholder="Số nhà, đường, phường..."
                            value={deliveryAddress}
                            onChange={(e) => onDeliveryAddressChange(e.target.value)}
                        />
                    </div>

                    {/* Outside HCMC switch */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Giao ngoài TP.HCM</span>
                        <Switch
                            checked={isOutsideHCMC}
                            onCheckedChange={onOutsideHCMCChange}
                        />
                    </div>

                    {/* District selection */}
                    {!isOutsideHCMC && (
                        <div>
                            <label className="text-sm text-gray-600 mb-1 block">Quận/Huyện</label>
                            <select
                                value={selectedDistrict}
                                onChange={(e) => onDistrictChange(e.target.value)}
                                className="w-full p-2 border rounded-lg bg-white"
                            >
                                <option value="">Chọn quận/huyện</option>
                                {districts.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name} - Phí ship: {d.shippingFee.toLocaleString()}đ
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Order Note */}
            <div>
                <div className="flex items-center gap-2 text-gray-700 mb-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                        📝
                    </div>
                    <h3 className="font-semibold">Ghi chú đơn hàng</h3>
                </div>
                <textarea
                    value={orderNote}
                    onChange={(e) => onOrderNoteChange(e.target.value)}
                    placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                    className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
            </div>
        </div>
    );
}
