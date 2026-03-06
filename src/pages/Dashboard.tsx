import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRecentTransactions, useTransactions } from '@/hooks/use-transactions';
import { useAccounts, useTotalBalance } from '@/hooks/use-accounts';
import { useProfile } from '@/hooks/use-profile';
import BalanceCard from '@/components/dashboard/BalanceCard';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import AccountsList from '@/components/dashboard/AccountsList';
import PageHeader from '@/components/shared/PageHeader';

export default function Dashboard() {
  const { openAddTransaction } = useOutletContext<{ openAddTransaction: () => void }>();
  const { data: profile } = useProfile();
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();
  const totalBalance = useTotalBalance();

  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: monthTransactions = [] } = useTransactions({
    date_from: monthStart,
    date_to: monthEnd,
  });

  const { data: recentTransactions = [], isLoading: txLoading } = useRecentTransactions(10);

  const { monthIncome, monthExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of monthTransactions) {
      if (tx.type === 'income') income += Number(tx.amount);
      else if (tx.type === 'expense') expense += Number(tx.amount);
    }
    return { monthIncome: income, monthExpense: expense };
  }, [monthTransactions]);

  const greeting = getGreeting();
  const firstName = profile?.name?.split(' ')[0] || 'there';

  if (accountsLoading || txLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description={format(now, 'EEEE, dd MMMM yyyy')}
        action={
          <Button onClick={openAddTransaction} className="hidden md:inline-flex">
            <Plus className="mr-2 h-4 w-4" /> Add Transaction
          </Button>
        }
      />

      <BalanceCard
        totalBalance={totalBalance}
        monthIncome={monthIncome}
        monthExpense={monthExpense}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RecentTransactions
            transactions={recentTransactions}
            onAddClick={openAddTransaction}
          />
        </div>
        <div className="lg:col-span-2">
          <AccountsList accounts={accounts} />
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
