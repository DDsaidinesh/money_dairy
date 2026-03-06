export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccountType = 'cash' | 'bank' | 'credit_card' | 'wallet' | 'investment' | 'loan' | 'other';
export type CategoryType = 'income' | 'expense';

export interface Profile {
  id: string;
  name: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  balance: number;
  initial_balance: number;
  currency: string;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  category_id: string | null;
  account_id: string;
  to_account_id: string | null;
  date: string;
  created_at: string;
  updated_at: string;
  category?: Pick<Category, 'name' | 'icon' | 'color'> | null;
  account?: Pick<Account, 'name' | 'color'> | null;
  to_account?: Pick<Account, 'name' | 'color'> | null;
}

export interface TransactionFormData {
  type: TransactionType;
  amount: number;
  description?: string;
  category_id?: string;
  account_id: string;
  to_account_id?: string;
  date: string;
}

export interface AccountFormData {
  name: string;
  type: AccountType;
  initial_balance: number;
  icon?: string;
  color?: string;
}

export interface CategoryFormData {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  category_id?: string;
  account_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}
