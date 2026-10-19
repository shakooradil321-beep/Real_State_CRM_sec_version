import { supabase, supabaseConfigError } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Type definitions local to the invitation feature.
// These mirror the agency_invitations table shape for what the UI needs.
// ---------------------------------------------------------------------------
export interface AgencyInvitation {
  id: string;
  agency_id: string;
  invited_by: string;
  invited_email: string;
  role: 'agent';
  token: string;
  status: 'pending' | 'accepted' | 'revoked';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface CreateInvitationPayload {
  email: string;
}

// ---------------------------------------------------------------------------
// Shared auth header helper — same pattern as closeDeal.ts.
// ---------------------------------------------------------------------------
async function getAuthHeader(): Promise<string> {
  if (!supabase || supabaseConfigError) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured');
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session?.access_token) throw new Error('You must be signed in.');

  return `Bearer ${session.access_token}`;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(body?.error ?? 'Request failed.');
  }
  return body as T;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/**
 * List all pending invitations for the current user's agency.
 * Only agency owners can call this successfully (enforced server-side).
 */
export async function listInvitations(): Promise<AgencyInvitation[]> {
  const auth = await getAuthHeader();
  const response = await fetch('/api/agency/invitations', {
    method: 'GET',
    headers: { Authorization: auth },
    credentials: 'include',
  });
  const body = await handleResponse<{ invitations: AgencyInvitation[] }>(response);
  return body.invitations;
}

/**
 * Create a new invitation for the given email address.
 * Returns the created invitation row including the token.
 * The owner copies the invite link manually and sends it to the agent.
 */
export async function createInvitation(
  payload: CreateInvitationPayload,
): Promise<AgencyInvitation> {
  const auth = await getAuthHeader();
  const response = await fetch('/api/agency/invitations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const body = await handleResponse<{ invitation: AgencyInvitation }>(response);
  return body.invitation;
}

/**
 * Revoke a pending invitation by id.
 * Only agency owners can revoke.
 */
export async function revokeInvitation(invitationId: string): Promise<void> {
  const auth = await getAuthHeader();
  const response = await fetch(`/api/agency/invitations/${invitationId}/revoke`, {
    method: 'POST',
    headers: { Authorization: auth },
    credentials: 'include',
  });
  await handleResponse<void>(response);
}

/**
 * Accept an invitation using the token from the invite link.
 * The accepting user must already be signed in to DealFlow.
 * The server validates that the signed-in user's email matches
 * the invited_email on the invitation row.
 */
export async function acceptInvitation(token: string): Promise<void> {
  const auth = await getAuthHeader();
  const response = await fetch(`/api/agency/invitations/${token}/accept`, {
    method: 'POST',
    headers: { Authorization: auth },
    credentials: 'include',
  });
  await handleResponse<void>(response);
}
