import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { CURRENCY_SYMBOL, DEFAULT_CURRENCY } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = DEFAULT_CURRENCY): string {
  const symbol = CURRENCY_SYMBOL[currency] || '₹';
  const absAmount = Math.abs(amount);

  return `${amount < 0 ? '-' : ''}${symbol}${absAmount.toLocaleString('en-IN', {
    minimumFractionDigits: absAmount % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'dd MMM yyyy');
}

export function formatDateGroupKey(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, dd MMM yyyy');
}

export function groupByDate<T extends { date: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.date;
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }
  return groups;
}

export function toDateInputValue(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}
