import { getSuppliers } from "./actions";
import { getProducts } from "../sales/actions";
import { SupplierInterface } from "./supplier-interface";
import SupplierList from "./supplier-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
    const products = await getProducts();
    const suppliers = await getSuppliers();

    return (
        <div className="h-full flex flex-col space-y-4">
            <h1 className="text-2xl font-bold">Nhà Cung Cấp</h1>
            <Tabs defaultValue="import" className="h-full flex flex-col">
                <TabsList>
                    <TabsTrigger value="import">Nhập Hàng</TabsTrigger>
                    <TabsTrigger value="list">Quản lý NCC</TabsTrigger>
                </TabsList>
                <TabsContent value="import" className="flex-1 mt-4">
                    <SupplierInterface initialProducts={products} initialSuppliers={suppliers} />
                </TabsContent>
                <TabsContent value="list" className="flex-1 mt-4">
                    <SupplierList initialSuppliers={suppliers as any} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
