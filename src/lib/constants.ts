import type { AccountType } from '@/types';

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; icon: string; color: string }> = {
  cash:        { label: 'Cash',        icon: 'wallet',      color: '#22c55e' },
  bank:        { label: 'Bank',        icon: 'landmark',    color: '#3b82f6' },
  credit_card: { label: 'Credit Card', icon: 'credit-card', color: '#ef4444' },
  wallet:      { label: 'Digital Wallet', icon: 'smartphone', color: '#8b5cf6' },
  investment:  { label: 'Investment',  icon: 'trending-up', color: '#14b8a6' },
  loan:        { label: 'Loan',        icon: 'hand-coins',  color: '#f97316' },
  other:       { label: 'Other',       icon: 'piggy-bank',  color: '#64748b' },
};

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
