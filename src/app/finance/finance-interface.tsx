"use client";

import { useState } from "react";
import { Transaction, Customer, Supplier } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Wallet, ArrowUpRight, ArrowDownLeft, Users, Truck, PlusCircle, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { settleDebt, createManualTransaction } from "./actions";

interface FinanceInterfaceProps {
    stats: { receivables: number; payables: number; cash: number };
    debtors: { customers: Customer[]; suppliers: Supplier[] };
    initialTransactions: (Transaction & { customer: { name: string } | null; supplier: { name: string } | null })[];
}

export function FinanceInterface({ stats, debtors, initialTransactions }: FinanceInterfaceProps) {
    const [transactions, setTransactions] = useState(initialTransactions);

    // State for Settle Debt
    const [settleOpen, setSettleOpen] = useState(false);
    const [settleTarget, setSettleTarget] = useState<{ id: string; name: string; type: "CUSTOMER" | "SUPPLIER"; debt: number } | null>(null);
    const [settleAmount, setSettleAmount] = useState("");

    // State for Manual Transaction
    const [manualOpen, setManualOpen] = useState(false);
    const [manualType, setManualType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
    const [manualAmount, setManualAmount] = useState("");
    const [manualDesc, setManualDesc] = useState("");

    const formatMoney = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    const handleSettle = async () => {
        if (!settleTarget) return;
        const res = await settleDebt({
            entityId: settleTarget.id,
            type: settleTarget.type,
            amount: parseFloat(settleAmount) || 0,
        });
        if (res.success) {
            setSettleOpen(false);
            setSettleAmount("");
            // In a real app, we should update local state or router.refresh() 
            // relying on router.refresh() from actions for now but a manual reload might be needed for instant UI feedback if not using useOptimistic
            window.location.reload();
        }
    };

    const handleManual = async () => {
        const res = await createManualTransaction({
            type: manualType,
            amount: parseFloat(manualAmount) || 0,
            description: manualDesc
        });
        if (res.success) {
            setManualOpen(false);
            setManualAmount("");
            setManualDesc("");
            window.location.reload();
        }
    };

    return (
        <div className="space-y-4 pb-20">
            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-800">Tiền mặt (Cash)</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">{formatMoney(stats.cash)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-orange-800">Khách nợ (Phải thu)</CardTitle>
                        <ArrowDownLeft className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-900">{formatMoney(stats.receivables)}</div>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-800">Nợ NCC (Phải trả)</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-900">{formatMoney(stats.payables)}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="debt">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="debt">Quản lý Công Nợ</TabsTrigger>
                    <TabsTrigger value="transactions">Lịch sử Thu Chi</TabsTrigger>
                </TabsList>

                <TabsContent value="debt" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Khách hàng nợ</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {debtors.customers.map(c => (
                                <div key={c.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                                    <span className="font-medium">{c.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-red-600 font-bold">{formatMoney(c.debt)}</span>
                                        <Button size="sm" variant="outline" onClick={() => { setSettleTarget({ ...c, type: 'CUSTOMER' }); setSettleOpen(true); }}>Thu nợ</Button>
                                    </div>
                                </div>
                            ))}
                            {debtors.customers.length === 0 && <p className="text-muted-foreground text-sm">Không có khách nợ.</p>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Nợ Nhà cung cấp</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            {debtors.suppliers.map(s => (
                                <div key={s.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                                    <span className="font-medium">{s.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-red-600 font-bold">{formatMoney(s.debt)}</span>
                                        <Button size="sm" variant="outline" onClick={() => { setSettleTarget({ ...s, type: 'SUPPLIER' }); setSettleOpen(true); }}>Trả nợ</Button>
                                    </div>
                                </div>
                            ))}
                            {debtors.suppliers.length === 0 && <p className="text-muted-foreground text-sm">Không nợ nhà cung cấp.</p>}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="transactions" className="space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={() => setManualOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Ghi Thu/Chi Ngoài</Button>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            {transactions.map((t, i) => (
                                <div key={t.id} className={cn("flex justify-between items-center p-4 border-b last:border-0", i % 2 === 0 ? "bg-muted/10" : "")}>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                                ["INCOME", "DEBT_COLLECTION"].includes(t.type) ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                            )}>
                                                {t.type === "DEBT_COLLECTION" ? "THU NỢ" :
                                                    t.type === "DEBT_PAYMENT" ? "TRẢ NỢ" :
                                                        t.type === "INCOME" ? "THU KHÁC" : "CHI KHÁC"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(t.date).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium mt-1">{t.description}</p>
                                        {(t.customer || t.supplier) && (
                                            <p className="text-xs text-muted-foreground">
                                                Đối tượng: {t.customer?.name || t.supplier?.name}
                                            </p>
                                        )}
                                    </div>
                                    <span className={cn("font-bold", ["INCOME", "DEBT_COLLECTION"].includes(t.type) ? "text-green-600" : "text-red-600")}>
                                        {["INCOME", "DEBT_COLLECTION"].includes(t.type) ? "+" : "-"}{formatMoney(t.amount)}
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Settle Debt Dialog */}
            <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {settleTarget?.type === "CUSTOMER" ? "Thu nợ khách: " : "Trả nợ NCC: "} {settleTarget?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Số tiền nợ hiện tại</Label>
                            <div className="font-bold text-red-600 text-lg">{settleTarget && formatMoney(settleTarget.debt)}</div>
                        </div>
                        <div className="space-y-2">
                            <Label>Số tiền thanh toán</Label>
                            <Input type="number" value={settleAmount} onChange={e => setSettleAmount(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSettle}>Xác nhận</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manual Transaction Dialog */}
            <Dialog open={manualOpen} onOpenChange={setManualOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ghi Thu/Chi Ngoài</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex gap-4">
                            <Button
                                type="button"
                                variant={manualType === "INCOME" ? "default" : "outline"}
                                className={cn("flex-1", manualType === "INCOME" ? "bg-green-600 hover:bg-green-700" : "")}
                                onClick={() => setManualType("INCOME")}
                            >
                                Thu tiền
                            </Button>
                            <Button
                                type="button"
                                variant={manualType === "EXPENSE" ? "default" : "outline"}
                                className={cn("flex-1", manualType === "EXPENSE" ? "bg-red-600 hover:bg-red-700" : "")}
                                onClick={() => setManualType("EXPENSE")}
                            >
                                Chi tiền
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <Label>Số tiền</Label>
                            <Input type="number" value={manualAmount} onChange={e => setManualAmount(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Mô tả (Lý do)</Label>
                            <Input value={manualDesc} onChange={e => setManualDesc(e.target.value)} placeholder="VD: Tiền điện, Mua VPP..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleManual}>Lưu phiếu</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
