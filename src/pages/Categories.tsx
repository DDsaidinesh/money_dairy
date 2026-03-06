import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useCategories, useAddCategory, useDeleteCategory } from '@/hooks/use-categories';
import PageHeader from '@/components/shared/PageHeader';
import type { CategoryType } from '@/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Select a type'),
  color: z.string().optional(),
});

const PRESET_COLORS = [
  '#e5e5e5', '#a3a3a3', '#737373', '#525252', '#404040',
  '#d4d4d4', '#8b8b8b', '#666666', '#b3b3b3', '#595959',
];

export default function Categories() {
  const { data: categories = [], isLoading } = useCategories();
  const addMutation = useAddCategory();
  const deleteMutation = useDeleteCategory();
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('expense');

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', type: 'expense', color: '#3b82f6' },
  });

  const handleAdd = async (values: z.infer<typeof schema>) => {
    try {
      await addMutation.mutateAsync({
        name: values.name,
        type: values.type as CategoryType,
        color: values.color,
      });
      toast.success('Category created');
      form.reset();
      setShowAdd(false);
    } catch {
      toast.error('Failed to create category');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Category deleted');
    } catch {
      toast.error('Failed to delete category');
    }
  };

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const renderList = (list: typeof categories) => (
    <Card>
      <CardContent className="p-0 divide-y divide-border/50">
        {list.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: cat.color || '#64748b' }}
            />
            <span className="flex-1 text-sm font-medium">{cat.name}</span>
            {cat.is_default ? (
              <span className="text-xs text-muted-foreground">Default</span>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete &quot;{cat.name}&quot;?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Transactions using this category will keep their data but show as uncategorized.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(cat.id)} className="bg-destructive text-destructive-foreground">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No categories</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Manage your income and expense categories"
        action={
          <Button size="sm" onClick={() => { form.setValue('type', activeTab); setShowAdd(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="expense">Expense ({expenseCategories.length})</TabsTrigger>
          <TabsTrigger value="income">Income ({incomeCategories.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="expense" className="mt-4">
          {renderList(expenseCategories)}
        </TabsContent>
        <TabsContent value="income" className="mt-4">
          {renderList(incomeCategories)}
        </TabsContent>
      </Tabs>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input placeholder="e.g. Petrol" className="mt-1" {...form.register('name')} />
              {form.formState.errors.name && <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.watch('type')} onValueChange={(v) => form.setValue('type', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Color</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => form.setValue('color', c)}
                    className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: form.watch('color') === c ? 'currentColor' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Category
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
