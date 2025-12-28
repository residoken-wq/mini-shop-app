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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Plus, Search, User, MapPin, Phone, FileText } from "lucide-react";
import { createCustomer, updateCustomer, deleteCustomer } from "./actions";
import Link from "next/link";

interface CustomersClientProps {
    initialCustomers: (Customer & { _count: { orders: number } })[];
}

export default function CustomersClient({ initialCustomers }: CustomersClientProps) {
    const [customers, setCustomers] = useState(initialCustomers);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<"all" | "retail" | "wholesale">("all");

    // Dialog State
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<"CREATE" | "EDIT">("CREATE");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        phones: ["", "", "", "", ""] as string[],
        address: "",
        customerType: "retail" as "retail" | "wholesale"
    });

    const filtered = customers.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.phone && c.phone.includes(search));
        const matchesType = filterType === "all" || c.customerType === filterType;
        return matchesSearch && matchesType;
    });

    const handleOpenCreate = () => {
        setMode("CREATE");
        setFormData({ name: "", phones: ["", "", "", "", ""], address: "", customerType: "retail" });
        setIsOpen(true);
    };

    const handleOpenEdit = (c: Customer) => {
        setMode("EDIT");
        setSelectedCustomer(c);

        // Parse phones from JSON or use primary phone
        let phonesArray = ["", "", "", "", ""];
        const customerAny = c as Customer & { phones?: string };
        if (customerAny.phones) {
            try {
                const parsed = JSON.parse(customerAny.phones);
                phonesArray = [...parsed, "", "", "", "", ""].slice(0, 5);
            } catch {
                // Fallback to primary phone
                if (c.phone) phonesArray[0] = c.phone;
            }
        } else if (c.phone) {
            phonesArray[0] = c.phone;
        }

        setFormData({
            name: c.name,
            phones: phonesArray,
            address: c.address || "",
            customerType: (c.customerType as "retail" | "wholesale") || "retail"
        });
        setIsOpen(true);
    };

    const handleSubmit = async () => {
        // Filter out empty phones and get first as primary
        const validPhones = formData.phones.filter(p => p.trim());
        const submitData = {
            name: formData.name,
            phone: validPhones[0] || "",
            phones: validPhones.length > 0 ? JSON.stringify(validPhones) : undefined,
            address: formData.address,
            customerType: formData.customerType
        };

        if (mode === "CREATE") {
            const res = await createCustomer(submitData);
            if (res.success && res.customer) {
                setCustomers([{ ...res.customer, _count: { orders: 0 } }, ...customers]);
                setIsOpen(false);
            } else {
                alert("Lỗi: " + res.error);
            }
        } else {
            if (!selectedCustomer) return;
            const res = await updateCustomer(selectedCustomer.id, submitData);
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

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                    <Search className="h-4 w-4" />
                    <Input
                        placeholder="Tìm tên, sđt..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Loại khách" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="retail">Khách lẻ</SelectItem>
                        <SelectItem value="wholesale">Khách sỉ</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tên</TableHead>
                            <TableHead>Loại</TableHead>
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
                                    {c.customerType === "wholesale" ? (
                                        <Badge className="bg-purple-100 text-purple-800">Sỉ</Badge>
                                    ) : (
                                        <Badge variant="secondary">Lẻ</Badge>
                                    )}
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
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        {c.customerType === "wholesale" && (
                                            <Link href={`/customers/${c.id}/pricing`}>
                                                <Button variant="ghost" size="icon" title="Quản lý bảng giá">
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        )}
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(c)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id, c._count.orders)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
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
                        <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                            <Label className="text-left md:text-right">Tên *</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-center">
                            <Label className="text-left md:text-right">Loại khách</Label>
                            <Select
                                value={formData.customerType}
                                onValueChange={(v) => setFormData({ ...formData, customerType: v as "retail" | "wholesale" })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="retail">Khách lẻ</SelectItem>
                                    <SelectItem value="wholesale">Khách sỉ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col md:grid md:grid-cols-4 gap-2 md:gap-4 md:items-start">
                            <Label className="text-left md:text-right pt-2">SĐT Portal</Label>
                            <div className="col-span-3 space-y-2">
                                <p className="text-xs text-muted-foreground mb-2">
                                    Nhập tối đa 5 số điện thoại để xác thực trên Portal (mỗi dòng 1 số)
                                </p>
                                {[0, 1, 2, 3, 4].map(idx => (
                                    <Input
                                        key={idx}
                                        placeholder={`SĐT ${idx + 1}${idx === 0 ? " (chính)" : ""}`}
                                        value={formData.phones[idx] || ""}
                                        onChange={e => {
                                            const newPhones = [...formData.phones];
                                            newPhones[idx] = e.target.value;
                                            setFormData({ ...formData, phones: newPhones });
                                        }}
                                    />
                                ))}
                            </div>
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
