import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// This file handles two sub-routes on a single invitation identifier:
//
//   POST /api/agency/invitations/[tokenOrId]/accept
//   POST /api/agency/invitations/[tokenOrId]/revoke
//
// The [tokenOrId] segment doubles as:
//   - the invitation token  (for accept — agents receive this in the link)
//   - the invitation id     (for revoke — owners pass the row UUID from the list)
//
// Both operations use the service-role client so they can bypass RLS for the
// specific writes they need.
// ---------------------------------------------------------------------------

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const jsonError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

function createAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment.');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveActingUser(admin: ReturnType<typeof createAdminClient>, request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ---------------------------------------------------------------------------
// POST /api/agency/invitations/[tokenOrId]/accept
//
// Rules:
// - The agent must already have a DealFlow account and be signed in.
// - The acting user's email must match invited_email on the invitation row.
// - The invitation must be pending and not expired.
// - If valid: insert agency_membership row, mark invitation accepted.
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: { tokenOrId: string } },
) {
  const { tokenOrId } = params;
  const url = new URL(request.url);

  // Determine operation from the last path segment.
  const operation = url.pathname.split('/').pop(); // 'accept' or 'revoke'

  let admin;
  try { admin = createAdminClient(); }
  catch (e) { return jsonError(e instanceof Error ? e.message : 'Server error.', 500); }

  const user = await resolveActingUser(admin, request);
  if (!user) return jsonError('Unauthorized.', 401);

  if (operation === 'accept') {
    // Look up invitation by token.
    const { data: invitation, error: invError } = await admin
      .from('agency_invitations')
      .select('*')
      .eq('token', tokenOrId)
      .eq('status', 'pending')
      .maybeSingle();

    if (invError) return jsonError(invError.message, 500);
    if (!invitation) return jsonError('Invitation not found or already used.', 404);

    // Check expiry.
    if (new Date(invitation.expires_at) < new Date()) {
      return jsonError('This invitation has expired. Ask the owner to send a new one.', 410);
    }

    // Email match — the accepting user must match the invited email.
    if (user.email?.toLowerCase() !== invitation.invited_email.toLowerCase()) {
      return jsonError(
        'This invitation was sent to a different email address. Sign in with the correct account.',
        403,
      );
    }

    // Check they are not already a member.
    const { data: existing } = await admin
      .from('agency_memberships')
      .select('id')
      .eq('agency_id', invitation.agency_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return jsonError('You are already a member of this agency.', 409);
    }

    // Insert membership.
    const { error: membershipError } = await admin
      .from('agency_memberships')
      .insert({
        agency_id: invitation.agency_id,
        user_id:   user.id,
        role:      invitation.role,
      });

    if (membershipError) return jsonError(membershipError.message, 500);

    // Mark invitation accepted.
    await admin
      .from('agency_invitations')
      .update({
        status:      'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq('id', invitation.id);

    return NextResponse.json({ message: 'You have joined the agency.' });
  }

  if (operation === 'revoke') {
    // tokenOrId is the invitation UUID here (owner revokes from the list).
    // Confirm the acting user is the owner of the agency this invite belongs to.
    const { data: invitation, error: invError } = await admin
      .from('agency_invitations')
      .select('agency_id, status')
      .eq('id', tokenOrId)
      .maybeSingle();

    if (invError) return jsonError(invError.message, 500);
    if (!invitation) return jsonError('Invitation not found.', 404);
    if (invitation.status !== 'pending') return jsonError('This invitation is no longer pending.', 409);

    // Confirm owner.
    const { data: membership } = await admin
      .from('agency_memberships')
      .select('role')
      .eq('agency_id', invitation.agency_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership || membership.role !== 'owner') {
      return jsonError('Only agency owners can revoke invitations.', 403);
    }

    await admin
      .from('agency_invitations')
      .update({ status: 'revoked' })
      .eq('id', tokenOrId);

    return NextResponse.json({ message: 'Invitation revoked.' });
  }

  return jsonError('Unknown operation.', 400);
}