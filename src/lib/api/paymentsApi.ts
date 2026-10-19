import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { DealPayment } from '@/types';

export interface RecordPaymentPayload {
  payment_kind: 'token_money' | 'bayana';
  amount: number;
  received_on: string; // YYYY-MM-DD
  notes?: string | null;
  // Explicit per api-manifest.md — the caller must state intent.
  // When true the commission row for this deal is marked earned and
  // trigger_payment_id is set to the created payment id.
  // Only valid when commission_earned_trigger = 'on_payment'.
  mark_commission_as_earned: boolean;
}

export interface RecordPaymentResponse {
  payment: DealPayment;
  commission: Record<string, unknown> | null;
}

async function getAuthHeader(): Promise<string> {
  if (!supabase || supabaseConfigError) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured');
  }
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.access_token) throw new Error('You must be signed in.');
  return `Bearer ${session.access_token}`;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(body?.error ?? 'Request failed.');
  return body as T;
}

/**
 * List all payments for a deal.
 * Accessible to the deal owner (agent) and agency owner.
 */
export async function listPayments(dealId: string): Promise<DealPayment[]> {
  const auth = await getAuthHeader();
  const response = await fetch(`/api/deals/${dealId}/payments`, {
    method: 'GET',
    headers: { Authorization: auth },
    credentials: 'include',
  });
  const body = await handleResponse<{ payments: DealPayment[] }>(response);
  return body.payments;
}

/**
 * Record a new token money or bayana payment against a deal.
 * mark_commission_as_earned must be explicitly set per api-manifest.md.
 */
export async function recordPayment(
  dealId: string,
  payload: RecordPaymentPayload,
): Promise<RecordPaymentResponse> {
  const auth = await getAuthHeader();
  const response = await fetch(`/api/deals/${dealId}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return handleResponse<RecordPaymentResponse>(response);
}