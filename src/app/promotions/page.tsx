import Link from "next/link";
import { format } from "date-fns";
import { Plus, Edit, Trash2, Tag, Calendar, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { getPromotions, deletePromotion } from "./actions";

export default async function PromotionsPage() {
    const { data: promotions } = await getPromotions();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Chương Trình Khuyến Mãi</h1>
                    <p className="text-muted-foreground">
                        Quản lý các chiến dịch giảm giá và ưu đãi.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/promotions/new">
                        <Plus className="w-4 h-4 mr-2" /> Tạo mới
                    </Link>
                </Button>
            </div>

            <div className="border rounded-lg shadow-sm bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">Tên chương trình</TableHead>
                            <TableHead>Thời gian</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Sản phẩm</TableHead>
                            <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!promotions || promotions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    Chưa có chương trình khuyến mãi nào.
                                </TableCell>
                            </TableRow>
                        ) : (
                            promotions.map((p) => {
                                const now = new Date();
                                const isExpired = new Date(p.endDate) < now;
                                const isUpcoming = new Date(p.startDate) > now;
                                const isActive = p.isActive && !isExpired;

                                return (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            <div className="font-medium text-base">{p.name}</div>
                                            {p.description && (
                                                <div className="text-sm text-gray-500 truncate max-w-[280px]">
                                                    {p.description}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span className="text-gray-500">Bắt đầu: {format(new Date(p.startDate), "dd/MM/yyyy")}</span>
                                                <span className="text-gray-500">Kết thúc: {format(new Date(p.endDate), "dd/MM/yyyy")}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {isExpired ? (
                                                <Badge variant="secondary" className="bg-gray-200 text-gray-700">Đã kết thúc</Badge>
                                            ) : isUpcoming ? (
                                                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Sắp diễn ra</Badge>
                                            ) : p.isActive ? (
                                                <Badge className="bg-green-600">Đang chạy</Badge>
                                            ) : (
                                                <Badge variant="secondary">Tạm dừng</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-normal">
                                                {p.products.length} sản phẩm
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={`/promotions/${p.id}`}>
                                                        <Edit className="w-4 h-4 text-blue-600" />
                                                    </Link>
                                                </Button>
                                                {/* Delete button could be a client component or form action. 
                                                    For simplicity in list view, I'll omit delete or implement later.
                                                    Actually, I can wrap it in a form. 
                                                */}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
