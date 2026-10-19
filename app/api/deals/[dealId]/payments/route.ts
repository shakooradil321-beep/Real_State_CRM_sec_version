import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { insertDealActivity } from 'src/lib/activityLogger';

// ---------------------------------------------------------------------------
// Admin client — same pattern as close route.
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

async function resolveActingUser(
  admin: ReturnType<typeof createAdminClient>,
  request: Request,
) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ---------------------------------------------------------------------------
// Shared access check — same middleware contract as api-manifest.md.
// Returns the deal row if the actor is authorized, null otherwise.
// Also returns the actor's membership role so callers can check owner-only
// operations.
// ---------------------------------------------------------------------------
async function resolveAuthorizedDeal(
  admin: ReturnType<typeof createAdminClient>,
  dealId: string,
  actorId: string,
) {
  const { data: deal, error: dealError } = await admin
    .from('deals')
    .select('*')
    .eq('id', dealId)
    .maybeSingle();

  if (dealError) return { deal: null, role: null, error: dealError.message };
  if (!deal) return { deal: null, role: null, error: 'Deal not found.' };

  if (deal.agency_id === null) {
    if (deal.user_id !== actorId) return { deal: null, role: null, error: 'Forbidden.' };
    return { deal, role: 'owner' as const, error: null };
  }

  const { data: membership } = await admin
    .from('agency_memberships')
    .select('role')
    .eq('agency_id', deal.agency_id)
    .eq('user_id', actorId)
    .maybeSingle();

  if (!membership) return { deal: null, role: null, error: 'Forbidden.' };
  if (membership.role !== 'owner' && deal.user_id !== actorId) {
    return { deal: null, role: null, error: 'Forbidden.' };
  }

  return { deal, role: membership.role as 'owner' | 'agent', error: null };
}

// ---------------------------------------------------------------------------
// GET /api/deals/[dealId]/payments
// Returns all payments for the deal, newest first.
// Accessible to the deal's owner-user and the agency owner.
// ---------------------------------------------------------------------------
export async function GET(
  request: Request,
  { params }: { params: { dealId: string } },
) {
  let admin;
  try { admin = createAdminClient(); }
  catch (e) { return jsonError(e instanceof Error ? e.message : 'Server error.', 500); }

  const user = await resolveActingUser(admin, request);
  if (!user) return jsonError('Unauthorized.', 401);

  const { deal, error } = await resolveAuthorizedDeal(admin, params.dealId, user.id);
  if (!deal) return jsonError(error ?? 'Forbidden.', error === 'Deal not found.' ? 404 : 403);

  const { data: payments, error: paymentsError } = await admin
    .from('deal_payments')
    .select('*')
    .eq('deal_id', deal.id)
    .order('received_on', { ascending: false });

  if (paymentsError) return jsonError(paymentsError.message, 500);

  return NextResponse.json({ payments: payments ?? [] });
}

