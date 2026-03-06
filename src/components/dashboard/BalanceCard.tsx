import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface BalanceCardProps {
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
}

export default function BalanceCard({ totalBalance, monthIncome, monthExpense }: BalanceCardProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="sm:col-span-3 bg-primary text-primary-foreground">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-primary-foreground/70">
            <Wallet className="h-4 w-4" />
            <span className="text-sm font-medium">Total Balance</span>
          </div>
          <p className="mt-1 text-3xl font-bold tracking-tight">
            {formatCurrency(totalBalance)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm">Income</span>
          </div>
          <p className="mt-2 text-xl font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(monthIncome)}
          </p>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-sm">Expenses</span>
          </div>
          <p className="mt-2 text-xl font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(monthExpense)}
          </p>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm">Net</span>
          </div>
          <p className={`mt-2 text-xl font-semibold ${monthIncome - monthExpense >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(monthIncome - monthExpense)}
          </p>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>
    </div>
  );
}
