import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Plus, Star, Trash2, Loader2, Wallet,
  ArrowLeftRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useAccounts, useAddAccount, useUpdateAccount, useDeleteAccount, useTotalBalance,
} from '@/hooks/use-accounts';
import { useAddTransaction } from '@/hooks/use-transactions';
import { formatCurrency, cn, toDateInputValue } from '@/lib/utils';
import { ACCOUNT_TYPE_META, isDebtAccount } from '@/lib/constants';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import type { AccountType } from '@/types';

const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.string().min(1, 'Select an account type'),
  initial_balance: z.coerce.number().min(0, 'Must be 0 or greater'),
});

const transferSchema = z.object({
  from_account_id: z.string().min(1),
  to_account_id: z.string().min(1),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  description: z.string().optional(),
}).refine((d) => d.from_account_id !== d.to_account_id, {
  message: 'Source and destination must be different',
  path: ['to_account_id'],
});

export default function Accounts() {
  const { data: accounts = [], isLoading } = useAccounts();
  const totalBalance = useTotalBalance();
  const addMutation = useAddAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();
  const transferMutation = useAddTransaction();

  const [showAdd, setShowAdd] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const addForm = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: '', type: '', initial_balance: 0 },
  });

  const transferForm = useForm({
    resolver: zodResolver(transferSchema),
    defaultValues: { from_account_id: '', to_account_id: '', amount: '' as unknown as number, description: '' },
  });

  const watchedType = addForm.watch('type') as AccountType;
  const isDebt = watchedType ? isDebtAccount(watchedType) : false;

  useEffect(() => {
    if (showAdd) {
      addForm.reset({ name: '', type: '', initial_balance: 0 });
    }
  }, [showAdd, addForm]);

  useEffect(() => {
    if (showTransfer) {
      transferForm.reset({ from_account_id: '', to_account_id: '', amount: '' as unknown as number, description: '' });
    }
  }, [showTransfer, transferForm]);

  const handleAddAccount = async (values: z.infer<typeof accountSchema>) => {
    try {
      await addMutation.mutateAsync({
        name: values.name,
        type: values.type as AccountType,
        initial_balance: values.initial_balance,
      });
      toast.success('Account created');
      setShowAdd(false);
    } catch {
      toast.error('Failed to create account');
    }
  };

  const handleTransfer = async (values: z.infer<typeof transferSchema>) => {
    try {
      await transferMutation.mutateAsync({
        type: 'transfer',
        amount: values.amount,
        description: values.description || 'Transfer',
        account_id: values.from_account_id,
        to_account_id: values.to_account_id,
        date: toDateInputValue(),
      });
      toast.success('Transfer completed');
      setShowTransfer(false);
    } catch {
      toast.error('Transfer failed');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await updateMutation.mutateAsync({ id, data: { is_default: true } });
      toast.success('Default account updated');
    } catch {
      toast.error('Failed to update default');
    }
  };

  const handleDelete = async (id: string) => {
    const target = accounts.find((a) => a.id === id);
    if (!target) return;

    if (target.is_default) {
      toast.error('Cannot archive the default account. Set another account as default first.');
      return;
    }
    if (accounts.length <= 1) {
      toast.error('You must have at least one account');
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Account archived');
    } catch {
      toast.error('Failed to archive account');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description={`Net worth: ${formatCurrency(totalBalance)}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowTransfer(true)} disabled={accounts.length < 2}>
              <ArrowLeftRight className="mr-2 h-4 w-4" /> Transfer
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Account
            </Button>
          </div>
        }
      />

      {accounts.length === 0 ? (
        <EmptyState icon={Wallet} title="No accounts" description="Create your first account to start tracking." actionLabel="Add Account" onAction={() => setShowAdd(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {accounts.map((acc) => {
            const meta = ACCOUNT_TYPE_META[acc.type] || ACCOUNT_TYPE_META.other;
            const balance = Number(acc.balance);
            const isDebtType = meta.isDebt;
            return (
              <Card key={acc.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${acc.color || meta.color}20` }}
                      >
                        <span className="text-base font-semibold" style={{ color: acc.color || meta.color }}>
                          {acc.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold">{acc.name}</h3>
                          {acc.is_default && <Star className="h-3.5 w-3.5 fill-foreground/50 text-foreground/50" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{meta.label}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!acc.is_default && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Set as default" onClick={() => handleSetDefault(acc.id)}>
                          <Star className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {!acc.is_default && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Archive &quot;{acc.name}&quot;?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This account will be hidden. Existing transactions are preserved.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(acc.id)} className="bg-destructive text-destructive-foreground">
                                Archive
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className={cn(
                      'text-2xl font-bold tabular-nums',
                      isDebtType ? 'text-red-400' : (balance < 0 ? 'text-red-400' : '')
                    )}>
                      {isDebtType
                        ? `${formatCurrency(Math.abs(balance))} owed`
                        : formatCurrency(balance)
                      }
                    </p>
                    {isDebtType && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Initial: {formatCurrency(Math.abs(Number(acc.initial_balance)))} owed
                      </p>
                    )}
                    {!isDebtType && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Initial: {formatCurrency(Number(acc.initial_balance))}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Account Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
          <form onSubmit={addForm.handleSubmit(handleAddAccount)} className="space-y-4">
            <div>
              <Label>Account Name</Label>
              <Input placeholder="e.g. HDFC Savings" className="mt-1" {...addForm.register('name')} />
              {addForm.formState.errors.name && <p className="mt-1 text-xs text-destructive">{addForm.formState.errors.name.message}</p>}
            </div>
            <div>
              <Label>Type</Label>
              <Select value={addForm.watch('type')} onValueChange={(v) => addForm.setValue('type', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPE_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>{meta.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isDebt ? 'Outstanding Balance' : 'Current Balance'}</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" className="mt-1" {...addForm.register('initial_balance')} />
              <p className="mt-1 text-xs text-muted-foreground">
                {isDebt
                  ? 'Enter how much you currently owe on this account'
                  : 'Enter how much you currently have in this account'
                }
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Transfer Between Accounts</DialogTitle></DialogHeader>
          <form onSubmit={transferForm.handleSubmit(handleTransfer)} className="space-y-4">
            <div>
              <Label>From</Label>
              <Select value={transferForm.watch('from_account_id')} onValueChange={(v) => transferForm.setValue('from_account_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Source account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({formatCurrency(Number(a.balance))})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To</Label>
              <Select value={transferForm.watch('to_account_id')} onValueChange={(v) => transferForm.setValue('to_account_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Destination account" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter((a) => a.id !== transferForm.watch('from_account_id')).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} ({formatCurrency(Number(a.balance))})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {transferForm.formState.errors.to_account_id && <p className="mt-1 text-xs text-destructive">{transferForm.formState.errors.to_account_id.message}</p>}
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" className="mt-1" {...transferForm.register('amount')} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input placeholder="e.g. Monthly savings" className="mt-1" {...transferForm.register('description')} />
            </div>
            <Button type="submit" className="w-full" disabled={transferMutation.isPending}>
              {transferMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transfer
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
