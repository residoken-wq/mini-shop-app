"use client";

import { useState } from "react";
import { Supplier } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Plus, Search, MapPin, Phone, Truck, Loader2, RefreshCw } from "lucide-react";
import { createSupplier, updateSupplier, deleteSupplier, paySupplierDebt, recalculateSupplierDebt } from "./actions";
import { cn } from "@/lib/utils";

interface SupplierListProps {
    initialSuppliers: (Supplier & { _count: { purchases: number } })[];
}

export default function SupplierList({ initialSuppliers }: SupplierListProps) {
    const [suppliers, setSuppliers] = useState(initialSuppliers);
    const [search, setSearch] = useState("");

    // Dialog State
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<"CREATE" | "EDIT">("CREATE");
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState({ name: "", phone: "", address: "" });

    // Debt Payment State
    const [selectedSupplierForDebt, setSelectedSupplierForDebt] = useState<Supplier | null>(null);
    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState("CASH");
    const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
    const [payNote, setPayNote] = useState("");
    const [loading, setLoading] = useState(false);

    const filtered = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.phone && s.phone.includes(search))
    );

    const handleOpenCreate = () => {
        setMode("CREATE");
        setFormData({ name: "", phone: "", address: "" });
        setIsOpen(true);
    };

    const handleOpenEdit = (s: Supplier) => {
        setMode("EDIT");
        setSelectedSupplier(s);
        setFormData({ name: s.name, phone: s.phone || "", address: s.address || "" });
        setIsOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name) {
            alert("Vui lòng nhập tên NCC");
            return;
        }

        if (mode === "CREATE") {
            const res = await createSupplier(formData);
            if (res.success && res.supplier) {
                setSuppliers([...suppliers, { ...res.supplier, _count: { purchases: 0 } }]);
                setIsOpen(false);
            } else {
                alert("Lỗi: " + res.error);
            }
        } else {
            if (!selectedSupplier) return;
            const res = await updateSupplier(selectedSupplier.id, formData);
            if (res.success && res.supplier) {
                setSuppliers(suppliers.map(s => s.id === selectedSupplier.id ? { ...res.supplier!, _count: s._count } : s));
                setIsOpen(false);
            } else {
                alert("Lỗi: " + res.error);
            }
        }
    };

    const handleDelete = async (id: string, count: number) => {
        if (count > 0) {
            alert("Không thể xóa NCC đã có đơn nhập hàng!");
            return;
        }
        if (!confirm("Bạn có chắc muốn xóa NCC này?")) return;

        const res = await deleteSupplier(id);
        if (res.success) {
            setSuppliers(suppliers.filter(s => s.id !== id));
        } else {
            alert("Lỗi: " + res.error);
        }
    };

    const handlePayDebt = async () => {
        if (!selectedSupplierForDebt || !payAmount) return;

        setLoading(true);
        const res = await paySupplierDebt({
            supplierId: selectedSupplierForDebt.id,
            amount: parseFloat(payAmount),
            paymentMethod: payMethod,
            date: new Date(payDate),
            note: payNote
        });
        setLoading(false);

        if (res.success) {
            // Update local state is tricky because we don't return the updated supplier from server action in standard way sometimes
            // But let's assume we refresh or update manually
            setSuppliers(prev => prev.map(s =>
                s.id === selectedSupplierForDebt.id
                    ? { ...s, debt: s.debt - parseFloat(payAmount) }
                    : s
            ));

            setSelectedSupplierForDebt(null); // Close dialog
            setPayAmount("");
            setPayNote("");
            setPayMethod("CASH");
            setPayDate(new Date().toISOString().split('T')[0]);
        } else {
            alert("Lỗi: " + res.error);
        }
    };

    const handleRecalculateDebt = async (supplierId: string) => {
        if (!confirm("Cập nhật lại công nợ từ các đơn mua hàng?")) return;
        setLoading(true);
        const res = await recalculateSupplierDebt(supplierId);
        setLoading(false);
        if (res.success) {
            setSuppliers(prev => prev.map(s =>
                s.id === supplierId
                    ? { ...s, debt: res.debt! }
                    : s
            ));
            alert("Đã cập nhật công nợ: " + new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(res.debt!));
        } else {
            alert("Lỗi: " + res.error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Danh sách Nhà Cung Cấp</h2>
                <Button onClick={handleOpenCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Thêm NCC
                </Button>
            </div>

            <div className="flex items-center gap-2 max-w-sm">
                <Search className="h-4 w-4" />
                <Input
                    placeholder="Tìm tên, sđt..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tên</TableHead>
                            <TableHead>Liên hệ</TableHead>
                            <TableHead>Địa chỉ</TableHead>
                            <TableHead>Công nợ</TableHead>
                            <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length > 0 ? filtered.map(s => (
                            <TableRow key={s.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <Truck className="h-4 w-4" />
                                        </div>
                                        {s.name}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {s.phone ? (
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <Phone className="h-3 w-3" /> {s.phone}
                                        </div>
                                    ) : "---"}
                                </TableCell>
                                <TableCell>
                                    {s.address ? (
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground line-clamp-1 max-w-[200px]" title={s.address}>
                                            <MapPin className="h-3 w-3" /> {s.address}
                                        </div>
                                    ) : "---"}
                                </TableCell>
                                <TableCell>
                                    <span className={cn("font-bold", s.debt > 0 ? "text-red-500" : "text-green-500")}>
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(s.debt)}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" title="Cập nhật công nợ" onClick={() => handleRecalculateDebt(s.id)}>
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(s)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(s.id, s._count.purchases)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <Dialog open={selectedSupplierForDebt?.id === s.id} onOpenChange={(open) => !open && setSelectedSupplierForDebt(null)}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" onClick={() => {
                                                setSelectedSupplierForDebt(s);
                                                setPayAmount("");
                                                setPayNote("");
                                                setPayMethod("CASH");
                                                setPayDate(new Date().toISOString().split('T')[0]);
                                            }}>
                                                Trả nợ
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Trả nợ nhà cung cấp</DialogTitle>
                                            </DialogHeader>

                                            <div className="py-4 space-y-4">
                                                <div className="p-4 bg-muted rounded-lg">
                                                    <p className="font-medium">{s.name}</p>
                                                    <p className="text-sm text-muted-foreground">SĐT: {s.phone || "---"}</p>
                                                    <p className={cn("mt-2 font-bold", s.debt > 0 ? "text-red-500" : "text-green-500")}>
                                                        Công nợ: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(s.debt)}
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Số tiền trả</Label>
                                                    <Input
                                                        type="number"
                                                        value={payAmount}
                                                        onChange={(e) => setPayAmount(e.target.value)}
                                                        placeholder="Nhập số tiền..."
                                                    />
                                                    <div className="flex justify-end">
                                                        <Button variant="link" className="text-xs h-auto p-0" onClick={() => setPayAmount(s.debt.toString())}>
                                                            Trả hết
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Hình thức</Label>
                                                        <select
                                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                            value={payMethod}
                                                            onChange={(e) => setPayMethod(e.target.value)}
                                                        >
                                                            <option value="CASH">Tiền mặt</option>
                                                            <option value="BANK">Chuyển khoản</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Ngày trả</Label>
                                                        <Input
                                                            type="date"
                                                            value={payDate}
                                                            onChange={(e) => setPayDate(e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Ghi chú</Label>
                                                    <textarea
                                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        value={payNote}
                                                        onChange={(e) => setPayNote(e.target.value)}
                                                        placeholder="Ghi chú thêm..."
                                                    />
                                                </div>
                                            </div>

                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setSelectedSupplierForDebt(null)}>Hủy</Button>
                                                <Button onClick={handlePayDebt} disabled={!payAmount || loading}>
                                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Xác nhận trả nợ
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                    Chưa có dữ liệu
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{mode === "CREATE" ? "Thêm NCC" : "Sửa NCC"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                            <Label className="text-left md:text-right">Tên *</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                            <Label className="text-left md:text-right">SĐT</Label>
                            <Input
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                            <Label className="text-left md:text-right">Địa chỉ</Label>
                            <Input
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSubmit}>Lưu</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
