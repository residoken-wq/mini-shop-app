"use client";

import { useState, useEffect } from "react";
import { District, BankInfo, OrderFormData } from "../types";
import { getShopBankInfo, getActiveDistrictsForPortal } from "../actions";

interface UseOrderFormReturn {
    formData: OrderFormData;
    setFormData: React.Dispatch<React.SetStateAction<OrderFormData>>;
    districts: District[];
    shippingFee: number;
    bankInfo: BankInfo | null;
    loadFormData: () => Promise<void>;
}

const initialFormData: OrderFormData = {
    recipientName: "",
    recipientPhone: "",
    deliveryAddress: "",
    deliveryMethod: "DELIVERY",
    orderNote: "",
    selectedDistrict: "",
    isOutsideHCMC: false,
    paymentMethod: "COD",
};

export function useOrderForm(): UseOrderFormReturn {
    const [formData, setFormData] = useState<OrderFormData>(initialFormData);
    const [districts, setDistricts] = useState<District[]>([]);
    const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
    const [shippingFee, setShippingFee] = useState(0);

    // Update shipping fee when district changes
    useEffect(() => {
        if (formData.isOutsideHCMC) {
            setShippingFee(0); // Will be determined later
        } else if (formData.selectedDistrict) {
            const district = districts.find((d) => d.id === formData.selectedDistrict);
            setShippingFee(district?.shippingFee || 0);
        } else {
            setShippingFee(0);
        }
    }, [formData.selectedDistrict, formData.isOutsideHCMC, districts]);

    const loadFormData = async () => {
        // Load bank info
        const bankRes = await getShopBankInfo();
        if (bankRes.success && bankRes.bankInfo) {
            setBankInfo(bankRes.bankInfo);
        }

        // Load districts
        const districtRes = await getActiveDistrictsForPortal();
        if (districtRes.success && districtRes.districts) {
            setDistricts(districtRes.districts);
        }
    };

    return {
        formData,
        setFormData,
        districts,
        shippingFee,
        bankInfo,
        loadFormData,
    };
}
