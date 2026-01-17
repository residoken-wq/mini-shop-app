"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Check, X, Loader2, MapPin } from "lucide-react";

interface District {
    id: string;
    name: string;
    shippingFee: number;
    isActive: boolean;
}

interface DistrictManagementProps {
    initialDistricts: District[];
}

// Server actions imports
import {
    createDistrict,
    updateDistrict,
    deleteDistrict
} from "./actions";

export function DistrictManagement({ initialDistricts }: DistrictManagementProps) {
    const [districts, setDistricts] = useState<District[]>(initialDistricts);
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newFee, setNewFee] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editFee, setEditFee] = useState("");
    const [loading, setLoading] = useState(false);

    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

    const handleAdd = async () => {
        if (!newName.trim()) return;
        setLoading(true);
        try {
            const result = await createDistrict({
                name: newName.trim(),
                shippingFee: parseInt(newFee) || 0
            });
            if (result.success && result.district) {
                setDistricts([...districts, result.district as District]);
                setNewName("");
                setNewFee("");
                setIsAdding(false);
            } else {
                alert(result.error || "Lỗi tạo quận/huyện");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (id: string) => {
        setLoading(true);
        try {
            const result = await updateDistrict(id, {
                name: editName.trim(),
                shippingFee: parseInt(editFee) || 0
            });
            if (result.success) {
                setDistricts(districts.map(d =>
                    d.id === id ? { ...d, name: editName.trim(), shippingFee: parseInt(editFee) || 0 } : d
                ));
                setEditingId(null);
            } else {
                alert(result.error || "Lỗi cập nhật");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (id: string, currentActive: boolean) => {
        const result = await updateDistrict(id, { isActive: !currentActive });
        if (result.success) {
            setDistricts(districts.map(d =>
                d.id === id ? { ...d, isActive: !currentActive } : d
            ));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Xóa quận/huyện này?")) return;
        const result = await deleteDistrict(id);
        if (result.success) {
            setDistricts(districts.filter(d => d.id !== id));
        } else {
            alert(result.error || "Lỗi xóa");
        }
    };

    const startEdit = (district: District) => {
        setEditingId(district.id);
        setEditName(district.name);
        setEditFee(district.shippingFee.toString());
    };

    return (
        <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-500" />
                    <h3 className="font-semibold">Quản lý Quận/Huyện TP.HCM</h3>
                </div>
                <Button
                    size="sm"
                    onClick={() => setIsAdding(true)}
                    disabled={isAdding}
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Thêm quận
                </Button>
            </div>

            <div className="divide-y max-h-[400px] overflow-y-auto">
                {/* Add New Row */}
                {isAdding && (
                    <div className="p-3 bg-blue-50 flex gap-2 items-center">
                        <Input
                            placeholder="Tên quận/huyện"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="flex-1"
                        />
                        <Input
                            type="number"
                            placeholder="Phí VC"
                            value={newFee}
                            onChange={(e) => setNewFee(e.target.value)}
                            className="w-28"
                        />
                        <Button size="sm" onClick={handleAdd} disabled={loading}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                {/* District List */}
                {districts.length === 0 && !isAdding ? (
                    <div className="p-8 text-center text-gray-500">
                        Chưa có quận/huyện nào
                    </div>
                ) : (
                    districts.map(district => (
                        <div key={district.id} className="p-3 flex items-center gap-2 hover:bg-gray-50">
                            {editingId === district.id ? (
                                <>
                                    <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Input
                                        type="number"
                                        value={editFee}
                                        onChange={(e) => setEditFee(e.target.value)}
                                        className="w-28"
                                    />
                                    <Button size="sm" onClick={() => handleUpdate(district.id)} disabled={loading}>
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1 cursor-pointer" onClick={() => startEdit(district)}>
                                        <span className={district.isActive ? "" : "text-gray-400 line-through"}>
                                            {district.name}
                                        </span>
                                    </div>
                                    <div className="w-28 text-right font-medium text-purple-600">
                                        {formatCurrency(district.shippingFee)}đ
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={district.isActive ? "default" : "outline"}
                                        className="w-16 text-xs"
                                        onClick={() => handleToggleActive(district.id, district.isActive)}
                                    >
                                        {district.isActive ? "Bật" : "Tắt"}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-red-500 hover:text-red-700"
                                        onClick={() => handleDelete(district.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
