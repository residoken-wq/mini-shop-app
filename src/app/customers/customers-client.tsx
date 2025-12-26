"use client";

import { useState } from "react";
import { Customer } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Plus, Search, User, MapPin, Phone } from "lucide-react";
import { createCustomer, updateCustomer, deleteCustomer } from "./actions";

interface CustomersClientProps {
    initialCustomers: (Customer & { _count: { orders: number } })[];
}

export default function CustomersClient({ initialCustomers }: CustomersClientProps) {
    const [customers, setCustomers] = useState(initialCustomers);
    const [search, setSearch] = useState("");

    // Dialog State
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<"CREATE" | "EDIT">("CREATE");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({ name: "", phone: "", address: "" });

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search))
    );

    const handleOpenCreate = () => {
        setMode("CREATE");
        setFormData({ name: "", phone: "", address: "" });
        setIsOpen(true);
    };

    const handleOpenEdit = (c: Customer) => {
        setMode("EDIT");
        setSelectedCustomer(c);
        setFormData({ name: c.name, phone: c.phone || "", address: c.address || "" });
        setIsOpen(true);
    };

    const handleSubmit = async () => {
        if (mode === "CREATE") {
            const res = await createCustomer(formData);
            if (res.success && res.customer) {
                setCustomers([{ ...res.customer, _count: { orders: 0 } }, ...customers]);
                setIsOpen(false);
            } else {
                alert("Lỗi: " + res.error);
            }
        } else {
            if (!selectedCustomer) return;
            const res = await updateCustomer(selectedCustomer.id, formData);
            if (res.success && res.customer) {
                setCustomers(customers.map(c => c.id === selectedCustomer.id ? { ...res.customer!, _count: c._count } : c));
                setIsOpen(false);
            } else {
                alert("Lỗi: " + res.error);
            }
        }
    };

    const handleDelete = async (id: string, count: number) => {
        if (count > 0) {
            alert("Không thể xóa khách hàng đã có đơn hàng!");
            return;
        }
        if (!confirm("Bạn có chắc muốn xóa khách hàng này?")) return;

        const res = await deleteCustomer(id);
        if (res.success) {
            setCustomers(customers.filter(c => c.id !== id));
        } else {
            alert("Lỗi: " + res.error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Quản lý Khách hàng</h1>
                <Button onClick={handleOpenCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Thêm Khách Hàng
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
                        {filtered.length > 0 ? filtered.map(c => (
                            <TableRow key={c.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <User className="h-4 w-4" />
                                        </div>
                                        {c.name}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {c.phone ? (
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <Phone className="h-3 w-3" /> {c.phone}
                                        </div>
                                    ) : "---"}
                                </TableCell>
                                <TableCell>
                                    {c.address ? (
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground line-clamp-1 max-w-[200px]" title={c.address}>
                                            <MapPin className="h-3 w-3" /> {c.address}
                                        </div>
                                    ) : "---"}
                                </TableCell>
                                <TableCell>
                                    <span className={c.debt > 0 ? "text-red-500 font-bold" : "text-green-600"}>
                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(c.debt)}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(c)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id, c._count.orders)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
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
                        <DialogTitle>{mode === "CREATE" ? "Thêm Khách Hàng" : "Sửa Khách Hàng"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Tên *</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">SĐT</Label>
                            <Input
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Địa chỉ</Label>
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
