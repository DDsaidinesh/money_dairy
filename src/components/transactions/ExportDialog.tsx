import { useState, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import { Download, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toDateInputValue } from '@/lib/utils';
import { toast } from 'sonner';

type ExportPreset = 'this_month' | 'last_month' | '30d' | '90d' | 'this_year' | 'custom';

const presets: { value: ExportPreset; label: string }[] = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

function getPresetDates(preset: ExportPreset): { from: string; to: string } {
  const now = new Date();
  switch (preset) {
    case 'this_month':
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
    case 'last_month': {
      const last = subMonths(now, 1);
      return { from: format(startOfMonth(last), 'yyyy-MM-dd'), to: format(endOfMonth(last), 'yyyy-MM-dd') };
    }
    case '30d':
      return { from: format(subDays(now, 29), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case '90d':
      return { from: format(subDays(now, 89), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case 'this_year':
      return { from: `${now.getFullYear()}-01-01`, to: format(now, 'yyyy-MM-dd') };
    case 'custom':
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
  }
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const { user } = useAuth();
  const [preset, setPreset] = useState<ExportPreset>('this_month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  const handlePresetChange = useCallback((value: ExportPreset) => {
    setPreset(value);
    if (value !== 'custom') {
      const dates = getPresetDates(value);
      setCustomFrom(dates.from);
      setCustomTo(dates.to);
    }
  }, []);

  const handleExport = async () => {
    if (!user) return;

    const dateFrom = preset === 'custom' ? customFrom : getPresetDates(preset).from;
    const dateTo = preset === 'custom' ? customTo : getPresetDates(preset).to;

    if (!dateFrom || !dateTo) {
      toast.error('Select both From and To dates');
      return;
    }

    setExporting(true);
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name),
          account:accounts!transactions_account_id_fkey(name),
          to_account:accounts!transactions_to_account_id_fkey(name)
        `)
        .eq('user_id', user.id)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('No transactions found for the selected range');
        return;
      }

      const headers = ['Date', 'Type', 'Amount', 'Category', 'Description', 'Account', 'To Account'];
      const rows = data.map((tx: Record<string, unknown>) => {
        const cat = tx.category as { name: string } | null;
        const acc = tx.account as { name: string } | null;
        const toAcc = tx.to_account as { name: string } | null;
        return [
          tx.date,
          tx.type,
          tx.amount,
          cat?.name || '',
          tx.description || '',
          acc?.name || '',
          toAcc?.name || '',
        ];
      });

      const csv = [headers, ...rows]
        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${dateFrom}-to-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${data.length} transactions`);
      onOpenChange(false);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Transactions</DialogTitle>
          <DialogDescription>
            Choose a date range and type to export as CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Date Range</Label>
            <Select value={preset} onValueChange={(v) => handlePresetChange(v as ExportPreset)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preset === 'custom' && (
            <div className="flex gap-3">
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

          <div>
            <Label>Transaction Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income Only</SelectItem>
                <SelectItem value="expense">Expenses Only</SelectItem>
                <SelectItem value="transfer">Transfers Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleExport} className="w-full" disabled={exporting}>
            {exporting
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Download className="mr-2 h-4 w-4" />
            }
            Export CSV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
