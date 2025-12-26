import { getFinanceStats, getDebtors, getTransactions } from "./actions";
import { FinanceInterface } from "./finance-interface";

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
    const [stats, debtors, transactions] = await Promise.all([
        getFinanceStats(),
        getDebtors(),
        getTransactions()
    ]);

    return (
        <div className="h-full">
            <FinanceInterface
                stats={stats}
                debtors={debtors}
                initialTransactions={transactions}
            />
        </div>
    );
}
