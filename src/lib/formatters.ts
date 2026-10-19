import {
  differenceInCalendarDays,
  format,
  isToday as dateFnsIsToday,
  isTomorrow,
  isYesterday,
  parseISO,
  startOfDay,
} from 'date-fns';

const numberFormatter = new Intl.NumberFormat('en-PK');

const trimDecimal = (value: number): string => value.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');

export const normalizePakistaniPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('92') && digits.length >= 12) {
    return `0${digits.slice(2, 12)}`;
  }

  if (digits.startsWith('03') && digits.length >= 11) {
    return digits.slice(0, 11);
  }

  if (digits.startsWith('3') && digits.length >= 10) {
    return `0${digits.slice(0, 10)}`;
  }

  return digits.slice(0, 11);
};

export const formatBudget = (pkr: number): string => {
  if (pkr >= 10000000) {
    return `${trimDecimal(pkr / 10000000)} Cr`;
  }

  if (pkr >= 100000) {
    return `${trimDecimal(pkr / 100000)} Lakh`;
  }

  return `Rs. ${numberFormatter.format(pkr)}`;
};

export const formatBudgetLong = (pkr: number): string => formatBudget(pkr).replace('Cr', 'Crore');

export const formatPhone = (phone: string): string => {
  const normalized = normalizePakistaniPhone(phone);

  if (normalized.length === 11) {
    return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
  }

  return phone;
};

export const getWhatsAppUrl = (phone: string): string => {
  const normalized = normalizePakistaniPhone(phone);
  const digits = normalized.startsWith('0') ? normalized.slice(1) : normalized;
  return `https://wa.me/92${digits}`;
};

export const getDaysUntil = (dateStr: string | null): number => {
  if (!dateStr) {
    return 0;
  }

  return differenceInCalendarDays(parseISO(dateStr), startOfDay(new Date()));
};

export const isOverdue = (dateStr: string | null): boolean => {
  if (!dateStr) {
    return false;
  }

  return getDaysUntil(dateStr) < 0;
};

export const isToday = (dateStr: string | null): boolean => {
  if (!dateStr) {
    return false;
  }

  return dateFnsIsToday(parseISO(dateStr));
};

export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) {
    return '-';
  }

  const date = parseISO(dateStr);
  const daysUntil = getDaysUntil(dateStr);

  if (dateFnsIsToday(date)) {
    return 'Today';
  }

  if (isTomorrow(date)) {
    return 'Tomorrow';
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  if (daysUntil < 0 && Math.abs(daysUntil) <= 7) {
    return `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} ago`;
  }

  if (daysUntil > 0 && daysUntil <= 7) {
    return `In ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
  }

  return format(date, 'MMMM d, yyyy');
};
