import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { insertDealActivity } from '../../../../../src/lib/activityLogger';
import type { Deal, Property } from '../../../../../src/types';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  process.env.SUPABASE_URL;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const jsonError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

const createAdminClient = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment. Configure SUPABASE_SERVICE_ROLE_KEY and the Supabase URL.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

interface CloseDealRpcPayload {
  deal: Deal;
  property: Property | null;
  commission: Record<string, unknown> | null;
}

export async function POST(
  request: Request,
  { params }: { params: { dealId: string } },
) {
  let admin;

  try {
    admin = createAdminClient();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to initialize Supabase.', 500);
  }

  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return jsonError('Missing authorization token.', 401);
  }

  const accessToken = authHeader.slice('Bearer '.length).trim();
  const {
    data: { user: actingUser },
    error: authError,
  } = await admin.auth.getUser(accessToken);

  if (authError || !actingUser) {
    return jsonError('Unauthorized.', 401);
  }

  const body = await request.json().catch(() => null);
  const closingAmount = Number(body?.closing_amount);
  const closingDisposition = body?.closing_disposition ?? null;
  const closeNotes = typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
  const dealId = params?.dealId;

  if (!dealId) {
    return jsonError('Missing deal id.', 400);
  }

  if (!Number.isInteger(closingAmount) || closingAmount <= 0) {
    return jsonError('closing_amount must be a positive integer.', 400);
  }

  if (closingDisposition !== null && closingDisposition !== 'sold' && closingDisposition !== 'rented') {
    return jsonError('closing_disposition must be "sold", "rented", or null.', 400);
  }

  const { data: deal, error: dealError } = await admin
    .from('deals')
    .select('*')
    .eq('id', dealId)
    .maybeSingle();

  if (dealError) {
    return jsonError(dealError.message, 500);
  }

  if (!deal) {
    return jsonError('Deal not found.', 404);
  }

  if (deal.stage === 'closed') {
    return jsonError('This deal is already closed.', 409);
  }

  if (deal.agency_id === null) {
    if (deal.user_id !== actingUser.id) {
      return jsonError('You do not have access to close this deal.', 403);
    }
  } else {
    const { data: membership, error: membershipError } = await admin
      .from('agency_memberships')
      .select('role')
      .eq('agency_id', deal.agency_id)
      .eq('user_id', actingUser.id)
      .maybeSingle();

    if (membershipError) {
      return jsonError(membershipError.message, 500);
    }

    if (!membership) {
      return jsonError('You do not have access to close this deal.', 403);
    }

    if (membership.role !== 'owner' && deal.user_id !== actingUser.id) {
      return jsonError('You do not have access to close this deal.', 403);
    }
  }

  if (deal.property_id && !closingDisposition) {
    return jsonError('closing_disposition is required when the deal has a linked property.', 400);
  }

  if (!deal.property_id && closingDisposition !== null) {
    return jsonError('closing_disposition must be omitted when no property is linked.', 400);
  }

  if (deal.property_id) {
    const { data: conflicts, error: conflictError } = await admin
      .from('deals')
      .select('id')
      .eq('property_id', deal.property_id)
      .eq('stage', 'closed')
      .neq('id', deal.id)
      .limit(1);

    if (conflictError) {
      return jsonError(conflictError.message, 500);
    }

    if (conflicts && conflicts.length > 0) {
      return jsonError('The linked property is already tied to another closed deal.', 409);
    }
  }

  const { data: workflowResult, error: workflowError } = await admin.rpc(
    'close_deal_and_sync_financials',
    {
      p_deal_id: deal.id,
      p_acting_user_id: actingUser.id,
      p_closing_amount: closingAmount,
      p_closing_disposition: closingDisposition,
      p_close_notes: closeNotes,
    },
  );

  if (workflowError || !workflowResult) {
    const message = workflowError?.message ?? 'Unable to close deal.';
    const status =
      message.includes('already closed') || message.includes('incomplete') || message.includes('missing') || message.includes('already tied')
        ? 409
        : message.includes('required') || message.includes('must be')
          ? 400
          : 500;
    return jsonError(message, status);
  }

  const { deal: updatedDeal, property, commission } = workflowResult as CloseDealRpcPayload;

  try {
    await insertDealActivity(admin, {
      dealId: updatedDeal.id,
      userId: actingUser.id,
      type: 'stage_changed',
      content: 'Deal closed.',
      meta: {
        from_stage: deal.stage,
        to_stage: 'closed',
        closing_amount: updatedDeal.closing_amount,
        closing_disposition: updatedDeal.closing_disposition,
      },
    });
  } catch (activityError) {
    console.error('Failed to log close activity.', activityError);
  }

  return NextResponse.json({
    deal: updatedDeal,
    property,
    commission,
  });
}
