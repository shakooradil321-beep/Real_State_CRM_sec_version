import { supabase, supabaseConfigError } from '@/lib/supabase';
import type { Agency } from '@/types';

export interface CreateAgencyPayload {
  name: string;
  owner_user_id: string;
}

interface CreateAgencyResponse {
  agency: Agency;
}

export async function createAgency(payload: CreateAgencyPayload): Promise<Agency> {
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
    throw new Error('You must be signed in to create an agency.');
  }

  const response = await fetch('/api/agencies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as
    | { error?: string; agency?: Agency }
    | null;

  if (!response.ok) {
    throw new Error(body?.error ?? 'Unable to create agency.');
  }

  return (body as CreateAgencyResponse).agency;
}
