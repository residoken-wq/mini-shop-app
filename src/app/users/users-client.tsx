"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Plus, Search, Edit, Trash2, UserCircle, Shield, User, Eye, EyeOff, Key } from "lucide-react";
import { createUser, updateUser, deleteUser } from "./actions";

interface UserData {
    id: string;
    username: string;
    name: string;
    role: string;
    createdAt: Date;
}

interface UsersClientProps {
    initialUsers: UserData[];
}

export default function UsersClient({ initialUsers }: UsersClientProps) {
    const [users, setUsers] = useState(initialUsers);
    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState<"all" | "admin" | "staff">("all");

    // Dialog State
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<"CREATE" | "EDIT">("CREATE");
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        name: "",
        role: "staff"
    });
    const [showPassword, setShowPassword] = useState(false);

    const filtered = users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.username.toLowerCase().includes(search.toLowerCase());
        const matchesRole = filterRole === "all" || u.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const handleOpenCreate = () => {
        setMode("CREATE");
        setFormData({ username: "", password: "", name: "", role: "staff" });
        setShowPassword(false);
        setIsOpen(true);
    };

    const handleOpenEdit = (user: UserData) => {
        setMode("EDIT");
        setSelectedUser(user);
        setFormData({
            username: user.username,
            password: "",
            name: user.name,
            role: user.role
        });
        setShowPassword(false);
        setIsOpen(true);
    };

    const handleSubmit = async () => {
        if (mode === "CREATE") {
            if (!formData.username || !formData.password || !formData.name) {
                alert("Vui lòng điền đầy đủ thông tin");
                return;
            }
            const res = await createUser(formData);
            if (res.success && res.user) {
                setUsers([res.user, ...users]);
                setIsOpen(false);
            } else {
                alert("Lỗi: " + res.error);
            }
        } else {
            if (!selectedUser) return;
            if (!formData.name) {
                alert("Vui lòng nhập tên");
                return;
            }
            const res = await updateUser(selectedUser.id, {
                name: formData.name,
                role: formData.role,
                password: formData.password || undefined
            });
            if (res.success && res.user) {
                setUsers(users.map(u => u.id === selectedUser.id ? res.user! : u));
                setIsOpen(false);
            } else {
                alert("Lỗi: " + res.error);
            }
        }
    };

    const handleDelete = async (user: UserData) => {
        if (!confirm(`Xóa người dùng "${user.name}"?`)) return;

        const res = await deleteUser(user.id);
        if (res.success) {
            setUsers(users.filter(u => u.id !== user.id));
        } else {
            alert("Lỗi: " + res.error);
        }
    };

    return (
        <div className="space-y-4 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <UserCircle className="w-7 h-7 text-purple-600" />
                        Quản lý Người dùng
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Quản lý tài khoản đăng nhập của nhân viên
                    </p>
                </div>
                <Button onClick={handleOpenCreate} className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600">
                    <Plus className="mr-2 h-4 w-4" /> Thêm người dùng
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 items-center bg-white rounded-lg p-3 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm theo tên hoặc username..."
                        className="pl-9"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {(["all", "admin", "staff"] as const).map(role => (
                        <Button
                            key={role}
                            variant={filterRole === role ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterRole(role)}
                            className={filterRole === role ? "bg-purple-600 hover:bg-purple-700" : ""}
                        >
                            {role === "all" ? "Tất cả" : role === "admin" ? "Admin" : "Nhân viên"}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-purple-500">
                    <p className="text-sm text-gray-500">Tổng người dùng</p>
                    <p className="text-2xl font-bold text-purple-600">{users.length}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-500">
                    <p className="text-sm text-gray-500">Admin</p>
                    <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === "admin").length}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-green-500">
                    <p className="text-sm text-gray-500">Nhân viên</p>
                    <p className="text-2xl font-bold text-green-600">{users.filter(u => u.role === "staff").length}</p>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            <TableHead>Người dùng</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Vai trò</TableHead>
                            <TableHead>Ngày tạo</TableHead>
                            <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Không tìm thấy người dùng
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map(user => (
                                <TableRow key={user.id} className="hover:bg-gray-50">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === "admin"
                                                    ? "bg-gradient-to-br from-purple-500 to-pink-500"
                                                    : "bg-gradient-to-br from-blue-500 to-cyan-500"
                                                } text-white font-medium`}>
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{user.username}</code>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={user.role === "admin" ? "default" : "secondary"}
                                            className={user.role === "admin"
                                                ? "bg-purple-100 text-purple-700 hover:bg-purple-100"
                                                : "bg-blue-100 text-blue-700 hover:bg-blue-100"
                                            }
                                        >
                                            {user.role === "admin" ? (
                                                <><Shield className="w-3 h-3 mr-1" /> Admin</>
                                            ) : (
                                                <><User className="w-3 h-3 mr-1" /> Nhân viên</>
                                            )}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-gray-500 text-sm">
                                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleOpenEdit(user)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(user)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-md p-0 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-pink-500 p-6 text-white">
                        <DialogTitle className="text-xl font-bold flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                {mode === "CREATE" ? <Plus className="w-5 h-5" /> : <Edit className="w-5 h-5" />}
                            </div>
                            {mode === "CREATE" ? "Thêm Người dùng" : "Chỉnh sửa Người dùng"}
                        </DialogTitle>
                        <p className="text-white/70 text-sm mt-2">
                            {mode === "CREATE"
                                ? "Tạo tài khoản đăng nhập mới cho nhân viên"
                                : `Đang sửa: ${selectedUser?.name}`
                            }
                        </p>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                Họ và tên <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="VD: Nguyễn Văn A"
                                className="h-11"
                            />
                        </div>

                        {/* Username */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                Tên đăng nhập <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                placeholder="VD: nguyenvana"
                                className="h-11"
                                disabled={mode === "EDIT"}
                            />
                            {mode === "EDIT" && (
                                <p className="text-xs text-muted-foreground">Username không thể thay đổi</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <Key className="w-4 h-4" />
                                {mode === "CREATE" ? "Mật khẩu" : "Mật khẩu mới"}
                                {mode === "CREATE" && <span className="text-red-500">*</span>}
                            </Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={mode === "EDIT" ? "Để trống nếu không đổi" : "Nhập mật khẩu"}
                                    className="h-11 pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-11 w-11"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Vai trò</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.role === "staff"
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    onClick={() => setFormData({ ...formData, role: "staff" })}
                                >
                                    <User className={`w-6 h-6 mb-2 ${formData.role === "staff" ? "text-blue-600" : "text-gray-400"}`} />
                                    <p className="font-medium">Nhân viên</p>
                                    <p className="text-xs text-gray-500">Quyền cơ bản</p>
                                </div>
                                <div
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.role === "admin"
                                            ? "border-purple-500 bg-purple-50"
                                            : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    onClick={() => setFormData({ ...formData, role: "admin" })}
                                >
                                    <Shield className={`w-6 h-6 mb-2 ${formData.role === "admin" ? "text-purple-600" : "text-gray-400"}`} />
                                    <p className="font-medium">Admin</p>
                                    <p className="text-xs text-gray-500">Toàn quyền</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t bg-gray-50 p-4 flex justify-between">
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 px-6"
                        >
                            {mode === "CREATE" ? "Tạo người dùng" : "Lưu thay đổi"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
