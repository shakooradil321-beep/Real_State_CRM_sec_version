import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { Deal, Property, PropertyDisposition } from '@/types';

export interface CloseDealPayload {
  closing_amount: number;
  closing_disposition?: PropertyDisposition | null;
  notes?: string | null;
}

export interface CloseDealResponse {
  deal: Deal;
  property: Property | null;
  commission: Record<string, unknown> | null;
}

export async function closeDeal(dealId: string, payload: CloseDealPayload): Promise<CloseDealResponse> {
  if (!supabase || supabaseConfigError) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured');
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.access_token) {
    throw new Error('You must be signed in to close a deal.');
  }

  const response = await fetch(`/api/deals/${dealId}/close`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(body?.error ?? 'Unable to close deal.');
  }

  return body as CloseDealResponse;
}
