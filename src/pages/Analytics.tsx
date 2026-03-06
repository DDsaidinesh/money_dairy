import { useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, subDays, subMonths, format,
} from 'date-fns';
import { Loader2, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTransactions } from '@/hooks/use-transactions';
import { formatCurrency, toDateInputValue } from '@/lib/utils';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';

type Period = '7d' | '30d' | 'this_month' | 'last_month' | 'custom';

const periods: { value: Period; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom' },
];

function getDateRange(period: Period): { from: string; to: string } {
  const now = new Date();
  switch (period) {
    case '7d':
      return { from: format(subDays(now, 6), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case '30d':
      return { from: format(subDays(now, 29), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case 'this_month':
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
    case 'last_month': {
      const last = subMonths(now, 1);
      return { from: format(startOfMonth(last), 'yyyy-MM-dd'), to: format(endOfMonth(last), 'yyyy-MM-dd') };
    }
    case 'custom':
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
  }
}

const CHART_COLORS = [
  'hsl(0 0% 85%)',
  'hsl(0 0% 70%)',
  'hsl(0 0% 55%)',
  'hsl(0 0% 45%)',
  'hsl(0 0% 35%)',
  'hsl(0 0% 65%)',
  'hsl(0 0% 50%)',
  'hsl(0 0% 40%)',
  'hsl(0 0% 75%)',
  'hsl(0 0% 60%)',
  'hsl(0 0% 30%)',
  'hsl(0 0% 80%)',
  'hsl(0 0% 25%)',
];

export default function Analytics() {
  const [period, setPeriod] = useState<Period>('this_month');
  const defaultRange = getDateRange(period);
  const [customFrom, setCustomFrom] = useState(defaultRange.from);
  const [customTo, setCustomTo] = useState(defaultRange.to);

  const range = useMemo(() => {
    if (period === 'custom') {
      return { from: customFrom, to: customTo };
    }
    return getDateRange(period);
  }, [period, customFrom, customTo]);

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    if (p !== 'custom') {
      const r = getDateRange(p);
      setCustomFrom(r.from);
      setCustomTo(r.to);
    }
  };

  const { data: transactions = [], isLoading } = useTransactions({
    date_from: range.from,
    date_to: range.to,
  });

  const { income, expense, categoryBreakdown } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const catMap = new Map<string, { name: string; total: number }>();

    for (const tx of transactions) {
      if (tx.type === 'income') inc += Number(tx.amount);
      if (tx.type === 'expense') {
        exp += Number(tx.amount);
        const catName = tx.category?.name || 'Uncategorized';
        const existing = catMap.get(catName) || { name: catName, total: 0 };
        existing.total += Number(tx.amount);
        catMap.set(catName, existing);
      }
    }

    const sorted = Array.from(catMap.values()).sort((a, b) => b.total - a.total);
    const total = sorted.reduce((s, c) => s + c.total, 0);
    const breakdown = sorted.map((c, i) => ({
      ...c,
      percentage: total > 0 ? Math.round((c.total / total) * 100) : 0,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));

    return { income: inc, expense: exp, categoryBreakdown: breakdown };
  }, [transactions]);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Understand your spending patterns" />

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePeriodChange(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {period === 'custom' && (
          <Card>
            <CardContent className="p-4">
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
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-sm">Total Income</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-400 tabular-nums">
              {formatCurrency(income)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <span className="text-sm">Total Expenses</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-red-400 tabular-nums">
              {formatCurrency(expense)}
            </p>
          </CardContent>
        </Card>
      </div>

      {transactions.length === 0 ? (
        <EmptyState icon={BarChart3} title="No data for this period" description="Start tracking your expenses to see analytics here." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Income vs Expenses</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'Period', income, expense }]} barGap={8}>
                    <XAxis dataKey="name" tick={false} axisLine={false} />
                    <YAxis
                      tickFormatter={(v) => formatCurrency(v)}
                      width={80}
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(0 0% 55%)' }}
                    />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{
                        background: 'hsl(0 0% 7%)',
                        border: '1px solid hsl(0 0% 14%)',
                        borderRadius: '0.5rem',
                        color: 'hsl(0 0% 95%)',
                      }}
                    />
                    <Bar dataKey="income" fill="hsl(0 0% 85%)" radius={[6, 6, 0, 0]} name="Income" />
                    <Bar dataKey="expense" fill="hsl(0 0% 45%)" radius={[6, 6, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Spending by Category</CardTitle></CardHeader>
            <CardContent>
              {categoryBreakdown.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No expense data</p>
              ) : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          dataKey="total"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          stroke="hsl(0 0% 7%)"
                          strokeWidth={2}
                        >
                          {categoryBreakdown.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => formatCurrency(v)}
                          contentStyle={{
                            background: 'hsl(0 0% 7%)',
                            border: '1px solid hsl(0 0% 14%)',
                            borderRadius: '0.5rem',
                            color: 'hsl(0 0% 95%)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                    {categoryBreakdown.map((cat) => (
                      <div key={cat.name} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="flex-1 truncate">{cat.name}</span>
                        <span className="tabular-nums text-muted-foreground">{cat.percentage}%</span>
                        <span className="tabular-nums font-medium w-24 text-right">{formatCurrency(cat.total)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
