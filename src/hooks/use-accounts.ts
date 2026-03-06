import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Account, AccountFormData } from '@/types';

const ACCOUNTS_KEY = 'accounts';

export function useAccounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [ACCOUNTS_KEY, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return (data ?? []) as Account[];
    },
    enabled: !!user,
  });
}

export function useDefaultAccount() {
  const { data: accounts } = useAccounts();
  return accounts?.find((a) => a.is_default) ?? accounts?.[0] ?? null;
}

export function useTotalBalance() {
  const { data: accounts } = useAccounts();
  if (!accounts) return 0;
  return accounts.reduce((sum, a) => sum + Number(a.balance), 0);
}

export function useAddAccount() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: AccountFormData) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('accounts').insert({
        user_id: user.id,
        name: data.name,
        type: data.type,
        balance: data.initial_balance,
        initial_balance: data.initial_balance,
        icon: data.icon || null,
        color: data.color || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
    },
  });
}

export function useUpdateAccount() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AccountFormData & { is_default: boolean }> }) => {
      if (!user) throw new Error('Not authenticated');
      const payload: Record<string, unknown> = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.type !== undefined) payload.type = data.type;
      if (data.icon !== undefined) payload.icon = data.icon || null;
      if (data.color !== undefined) payload.color = data.color || null;
      if (data.is_default !== undefined) payload.is_default = data.is_default;

      if (data.is_default) {
        await supabase
          .from('accounts')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('is_default', true);
      }

      const { error } = await supabase
        .from('accounts')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
    },
  });
}

export function useDeleteAccount() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('accounts')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
    },
  });
}
