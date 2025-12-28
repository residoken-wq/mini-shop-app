import { getCustomer, getWholesalePrices, getProductsForPricing, getWholesaleCustomers } from "./actions";
import { PricingClient } from "./pricing-client";
import { notFound, redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function PricingPage({ params }: PageProps) {
    const { id } = await params;
    const customer = await getCustomer(id);

    if (!customer) {
        notFound();
    }

    // Only wholesale customers can have pricing tables
    if (customer.customerType !== "wholesale") {
        redirect(`/customers?error=not-wholesale`);
    }

    const wholesalePrices = await getWholesalePrices(id);
    const allProducts = await getProductsForPricing(id);
    const wholesaleCustomers = await getWholesaleCustomers();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Bảng Giá Sỉ</h1>
                    <p className="text-muted-foreground">
                        Khách hàng: <strong>{customer.name}</strong> {customer.phone && `(${customer.phone})`}
                    </p>
                </div>
            </div>

            <PricingClient
                customerId={id}
                customerName={customer.name}
                wholesalePrices={wholesalePrices}
                allProducts={allProducts}
                wholesaleCustomers={wholesaleCustomers.filter(c => c.id !== id)}
            />
        </div>
    );
}
