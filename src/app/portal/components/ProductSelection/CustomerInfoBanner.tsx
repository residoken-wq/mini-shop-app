"use client";

import { User, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerType, Customer } from "../../types";

interface CustomerInfoBannerProps {
    customerType: CustomerType;
    customer: Customer | null;
    onBack: () => void;
}

export function CustomerInfoBanner({ customerType, customer, onBack }: CustomerInfoBannerProps) {
    return (
        <div className="bg-white rounded-lg p-4 shadow flex items-center justify-between">
            <div className="flex items-center gap-3">
                {customerType === "wholesale" ? (
                    <Users className="w-5 h-5 text-purple-600" />
                ) : (
                    <User className="w-5 h-5 text-blue-600" />
                )}
                <div>
                    <span className="font-medium">
                        {customer ? customer.name : "Khách lẻ"}
                    </span>
                    {customerType === "wholesale" && (
                        <Badge className="ml-2 bg-purple-100 text-purple-700">Giá sỉ</Badge>
                    )}
                </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Đổi
            </Button>
        </div>
    );
}
