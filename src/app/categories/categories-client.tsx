"use client";

import { useState } from "react";
import { Category } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Plus, Search } from "lucide-react";
import { createCategory, updateCategory, deleteCategory } from "./actions";

interface CategoriesPageProps {
    initialCategories: (Category & { _count: { products: number } })[];
}

export default function CategoriesClient({ initialCategories }: CategoriesPageProps) {
    const [categories, setCategories] = useState(initialCategories);
    const [search, setSearch] = useState("");

    // Dialog State
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<"CREATE" | "EDIT">("CREATE");
    const [selectedCat, setSelectedCat] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ name: "", code: "" });

    const filtered = categories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
    );

    const handleOpenCreate = () => {
        setMode("CREATE");
        setFormData({ name: "", code: "" });
        setIsOpen(true);
    };

    const handleOpenEdit = (cat: Category) => {
        setMode("EDIT");
        setSelectedCat(cat);
        setFormData({ name: cat.name, code: cat.code });
        setIsOpen(true);
    };

    const handleSubmit = async () => {
        if (mode === "CREATE") {
            const res = await createCategory(formData.name, formData.code);
            if (res.success && res.category) {
                setCategories([...categories, { ...res.category, _count: { products: 0 } }]);
                setIsOpen(false);
            } else {
                alert("Lỗi: " + res.error);
            }
        } else {
            if (!selectedCat) return;
            const res = await updateCategory(selectedCat.id, formData.name, formData.code);
            if (res.success && res.category) {
                setCategories(categories.map(c => c.id === selectedCat.id ? { ...res.category!, _count: c._count } : c));
                setIsOpen(false);
            } else {
                alert("Lỗi: " + res.error);
            }
        }
    };

    const handleDelete = async (id: string, count: number) => {
        if (count > 0) {
            alert("Không thể xóa danh mục đang có sản phẩm!");
            return;
        }
        if (!confirm("Bạn có chắc muốn xóa?")) return;

        const res = await deleteCategory(id);
        if (res.success) {
            setCategories(categories.filter(c => c.id !== id));
        } else {
            alert("Lỗi: " + res.error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Quản lý Danh mục</h1>
                <Button onClick={handleOpenCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Thêm Danh Mục
                </Button>
            </div>

            <div className="flex items-center gap-2 max-w-sm">
                <Search className="h-4 w-4" />
                <Input
                    placeholder="Tìm danh mục..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Mã (Prefix)</TableHead>
                            <TableHead>Tên Danh Mục</TableHead>
                            <TableHead>Số lượng SP</TableHead>
                            <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length > 0 ? filtered.map(cat => (
                            <TableRow key={cat.id}>
                                <TableCell className="font-mono">{cat.code}</TableCell>
                                <TableCell className="font-medium">{cat.name}</TableCell>
                                <TableCell>{cat._count.products}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(cat)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(cat.id, cat._count.products)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
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
                        <DialogTitle>{mode === "CREATE" ? "Thêm Danh Mục" : "Sửa Danh Mục"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Tên</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Mã (Prefix)</Label>
                            <Input
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                className="col-span-3"
                                placeholder="VD: RAU"
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
