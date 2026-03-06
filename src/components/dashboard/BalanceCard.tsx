import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface BalanceCardProps {
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
}

export default function BalanceCard({ totalBalance, monthIncome, monthExpense }: BalanceCardProps) {
  const net = monthIncome - monthExpense;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="sm:col-span-3 border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span className="text-sm font-medium">Total Balance</span>
          </div>
          <p className="mt-1 text-3xl font-display font-bold tracking-tight">
            {formatCurrency(totalBalance)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-sm">Income</span>
          </div>
          <p className="mt-2 text-xl font-semibold text-emerald-400 tabular-nums">
            {formatCurrency(monthIncome)}
          </p>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <TrendingDown className="h-4 w-4 text-red-400" />
            </div>
            <span className="text-sm">Expenses</span>
          </div>
          <p className="mt-2 text-xl font-semibold text-red-400 tabular-nums">
            {formatCurrency(monthExpense)}
          </p>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5">
              <TrendingUp className="h-4 w-4 text-foreground/60" />
            </div>
            <span className="text-sm">Net</span>
          </div>
          <p className={`mt-2 text-xl font-semibold tabular-nums ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(net)}
          </p>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>
    </div>
  );
}
