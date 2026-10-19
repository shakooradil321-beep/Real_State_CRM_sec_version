import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { getWhatsAppUrl, normalizePakistaniPhone } from '@/lib/formatters';
import type { Deal } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getInitials = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

const avatarPalette = [
  'bg-emerald-100 text-emerald-800',
  'bg-blue-100 text-blue-800',
  'bg-orange-100 text-orange-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-cyan-100 text-cyan-800',
];

export const getAvatarColorClass = (seed: string): string => {
  const hash = seed.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return avatarPalette[hash % avatarPalette.length];
};

export const toDialablePhone = (phone: string): string => normalizePakistaniPhone(phone);

export const buildDealWhatsAppUrl = (deal: Pick<Deal, 'phone' | 'client_name' | 'property_type' | 'area'>): string => {
  const baseUrl = getWhatsAppUrl(deal.phone);
  const message = `Hi ${deal.client_name}, following up regarding the ${deal.property_type} in ${deal.area}.`;
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
};

export const formatAuthError = (message: string): string => {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid api key') || normalized.includes('invalid key')) {
    return 'Supabase rejected the API key. Check `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`, then restart the dev server.';
  }

  if (normalized.includes('invalid login credentials')) {
    return 'Invalid email or password';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email before signing in';
  }

  if (normalized.includes('user already registered')) {
    return 'This email is already registered. Try signing in instead.';
  }

  return message;
};

export const isNetworkErrorMessage = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('timeout') ||
    normalized.includes('connection') ||
    normalized.includes('offline')
  );
};

export const CONNECTION_LOST_MESSAGE = 'Connection lost. Trying to reconnect...';
