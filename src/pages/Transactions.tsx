import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import {
  Plus, Search, Download, Trash2, Pencil,
  ArrowUpRight, ArrowDownLeft, ArrowLeftRight,
  Loader2, Receipt, X, CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { formatCurrency, formatDateGroupKey, cn, groupByDate, toDateInputValue } from '@/lib/utils';
import TransactionDialog from '@/components/transactions/TransactionDialog';
import ExportDialog from '@/components/transactions/ExportDialog';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import type { Transaction } from '@/types';

const typeConfig = {
  income: { icon: ArrowDownLeft, color: 'text-emerald-400', bg: 'bg-emerald-500/10', sign: '+' },
  expense: { icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-500/10', sign: '-' },
  transfer: { icon: ArrowLeftRight, color: 'text-foreground/60', bg: 'bg-foreground/5', sign: '' },
};

type DatePreset = 'all' | '7d' | '30d' | 'this_month' | 'last_month' | 'custom';

const datePresets: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
];

function getPresetRange(preset: DatePreset): { from?: string; to?: string } {
  const now = new Date();
  switch (preset) {
    case 'all': return {};
    case '7d': return { from: format(subDays(now, 6), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case '30d': return { from: format(subDays(now, 29), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case 'this_month': return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
    case 'last_month': {
      const last = subMonths(now, 1);
      return { from: format(startOfMonth(last), 'yyyy-MM-dd'), to: format(endOfMonth(last), 'yyyy-MM-dd') };
    }
    case 'custom': return {};
  }
}

export default function Transactions() {
  const { openAddTransaction } = useOutletContext<{ openAddTransaction: () => void }>();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [editTx, setEditTx] = useState<Transaction | undefined>();
  const [showEdit, setShowEdit] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const dateRange = useMemo(() => {
    if (datePreset === 'custom') {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    return getPresetRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  const { data: transactions = [], isLoading } = useTransactions({
    date_from: dateRange.from,
    date_to: dateRange.to,
  });
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

  const hasActiveFilters = search || typeFilter !== 'all' || datePreset !== 'all';

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setDatePreset('all');
    setCustomFrom('');
    setCustomTo('');
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Transaction deleted');
    } catch {
      toast.error('Failed to delete transaction');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Your complete transaction history"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button size="sm" onClick={openAddTransaction} className="hidden md:inline-flex">
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4 space-y-3">
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
            <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
              <SelectTrigger className="w-full sm:w-44">
                <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {datePresets.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {datePreset === 'custom' && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={customFrom}
                  max={customTo || toDateInputValue()}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={toDateInputValue()}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground">
                {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} found
              </p>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs text-muted-foreground">
                <X className="mr-1 h-3 w-3" /> Clear filters
              </Button>
            </div>
          )}
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
          description={hasActiveFilters ? 'Try changing your filters.' : 'Add your first transaction to get started.'}
          actionLabel={!hasActiveFilters ? 'Add Transaction' : undefined}
          onAction={!hasActiveFilters ? openAddTransaction : undefined}
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

      <ExportDialog open={showExport} onOpenChange={setShowExport} />
    </div>
  );
}
