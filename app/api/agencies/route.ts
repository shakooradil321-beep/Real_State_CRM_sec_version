import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { canCreateAgency } from '../../../src/lib/admin';
import { createAgencySchema } from '../../../src/lib/agencyValidators';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  process.env.SUPABASE_URL;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const jsonError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

const createAdminClient = () => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase server environment. Configure SUPABASE_SERVICE_ROLE_KEY and the Supabase URL.',
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export async function POST(request: Request) {
  let admin;

  try {
    admin = createAdminClient();
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unable to initialize Supabase.',
      500,
    );
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

  if (authError || !actingUser?.email || !canCreateAgency(actingUser.email)) {
    return jsonError('Only the admin account can create agencies.', 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = createAgencySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? 'Invalid agency payload.',
      400,
    );
  }

  const { name, owner_user_id } = parsed.data;

  const {
    data: { user: ownerUser },
    error: ownerError,
  } = await admin.auth.admin.getUserById(owner_user_id);

  if (ownerError || !ownerUser) {
    return jsonError('Owner user not found.', 404);
  }

  const { data: existingMemberships, error: membershipError } = await admin
    .from('agency_memberships')
    .select('agency_id')
    .eq('user_id', owner_user_id)
    .limit(1);

  if (membershipError) {
    return jsonError(membershipError.message, 500);
  }

  if (existingMemberships && existingMemberships.length > 0) {
    return jsonError('This user already belongs to an agency.', 409);
  }

  const { data: agency, error: agencyError } = await admin
    .from('agencies')
    .insert({ name: name.trim(), owner_user_id })
    .select()
    .single();

  if (agencyError || !agency) {
    return jsonError(
      agencyError?.message ?? 'Unable to create agency.',
      500,
    );
  }

  return NextResponse.json({ agency });
}
