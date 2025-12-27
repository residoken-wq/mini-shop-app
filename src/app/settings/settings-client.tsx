"use client";

import { useState } from "react";
import { ShopSettings } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Phone, MapPin, Mail, Save, Check } from "lucide-react";
import { updateShopSettings } from "./actions";

interface SettingsClientProps {
    initialSettings: ShopSettings;
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
    const [settings, setSettings] = useState(initialSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        const res = await updateShopSettings({
            name: settings.name,
            phone: settings.phone,
            address: settings.address,
            email: settings.email
        });

        if (res.success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } else {
            alert("Lỗi: " + res.error);
        }
        setIsSaving(false);
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold">Cài đặt</h1>
                <p className="text-muted-foreground">Quản lý thông tin cửa hàng</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Store className="h-5 w-5" />
                        Thông tin cửa hàng
                    </CardTitle>
                    <CardDescription>
                        Thông tin này sẽ được hiển thị trên hóa đơn và các tài liệu khác
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="flex items-center gap-2">
                            <Store className="h-4 w-4" />
                            Tên cửa hàng
                        </Label>
                        <Input
                            id="name"
                            value={settings.name}
                            onChange={e => setSettings({ ...settings, name: e.target.value })}
                            placeholder="Nhập tên cửa hàng"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Số điện thoại
                        </Label>
                        <Input
                            id="phone"
                            value={settings.phone}
                            onChange={e => setSettings({ ...settings, phone: e.target.value })}
                            placeholder="VD: 0123 456 789"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address" className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Địa chỉ
                        </Label>
                        <Input
                            id="address"
                            value={settings.address}
                            onChange={e => setSettings({ ...settings, address: e.target.value })}
                            placeholder="VD: 123 Đường ABC, Quận 1, TP.HCM"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email (tùy chọn)
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={settings.email}
                            onChange={e => setSettings({ ...settings, email: e.target.value })}
                            placeholder="VD: shop@email.com"
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto">
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
                                Lưu thay đổi
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            {/* Preview Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Xem trước hóa đơn</CardTitle>
                    <CardDescription>Thông tin sẽ hiển thị trên hóa đơn</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-muted/50 p-4 rounded-lg text-center space-y-1">
                        <h3 className="text-lg font-bold">{settings.name || "Tên cửa hàng"}</h3>
                        {settings.address && <p className="text-sm text-muted-foreground">{settings.address}</p>}
                        {settings.phone && <p className="text-sm text-muted-foreground">ĐT: {settings.phone}</p>}
                        {settings.email && <p className="text-sm text-muted-foreground">{settings.email}</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
