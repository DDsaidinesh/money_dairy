import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Plus, Search, Download, Trash2, Pencil,
  ArrowUpRight, ArrowDownLeft, ArrowLeftRight,
  Loader2, Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTransactions, useDeleteTransaction } from '@/hooks/use-transactions';
import { useCategories } from '@/hooks/use-categories';
import { formatCurrency, formatDateGroupKey, cn, groupByDate } from '@/lib/utils';
import TransactionDialog from '@/components/transactions/TransactionDialog';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import type { Transaction, TransactionType } from '@/types';

const typeConfig = {
  income: { icon: ArrowDownLeft, color: 'text-emerald-400', bg: 'bg-emerald-500/10', sign: '+' },
  expense: { icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-500/10', sign: '-' },
  transfer: { icon: ArrowLeftRight, color: 'text-foreground/60', bg: 'bg-foreground/5', sign: '' },
};

export default function Transactions() {
  const { openAddTransaction } = useOutletContext<{ openAddTransaction: () => void }>();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editTx, setEditTx] = useState<Transaction | undefined>();
  const [showEdit, setShowEdit] = useState(false);

  const { data: transactions = [], isLoading } = useTransactions();
  const deleteMutation = useDeleteTransaction();

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchDesc = tx.description?.toLowerCase().includes(q);
        const matchCat = tx.category?.name?.toLowerCase().includes(q);
        if (!matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, search]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Transaction deleted');
    } catch {
      toast.error('Failed to delete transaction');
    }
  };

  const handleExport = () => {
    const headers = ['Date', 'Type', 'Amount', 'Category', 'Description', 'Account'];
    const rows = filtered.map((tx) => [
      tx.date,
      tx.type,
      tx.amount,
      tx.category?.name || '',
      tx.description || '',
      tx.account?.name || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Your complete transaction history"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button size="sm" onClick={openAddTransaction} className="hidden md:inline-flex">
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No transactions found"
          description={search || typeFilter !== 'all' ? 'Try changing your filters.' : 'Add your first transaction to get started.'}
          actionLabel={!search && typeFilter === 'all' ? 'Add Transaction' : undefined}
          onAction={!search && typeFilter === 'all' ? openAddTransaction : undefined}
        />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([dateKey, txs]) => (
            <div key={dateKey}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                {formatDateGroupKey(dateKey)}
              </h3>
              <Card>
                <CardContent className="p-0 divide-y divide-border/50">
                  {txs.map((tx) => {
                    const config = typeConfig[tx.type];
                    const Icon = config.icon;
                    return (
                      <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', config.bg)}>
                          <Icon className={cn('h-4 w-4', config.color)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {tx.description || tx.category?.name || tx.type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tx.category?.name && `${tx.category.name} · `}
                            {tx.account?.name || 'Unknown'}
                            {tx.type === 'transfer' && tx.to_account?.name && ` → ${tx.to_account.name}`}
                          </p>
                        </div>
                        <span className={cn('text-sm font-semibold tabular-nums whitespace-nowrap', config.color)}>
                          {config.sign}{formatCurrency(tx.amount)}
                        </span>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setEditTx(tx); setShowEdit(true); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove this {tx.type} of {formatCurrency(tx.amount)}.
                                  Account balances will be adjusted automatically.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(tx.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {editTx && (
        <TransactionDialog
          open={showEdit}
          onOpenChange={(open) => { setShowEdit(open); if (!open) setEditTx(undefined); }}
          editTransaction={editTx}
        />
      )}
    </div>
  );
}
