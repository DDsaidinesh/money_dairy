import { useNavigate } from 'react-router-dom';
import { ChevronRight, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { ACCOUNT_TYPE_META } from '@/lib/constants';
import type { Account } from '@/types';

interface AccountsListProps {
  accounts: Account[];
}

export default function AccountsList({ accounts }: AccountsListProps) {
  const navigate = useNavigate();

  if (accounts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Accounts</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/accounts')} className="text-xs">
          Manage <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {accounts.map((acc) => {
            const meta = ACCOUNT_TYPE_META[acc.type] || ACCOUNT_TYPE_META.other;
            return (
              <div key={acc.id} className="flex items-center gap-3 px-6 py-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${acc.color || meta.color}20` }}
                >
                  <span className="text-sm" style={{ color: acc.color || meta.color }}>
                    {acc.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium">{acc.name}</p>
                    {acc.is_default && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{meta.label}</p>
                </div>
                <span className={cn(
                  'text-sm font-semibold tabular-nums',
                  Number(acc.balance) >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'
                )}>
                  {formatCurrency(Number(acc.balance))}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
