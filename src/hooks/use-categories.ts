import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Category, CategoryFormData, CategoryType } from '@/types';

const CATEGORIES_KEY = 'categories';

export function useCategories(type?: CategoryType) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [CATEGORIES_KEY, user?.id, type],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from('categories')
        .select('*')
        .or(`is_default.eq.true,user_id.eq.${user.id}`)
        .order('is_default', { ascending: false })
        .order('name');

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    enabled: !!user,
  });
}

export function useAddCategory() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CategoryFormData) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('categories').insert({
        user_id: user.id,
        name: data.name,
        type: data.type,
        icon: data.icon || null,
        color: data.color || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
    },
  });
}

export function useUpdateCategory() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CategoryFormData> }) => {
      if (!user) throw new Error('Not authenticated');
      const payload: Record<string, unknown> = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.type !== undefined) payload.type = data.type;
      if (data.icon !== undefined) payload.icon = data.icon || null;
      if (data.color !== undefined) payload.color = data.color || null;

      const { error } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
    },
  });
}

export function useDeleteCategory() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
    },
  });
}
