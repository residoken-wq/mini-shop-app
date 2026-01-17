import { getSuppliers, getPurchaseOrders, getCarriers } from "./actions";
import { getProducts } from "../sales/actions";
import { SupplierInterface } from "./supplier-interface";
import SupplierList from "./supplier-list";
import PurchaseHistory from "./purchase-history";
import CarrierList from "./carrier-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
    const products = await getProducts();
    const suppliers = await getSuppliers();
    const purchaseOrders = await getPurchaseOrders();
    const carriers = await getCarriers();

    return (
        <div className="h-full flex flex-col space-y-4">
            <h1 className="text-2xl font-bold">Nhà Cung Cấp & Vận Chuyển</h1>
            <Tabs defaultValue="import" className="h-full flex flex-col">
                <TabsList>
                    <TabsTrigger value="import">Nhập Hàng</TabsTrigger>
                    <TabsTrigger value="list">Quản lý NCC</TabsTrigger>
                    <TabsTrigger value="carriers">Quản lý NVC</TabsTrigger>
                    <TabsTrigger value="history">Lịch sử mua</TabsTrigger>
                </TabsList>
                <TabsContent value="import" className="flex-1 mt-4">
                    <SupplierInterface initialProducts={products} initialSuppliers={suppliers} />
                </TabsContent>
                <TabsContent value="list" className="flex-1 mt-4">
                    <SupplierList initialSuppliers={suppliers as any} />
                </TabsContent>
                <TabsContent value="carriers" className="flex-1 mt-4">
                    <CarrierList initialCarriers={carriers as any} />
                </TabsContent>
                <TabsContent value="history" className="flex-1 mt-4">
                    <PurchaseHistory initialOrders={purchaseOrders as any} suppliers={suppliers as any} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
