import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAddTransaction, useUpdateTransaction } from '@/hooks/use-transactions';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategories } from '@/hooks/use-categories';
import { cn, toDateInputValue } from '@/lib/utils';
import type { Transaction, TransactionType } from '@/types';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Loader2 } from 'lucide-react';

const schema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  description: z.string().optional(),
  category_id: z.string().optional(),
  account_id: z.string().min(1, 'Select an account'),
  to_account_id: z.string().optional(),
  date: z.string().min(1, 'Select a date'),
}).refine(
  (data) => true,
  { message: 'Invalid form data' }
);

type FormValues = z.infer<typeof schema>;

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTransaction?: Transaction;
}

const typeOptions: { value: TransactionType; label: string; icon: typeof ArrowDownLeft; color: string }[] = [
  { value: 'expense', label: 'Expense', icon: ArrowUpRight, color: 'text-red-400 border-red-400/40 bg-red-500/10' },
  { value: 'income', label: 'Income', icon: ArrowDownLeft, color: 'text-emerald-400 border-emerald-400/40 bg-emerald-500/10' },
  { value: 'transfer', label: 'Transfer', icon: ArrowLeftRight, color: 'text-foreground border-foreground/30 bg-foreground/5' },
];

export default function TransactionDialog({ open, onOpenChange, editTransaction }: TransactionDialogProps) {
  const [type, setType] = useState<TransactionType>(editTransaction?.type || 'expense');
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories(type === 'transfer' ? undefined : type);
  const addMutation = useAddTransaction();
  const updateMutation = useUpdateTransaction();
  const isEditing = !!editTransaction;

  const defaultAccount = accounts.find((a) => a.is_default) || accounts[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: editTransaction?.amount || ('' as unknown as number),
      description: editTransaction?.description || '',
      category_id: editTransaction?.category_id || '',
      account_id: editTransaction?.account_id || defaultAccount?.id || '',
      to_account_id: editTransaction?.to_account_id || '',
      date: editTransaction?.date || toDateInputValue(),
    },
  });

  const filteredCategories = categories.filter((c) => c.type === type);

  const onSubmit = async (values: FormValues) => {
    try {
      if (type === 'transfer' && (!values.to_account_id || values.to_account_id === values.account_id)) {
        toast.error('Select a different destination account');
        return;
      }
      if (type !== 'transfer' && !values.category_id) {
        toast.error('Select a category');
        return;
      }

      const payload = {
        type,
        amount: values.amount,
        description: values.description,
        category_id: type === 'transfer' ? undefined : values.category_id,
        account_id: values.account_id,
        to_account_id: type === 'transfer' ? values.to_account_id : undefined,
        date: values.date,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({ id: editTransaction.id, data: payload });
        toast.success('Transaction updated');
      } else {
        await addMutation.mutateAsync(payload);
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} added`);
      }

      form.reset({
        amount: '' as unknown as number,
        description: '',
        category_id: '',
        account_id: defaultAccount?.id || '',
        to_account_id: '',
        date: toDateInputValue(),
      });
      setType('expense');
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    }
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg border-2 py-2 text-sm font-medium transition-all',
                type === opt.value ? opt.color : 'border-transparent bg-muted text-muted-foreground'
              )}
            >
              <opt.icon className="h-4 w-4" />
              {opt.label}
            </button>
          ))}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              autoFocus
              className="mt-1 text-lg font-semibold"
              {...form.register('amount')}
            />
            {form.formState.errors.amount && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          {type !== 'transfer' && (
            <div>
              <Label>Category</Label>
              <Select
                value={form.watch('category_id')}
                onValueChange={(val) => form.setValue('category_id', val)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        {cat.color && (
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                        )}
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>{type === 'transfer' ? 'From Account' : 'Account'}</Label>
            <Select
              value={form.watch('account_id')}
              onValueChange={(val) => form.setValue('account_id', val)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'transfer' && (
            <div>
              <Label>To Account</Label>
              <Select
                value={form.watch('to_account_id')}
                onValueChange={(val) => form.setValue('to_account_id', val)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.id !== form.watch('account_id'))
                    .map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What was this for?"
              className="mt-1"
              {...form.register('description')}
            />
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              max={toDateInputValue()}
              className="mt-1"
              {...form.register('date')}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : `Add ${type.charAt(0).toUpperCase() + type.slice(1)}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
