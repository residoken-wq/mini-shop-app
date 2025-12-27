"use client";

import { Product, Customer } from "@prisma/client";
import { useSales } from "./hooks/use-sales";
import { DesktopView } from "./desktop-view";
import { MobileView } from "./mobile-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VoiceInput } from "@/components/voice-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, UserPlus, ShoppingBag, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SalesInterfaceProps {
    initialProducts: Product[];
    initialCustomers: Customer[];
}

export function SalesInterface({ initialProducts, initialCustomers }: SalesInterfaceProps) {
    const sales = useSales({ initialProducts, initialCustomers });

    // Step 1: Customer Selection (if no customer selected)
    if (!sales.selectedCustomer && !sales.isWalkIn) {
        return (
            <div className="flex flex-col h-[calc(100vh-4rem)] gap-4 p-4">
                <h2 className="text-xl font-bold text-center">Bước 1: Chọn khách hàng</h2>

                {/* Search Customer */}
                <VoiceInput
                    placeholder="Tìm khách hàng theo tên hoặc SĐT..."
                    value={sales.customerSearch}
                    onChange={(e) => sales.setCustomerSearch(e.target.value)}
                    onTranscript={(val) => sales.setCustomerSearch(val)}
                    className="max-w-md mx-auto"
                />

                {/* Quick Actions */}
                <div className="flex gap-4 justify-center flex-wrap">
                    <Button variant="outline" className="h-16 px-8" onClick={() => sales.setIsWalkIn(true)}>
                        <ShoppingBag className="mr-2 h-5 w-5" />
                        Khách lẻ (Vãng lai)
                    </Button>
                    <Button variant="outline" className="h-16 px-8" onClick={() => sales.setNewCustomerOpen(true)}>
                        <Plus className="mr-2 h-5 w-5" />
                        Tạo khách mới
                    </Button>
                </div>

                {/* Customer List */}
                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sales.filteredCustomers.map(customer => (
                            <Card key={customer.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => sales.setSelectedCustomer(customer)}>
                                <CardHeader className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <UserPlus className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{customer.name}</CardTitle>
                                            <p className="text-sm text-muted-foreground">{customer.phone || "Không có SĐT"}</p>
                                        </div>
                                    </div>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* New Customer Dialog */}
                <Dialog open={sales.newCustomerOpen} onOpenChange={sales.setNewCustomerOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Tạo khách hàng mới</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Tên khách hàng</Label>
                                <Input
                                    value={sales.newCustomerName}
                                    onChange={(e) => sales.setNewCustomerName(e.target.value)}
                                    placeholder="Nhập tên..."
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Số điện thoại</Label>
                                <Input
                                    value={sales.newCustomerPhone}
                                    onChange={(e) => sales.setNewCustomerPhone(e.target.value)}
                                    placeholder="Nhập SĐT..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => sales.setNewCustomerOpen(false)}>Hủy</Button>
                            <Button onClick={sales.handleCreateCustomer}>Tạo & Chọn</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // Step 2: Product Selection & Cart (Desktop and Mobile views)
    return (
        <>
            <DesktopView
                searchQuery={sales.searchQuery}
                setSearchQuery={sales.setSearchQuery}
                filteredProducts={sales.filteredProducts}
                cart={sales.cart}
                setCart={sales.setCart}
                cartTotal={sales.cartTotal}
                selectedCustomer={sales.selectedCustomer}
                isWalkIn={sales.isWalkIn}
                amountPaid={sales.amountPaid}
                setAmountPaid={sales.setAmountPaid}
                isCheckoutLoading={sales.isCheckoutLoading}
                pendingItem={sales.pendingItem}
                setPendingItem={sales.setPendingItem}
                marketPrices={sales.marketPrices}
                searchInputRef={sales.searchInputRef}
                addToCart={sales.addToCart}
                removeFromCart={sales.removeFromCart}
                handleCheckout={sales.handleCheckout}
                handleVoiceCommand={sales.handleVoiceCommand}
                handlePendingKeyDown={sales.handlePendingKeyDown}
                changeCustomer={sales.changeCustomer}
                resetSale={sales.resetSale}
            />
            <MobileView
                searchQuery={sales.searchQuery}
                setSearchQuery={sales.setSearchQuery}
                filteredProducts={sales.filteredProducts}
                cart={sales.cart}
                setCart={sales.setCart}
                cartTotal={sales.cartTotal}
                selectedCustomer={sales.selectedCustomer}
                isWalkIn={sales.isWalkIn}
                amountPaid={sales.amountPaid}
                setAmountPaid={sales.setAmountPaid}
                isCheckoutLoading={sales.isCheckoutLoading}
                pendingItem={sales.pendingItem}
                setPendingItem={sales.setPendingItem}
                marketPrices={sales.marketPrices}
                mobileTab={sales.mobileTab}
                setMobileTab={sales.setMobileTab}
                searchInputRef={sales.searchInputRef}
                addToCart={sales.addToCart}
                removeFromCart={sales.removeFromCart}
                handleCheckout={sales.handleCheckout}
                handleVoiceCommand={sales.handleVoiceCommand}
                handlePendingKeyDown={sales.handlePendingKeyDown}
                changeCustomer={sales.changeCustomer}
                resetSale={sales.resetSale}
            />
        </>
    );
}
