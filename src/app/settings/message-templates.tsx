"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MessageCircle, Save, Check, Info } from "lucide-react";
import { updateMessageTemplates } from "./actions";

interface MessageTemplatesProps {
    initialShippingTemplate: string;
    initialDeliveredTemplate: string;
}

const TEMPLATE_VARIABLES = [
    { key: "{{customerName}}", label: "Tên khách hàng" },
    { key: "{{orderCode}}", label: "Mã đơn hàng" },
    { key: "{{address}}", label: "Địa chỉ giao" },
    { key: "{{total}}", label: "Tổng tiền" },
    { key: "{{shopName}}", label: "Tên cửa hàng" },
    { key: "{{phone}}", label: "SĐT khách" },
];

export function MessageTemplates({ initialShippingTemplate, initialDeliveredTemplate }: MessageTemplatesProps) {
    const [shippingTemplate, setShippingTemplate] = useState(initialShippingTemplate || "");
    const [deliveredTemplate, setDeliveredTemplate] = useState(initialDeliveredTemplate || "");
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        const result = await updateMessageTemplates({
            smsShippingTemplate: shippingTemplate,
            smsDeliveredTemplate: deliveredTemplate,
        });

        if (result.success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } else {
            alert("Lỗi lưu mẫu tin nhắn: " + result.error);
        }
        setIsSaving(false);
    };

    const insertVariable = (key: string, target: "shipping" | "delivered") => {
        if (target === "shipping") {
            setShippingTemplate((prev) => prev + key);
        } else {
            setDeliveredTemplate((prev) => prev + key);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    Mẫu tin nhắn Zalo/SMS
                </CardTitle>
                <CardDescription>
                    Cấu hình nội dung tin nhắn gửi cho khách hàng khi giao hàng
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Variable Hint */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="flex items-center gap-1 text-sm font-medium text-blue-800 mb-2">
                        <Info className="h-4 w-4" /> Biến thay thế
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {TEMPLATE_VARIABLES.map((v) => (
                            <span
                                key={v.key}
                                className="text-xs px-2 py-1 bg-white border border-blue-300 rounded cursor-help"
                                title={v.label}
                            >
                                {v.key}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Shipping Template */}
                <div className="space-y-2">
                    <Label htmlFor="shippingTemplate" className="text-base font-medium">
                        🚚 Tin nhắn khi BẮT ĐẦU giao hàng
                    </Label>
                    <textarea
                        id="shippingTemplate"
                        value={shippingTemplate}
                        onChange={(e) => setShippingTemplate(e.target.value)}
                        placeholder="Nhập mẫu tin nhắn..."
                        rows={4}
                        className="w-full font-mono text-sm p-2 border rounded-md"
                    />
                    <div className="flex gap-1 flex-wrap">
                        {TEMPLATE_VARIABLES.slice(0, 4).map((v) => (
                            <Button
                                key={v.key}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => insertVariable(v.key, "shipping")}
                            >
                                + {v.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Delivered Template */}
                <div className="space-y-2">
                    <Label htmlFor="deliveredTemplate" className="text-base font-medium">
                        ✅ Tin nhắn khi GIAO THÀNH CÔNG
                    </Label>
                    <textarea
                        id="deliveredTemplate"
                        value={deliveredTemplate}
                        onChange={(e) => setDeliveredTemplate(e.target.value)}
                        placeholder="Nhập mẫu tin nhắn..."
                        rows={3}
                        className="w-full font-mono text-sm p-2 border rounded-md"
                    />
                    <div className="flex gap-1 flex-wrap">
                        {TEMPLATE_VARIABLES.filter((v) => ["{{orderCode}}", "{{shopName}}", "{{customerName}}"].includes(v.key)).map((v) => (
                            <Button
                                key={v.key}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => insertVariable(v.key, "delivered")}
                            >
                                + {v.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Save Button */}
                <Button onClick={handleSave} disabled={isSaving}>
                    {saved ? (
                        <>
                            <Check className="mr-2 h-4 w-4" />
                            Đã lưu!
                        </>
                    ) : isSaving ? (
                        "Đang lưu..."
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Lưu mẫu tin nhắn
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