// ---------------------------------------------------------------------------
// POST /api/deals/[dealId]/payments
// Records a new token money or bayana payment.
//
// Body: {
//   payment_kind: 'token_money' | 'bayana',
//   amount: number,
//   received_on: 'YYYY-MM-DD',
//   notes?: string,
//   mark_commission_as_earned: boolean
// }
//
// Rules (from api-manifest.md):
// - mark_commission_as_earned must be explicit — never assumed.
// - When true: deal must have a deal_commissions row, earned_trigger must be
//   'on_payment', status must still be 'pending'.
// - Commission update: status = 'earned', earned_at = now(),
//   trigger_payment_id = new payment id.
// - Activity row logged via meta for the payment event.
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: { dealId: string } },
) {
  let admin;
  try { admin = createAdminClient(); }
  catch (e) { return jsonError(e instanceof Error ? e.message : 'Server error.', 500); }

  const user = await resolveActingUser(admin, request);
  if (!user) return jsonError('Unauthorized.', 401);

  const { deal, error: accessError } = await resolveAuthorizedDeal(
    admin,
    params.dealId,
    user.id,
  );
  if (!deal) return jsonError(accessError ?? 'Forbidden.', accessError === 'Deal not found.' ? 404 : 403);

  // Parse and validate body.
  const body = await request.json().catch(() => null);

  const paymentKind = body?.payment_kind;
  if (paymentKind !== 'token_money' && paymentKind !== 'bayana') {
    return jsonError('payment_kind must be "token_money" or "bayana".', 422);
  }

  const amount = Number(body?.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return jsonError('amount must be a positive integer (PKR, no decimals).', 422);
  }

  const receivedOn = body?.received_on;
  if (typeof receivedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(receivedOn)) {
    return jsonError('received_on must be a date string in YYYY-MM-DD format.', 422);
  }

  const notes =
    typeof body?.notes === 'string' && body.notes.trim()
      ? body.notes.trim()
      : null;

  const markEarned = body?.mark_commission_as_earned;
  if (typeof markEarned !== 'boolean') {
    return jsonError('mark_commission_as_earned is required and must be a boolean.', 422);
  }

  // If caller wants to mark commission earned, validate preconditions first
  // before inserting the payment row.
  let commissionRow: Record<string, unknown> | null = null;

  if (markEarned) {
    if (!deal.agency_id) {
      return jsonError('Solo deals do not have commission rows.', 422);
    }

    const { data: commission, error: commissionError } = await admin
      .from('deal_commissions')
      .select('*')
      .eq('deal_id', deal.id)
      .maybeSingle();

    if (commissionError) return jsonError(commissionError.message, 500);

    if (!commission) {
      return jsonError(
        'No commission row exists for this deal. Close the deal first to calculate commission.',
        422,
      );
    }

    if (commission.earned_trigger !== 'on_payment') {
      return jsonError(
        'Commission earned trigger is not "on_payment". Cannot mark via payment.',
        422,
      );
    }

    if (commission.status !== 'pending') {
      return jsonError('Commission is already earned.', 409);
    }

    commissionRow = commission;
  }

  // Insert payment row.
  const { data: payment, error: paymentError } = await admin
    .from('deal_payments')
    .insert({
      deal_id: deal.id,
      agency_id: deal.agency_id ?? null,
      recorded_by_user_id: user.id,
      payment_kind: paymentKind,
      amount,
      received_on: receivedOn,
      notes,
    })
    .select()
    .single();

  if (paymentError || !payment) {
    return jsonError(paymentError?.message ?? 'Failed to record payment.', 500);
  }

  // Mark commission earned if requested.
  let updatedCommission: Record<string, unknown> | null = null;

  if (markEarned && commissionRow) {
    const { data: earned, error: earnError } = await admin
      .from('deal_commissions')
      .update({
        status: 'earned',
        earned_at: new Date().toISOString(),
        trigger_payment_id: payment.id,
      })
      .eq('id', commissionRow.id)
      .select()
      .single();

    if (earnError) {
      // Payment already committed — log the error but don't fail the response.
      // The owner can manually reconcile.
      console.error('Failed to mark commission as earned.', earnError);
    } else {
      updatedCommission = earned;
    }
  }

  // Log activity — using meta to carry payment info until a dedicated
  // activity type is added (see logic-engine.md note on payment events).
  try {
    await insertDealActivity(admin, {
      dealId: deal.id,
      userId: user.id,
      type: 'note',
      content: `Payment recorded: ${paymentKind === 'token_money' ? 'Token Money' : 'Bayana'} — PKR ${amount.toLocaleString()}`,
      meta: {
        payment_id: payment.id,
        payment_kind: paymentKind,
        amount,
        received_on: receivedOn,
        commission_marked_earned: markEarned,
      },
    });
  } catch (activityError) {
    console.error('Failed to log payment activity.', activityError);
  }

  return NextResponse.json(
    { payment, commission: updatedCommission },
    { status: 201 },
  );
}