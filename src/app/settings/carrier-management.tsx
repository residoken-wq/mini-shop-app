"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, Edit2, Trash2, Check, X, Phone, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { createCarrier, updateCarrier, deleteCarrier } from "./actions";

type Carrier = {
    id: string;
    name: string;
    phone: string | null;
    isActive: boolean;
    createdAt: Date;
};

interface CarrierManagementProps {
    initialCarriers: Carrier[];
}

export function CarrierManagement({ initialCarriers }: CarrierManagementProps) {
    const [carriers, setCarriers] = useState<Carrier[]>(initialCarriers);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newName, setNewName] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [editName, setEditName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleAdd = async () => {
        if (!newName.trim()) return;
        setIsLoading(true);
        const result = await createCarrier({ name: newName.trim(), phone: newPhone.trim() || undefined });
        if (result.success && result.carrier) {
            setCarriers([result.carrier as Carrier, ...carriers]);
            setNewName("");
            setNewPhone("");
            setIsAdding(false);
        }
        setIsLoading(false);
    };

    const handleEdit = async (id: string) => {
        if (!editName.trim()) return;
        setIsLoading(true);
        const result = await updateCarrier(id, { name: editName.trim(), phone: editPhone.trim() || undefined });
        if (result.success && result.carrier) {
            setCarriers(carriers.map(c => c.id === id ? result.carrier as Carrier : c));
            setEditingId(null);
        }
        setIsLoading(false);
    };

    const handleToggleActive = async (carrier: Carrier) => {
        setIsLoading(true);
        const result = await updateCarrier(carrier.id, {
            name: carrier.name,
            phone: carrier.phone || undefined,
            isActive: !carrier.isActive
        });
        if (result.success && result.carrier) {
            setCarriers(carriers.map(c => c.id === carrier.id ? result.carrier as Carrier : c));
        }
        setIsLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Xác nhận xóa nhà vận chuyển này?")) return;
        setIsLoading(true);
        const result = await deleteCarrier(id);
        if (result.success) {
            setCarriers(carriers.filter(c => c.id !== id));
        }
        setIsLoading(false);
    };

    const startEdit = (carrier: Carrier) => {
        setEditingId(carrier.id);
        setEditName(carrier.name);
        setEditPhone(carrier.phone || "");
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-orange-500" />
                            Nhà vận chuyển
                        </CardTitle>
                        <CardDescription>
                            Quản lý danh sách đơn vị giao hàng
                        </CardDescription>
                    </div>
                    {!isAdding && (
                        <Button size="sm" onClick={() => setIsAdding(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Thêm mới
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Add Form */}
                {isAdding && (
                    <div className="flex gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <Input
                            placeholder="Tên nhà vận chuyển"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="flex-1"
                        />
                        <Input
                            placeholder="SĐT (tùy chọn)"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            className="w-32"
                        />
                        <Button size="icon" onClick={handleAdd} disabled={!newName.trim() || isLoading}>
                            <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => setIsAdding(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Carriers List */}
                {carriers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Truck className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p>Chưa có nhà vận chuyển nào</p>
                        <p className="text-sm">Thêm nhà vận chuyển để quản lý giao hàng</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {carriers.map(carrier => (
                            <div
                                key={carrier.id}
                                className={cn(
                                    "flex items-center gap-3 py-3",
                                    !carrier.isActive && "opacity-50"
                                )}
                            >
                                {editingId === carrier.id ? (
                                    // Edit Mode
                                    <>
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Input
                                            value={editPhone}
                                            onChange={(e) => setEditPhone(e.target.value)}
                                            placeholder="SĐT"
                                            className="w-32"
                                        />
                                        <Button
                                            size="icon"
                                            onClick={() => handleEdit(carrier.id)}
                                            disabled={!editName.trim() || isLoading}
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="outline" onClick={() => setEditingId(null)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </>
                                ) : (
                                    // View Mode
                                    <>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{carrier.name}</span>
                                                {!carrier.isActive && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Tạm ngừng
                                                    </Badge>
                                                )}
                                            </div>
                                            {carrier.phone && (
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Phone className="h-3 w-3" />
                                                    {carrier.phone}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleToggleActive(carrier)}
                                            disabled={isLoading}
                                        >
                                            {carrier.isActive ? "Tạm ngừng" : "Kích hoạt"}
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => startEdit(carrier)}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => handleDelete(carrier.id)}
                                            disabled={isLoading}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
