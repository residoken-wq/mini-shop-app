import { getFinanceStats, getDebtors, getTransactions } from "./actions";
import { getSuppliers } from "../suppliers/actions";
import { FinanceInterface } from "./finance-interface";

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
    const [stats, debtors, transactions, suppliers] = await Promise.all([
        getFinanceStats(),
        getDebtors(),
        getTransactions(),
        getSuppliers()
    ]);

    return (
        <div className="h-full">
            <FinanceInterface
                stats={stats}
                debtors={debtors}
                initialTransactions={transactions}
                suppliers={suppliers}
            />
        </div>
    );
}
