import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Transaction, TransactionFormData, TransactionFilters } from '@/types';

const TRANSACTIONS_KEY = 'transactions';
const ACCOUNTS_KEY = 'accounts';

function buildQuery(userId: string, filters?: TransactionFilters) {
  let query = supabase
    .from('transactions')
    .select(`
      *,
      category:categories(name, icon, color),
      account:accounts!transactions_account_id_fkey(name, color),
      to_account:accounts!transactions_to_account_id_fkey(name, color)
    `)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters?.account_id) {
    query = query.or(`account_id.eq.${filters.account_id},to_account_id.eq.${filters.account_id}`);
  }
  if (filters?.date_from) {
    query = query.gte('date', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('date', filters.date_to);
  }
  if (filters?.search) {
    query = query.ilike('description', `%${filters.search}%`);
  }

  return query;
}

export function useTransactions(filters?: TransactionFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TRANSACTIONS_KEY, user?.id, filters],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await buildQuery(user.id, filters);
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
    enabled: !!user,
  });
}

export function useRecentTransactions(limit: number = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TRANSACTIONS_KEY, 'recent', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(name, icon, color),
          account:accounts!transactions_account_id_fkey(name, color)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
    enabled: !!user,
  });
}

export function useAddTransaction() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: TransactionFormData) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: data.type,
        amount: data.amount,
        description: data.description || null,
        category_id: data.type === 'transfer' ? null : (data.category_id || null),
        account_id: data.account_id,
        to_account_id: data.type === 'transfer' ? data.to_account_id : null,
        date: data.date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
    },
  });
}

export function useUpdateTransaction() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TransactionFormData> }) => {
      if (!user) throw new Error('Not authenticated');
      const updatePayload: Record<string, unknown> = {};
      if (data.type !== undefined) updatePayload.type = data.type;
      if (data.amount !== undefined) updatePayload.amount = data.amount;
      if (data.description !== undefined) updatePayload.description = data.description || null;
      if (data.category_id !== undefined) updatePayload.category_id = data.category_id || null;
      if (data.account_id !== undefined) updatePayload.account_id = data.account_id;
      if (data.to_account_id !== undefined) updatePayload.to_account_id = data.to_account_id || null;
      if (data.date !== undefined) updatePayload.date = data.date;

      const { error } = await supabase
        .from('transactions')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
    },
  });
}

export function useDeleteTransaction() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
    },
  });
}
