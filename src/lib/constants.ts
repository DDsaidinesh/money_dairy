import type { AccountType } from '@/types';

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; icon: string; color: string; isDebt: boolean }> = {
  cash:        { label: 'Cash',           icon: 'wallet',      color: '#22c55e', isDebt: false },
  bank:        { label: 'Bank',           icon: 'landmark',    color: '#3b82f6', isDebt: false },
  credit_card: { label: 'Credit Card',    icon: 'credit-card', color: '#ef4444', isDebt: true },
  wallet:      { label: 'Digital Wallet', icon: 'smartphone',  color: '#8b5cf6', isDebt: false },
  investment:  { label: 'Investment',     icon: 'trending-up', color: '#14b8a6', isDebt: false },
  loan:        { label: 'Loan',           icon: 'hand-coins',  color: '#f97316', isDebt: true },
  other:       { label: 'Other',          icon: 'piggy-bank',  color: '#64748b', isDebt: false },
};

export function isDebtAccount(type: AccountType): boolean {
  return ACCOUNT_TYPE_META[type]?.isDebt ?? false;
}

export const CURRENCY_SYMBOL: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export const DEFAULT_CURRENCY = 'INR';

export const NAV_ITEMS = [
  { to: '/dashboard',    label: 'Dashboard',    icon: 'layout-dashboard' },
  { to: '/transactions', label: 'Transactions', icon: 'receipt' },
  { to: '/analytics',    label: 'Analytics',    icon: 'bar-chart-3' },
  { to: '/accounts',     label: 'Accounts',     icon: 'wallet' },
  { to: '/settings',     label: 'Settings',     icon: 'settings' },
] as const;
