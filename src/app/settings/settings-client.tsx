"use client";

import { useState } from "react";
import { ShopSettings } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Store, Phone, MapPin, Mail, Save, Check, CreditCard, Building2, User, Server, Send, AlertCircle } from "lucide-react";
import { updateShopSettings, testEmailSettings } from "./actions";

interface SettingsClientProps {
    initialSettings: ShopSettings;
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
    const [settings, setSettings] = useState(initialSettings);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

    const handleSave = async () => {
        setIsSaving(true);
        const res = await updateShopSettings({
            name: settings.name,
            phone: settings.phone,
            address: settings.address,
            email: settings.email,
            bankName: settings.bankName,
            bankAccount: settings.bankAccount,
            bankOwner: settings.bankOwner,
            // Email config
            smtpHost: settings.smtpHost,
            smtpPort: settings.smtpPort,
            smtpUser: settings.smtpUser,
            smtpPass: settings.smtpPass,
            smtpFrom: settings.smtpFrom,
            notifyEmails: settings.notifyEmails,
            emailEnabled: settings.emailEnabled
        });

        if (res.success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } else {
            alert("Lỗi: " + res.error);
        }
        setIsSaving(false);
    };

    const handleTestEmail = async () => {
        setTestingEmail(true);
        setTestResult(null);
        const result = await testEmailSettings();
        setTestResult(result);
        setTestingEmail(false);
    };

    // Generate VietQR URL for bank transfer
    const getVietQRUrl = () => {
        if (!settings.bankAccount || !settings.bankName) return null;
        const bankCodes: Record<string, string> = {
            'Vietcombank': 'VCB',
            'VCB': 'VCB',
            'Techcombank': 'TCB',
            'TCB': 'TCB',
            'MB Bank': 'MB',
            'MB': 'MB',
            'BIDV': 'BIDV',
            'Agribank': 'VBA',
            'VBA': 'VBA',
            'ACB': 'ACB',
            'VPBank': 'VPB',
            'VPB': 'VPB',
            'Sacombank': 'STB',
            'STB': 'STB',
            'TPBank': 'TPB',
            'TPB': 'TPB',
            'Vietinbank': 'CTG',
            'CTG': 'CTG',
        };
        const bankCode = bankCodes[settings.bankName] || settings.bankName.toUpperCase();
        return `https://img.vietqr.io/image/${bankCode}-${settings.bankAccount}-compact2.png?accountName=${encodeURIComponent(settings.bankOwner)}`;
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
            </Card>

            {/* Bank Account Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Thông tin ngân hàng
                    </CardTitle>
                    <CardDescription>
                        Thông tin tài khoản để nhận thanh toán chuyển khoản
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="bankName" className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Tên ngân hàng
                        </Label>
                        <Input
                            id="bankName"
                            value={settings.bankName}
                            onChange={e => setSettings({ ...settings, bankName: e.target.value })}
                            placeholder="VD: Vietcombank, MB Bank, Techcombank..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bankAccount" className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Số tài khoản
                        </Label>
                        <Input
                            id="bankAccount"
                            value={settings.bankAccount}
                            onChange={e => setSettings({ ...settings, bankAccount: e.target.value })}
                            placeholder="VD: 1234567890"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bankOwner" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Chủ tài khoản
                        </Label>
                        <Input
                            id="bankOwner"
                            value={settings.bankOwner}
                            onChange={e => setSettings({ ...settings, bankOwner: e.target.value.toUpperCase() })}
                            placeholder="VD: NGUYEN VAN A"
                        />
                    </div>

                    {/* QR Code Preview */}
                    {settings.bankName && settings.bankAccount && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-3">Xem trước QR Code:</p>
                            <div className="flex justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={getVietQRUrl() || ''}
                                    alt="QR Code"
                                    className="w-48 h-48 rounded-lg border shadow-sm"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 text-center mt-2">
                                Khách hàng quét mã này để chuyển khoản
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Email Notification Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-blue-600" />
                        Thông báo Email
                    </CardTitle>
                    <CardDescription>
                        Cấu hình gửi email thông báo khi có đơn hàng mới từ Portal
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                            <p className="font-medium">Bật thông báo email</p>
                            <p className="text-sm text-muted-foreground">Gửi email khi có đơn hàng mới</p>
                        </div>
                        <Switch
                            checked={settings.emailEnabled}
                            onCheckedChange={(checked) => setSettings({ ...settings, emailEnabled: checked })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="smtpHost" className="flex items-center gap-2">
                                <Server className="h-4 w-4" />
                                SMTP Host
                            </Label>
                            <Input
                                id="smtpHost"
                                value={settings.smtpHost}
                                onChange={e => setSettings({ ...settings, smtpHost: e.target.value })}
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smtpPort">SMTP Port</Label>
                            <Input
                                id="smtpPort"
                                type="number"
                                value={settings.smtpPort}
                                onChange={e => setSettings({ ...settings, smtpPort: parseInt(e.target.value) || 587 })}
                                placeholder="587"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="smtpUser">SMTP User (Email đăng nhập)</Label>
                        <Input
                            id="smtpUser"
                            value={settings.smtpUser}
                            onChange={e => setSettings({ ...settings, smtpUser: e.target.value })}
                            placeholder="your-email@gmail.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="smtpPass">SMTP Password / App Password</Label>
                        <Input
                            id="smtpPass"
                            type="password"
                            value={settings.smtpPass}
                            onChange={e => setSettings({ ...settings, smtpPass: e.target.value })}
                            placeholder="••••••••"
                        />
                        <p className="text-xs text-muted-foreground">
                            Gmail: dùng App Password (Cài đặt Google &gt; Bảo mật &gt; App Passwords)
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="smtpFrom">Email gửi đi (From)</Label>
                        <Input
                            id="smtpFrom"
                            value={settings.smtpFrom}
                            onChange={e => setSettings({ ...settings, smtpFrom: e.target.value })}
                            placeholder="shop@yourdomain.com (bỏ trống = dùng SMTP User)"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notifyEmails" className="flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            Email nhận thông báo
                        </Label>
                        <Input
                            id="notifyEmails"
                            value={settings.notifyEmails}
                            onChange={e => setSettings({ ...settings, notifyEmails: e.target.value })}
                            placeholder="email1@example.com, email2@example.com"
                        />
                        <p className="text-xs text-muted-foreground">
                            Nhiều email cách nhau bằng dấu phẩy
                        </p>
                    </div>

                    {/* Test Email Button */}
                    <div className="pt-2">
                        <Button
                            variant="outline"
                            onClick={handleTestEmail}
                            disabled={testingEmail || !settings.smtpHost || !settings.smtpUser}
                        >
                            <Send className="h-4 w-4 mr-2" />
                            {testingEmail ? "Đang gửi..." : "Gửi email test"}
                        </Button>
                        {testResult && (
                            <div className={`mt-2 p-2 rounded text-sm ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {testResult.success ? (
                                    <span className="flex items-center gap-1">
                                        <Check className="h-4 w-4" /> Gửi thành công!
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1">
                                        <AlertCircle className="h-4 w-4" /> {testResult.error}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Save Button Card */}
            <Card>
                <CardContent className="pt-6">
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
                </CardContent>
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
                        {settings.bankAccount && (
                            <div className="pt-2 mt-2 border-t">
                                <p className="text-sm text-muted-foreground">
                                    {settings.bankName} - {settings.bankAccount}
                                </p>
                                <p className="text-sm font-medium">{settings.bankOwner}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


