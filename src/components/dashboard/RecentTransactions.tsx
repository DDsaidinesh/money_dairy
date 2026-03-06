import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { Transaction } from '@/types';
import EmptyState from '@/components/shared/EmptyState';
import { Receipt } from 'lucide-react';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onAddClick: () => void;
}

const typeConfig = {
  income: { icon: ArrowDownLeft, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-950', sign: '+' },
  expense: { icon: ArrowUpRight, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-950', sign: '-' },
  transfer: { icon: ArrowLeftRight, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-950', sign: '' },
};

export default function RecentTransactions({ transactions, onAddClick }: RecentTransactionsProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Recent Transactions</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')} className="text-xs">
          View all <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Start tracking by adding your first income or expense."
              actionLabel="Add Transaction"
              onAction={onAddClick}
            />
          </div>
        ) : (
          <div className="divide-y">
            {transactions.map((tx) => {
              const config = typeConfig[tx.type];
              const Icon = config.icon;
              return (
                <div key={tx.id} className="flex items-center gap-3 px-6 py-3">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', config.bg)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {tx.description || tx.category?.name || tx.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.category?.name ? `${tx.category.name} · ` : ''}
                      {formatDate(tx.date)}
                    </p>
                  </div>
                  <span className={cn('text-sm font-semibold tabular-nums', config.color)}>
                    {config.sign}{formatCurrency(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
