import { type SupabaseClient } from '@supabase/supabase-js';

import { supabase, supabaseConfigError } from '@/lib/supabase';
import { CONNECTION_LOST_MESSAGE, isNetworkErrorMessage } from '@/lib/utils';
import type { ActivityType, DealActivity } from '@/types';

export interface DealActivityLogInput {
  dealId: string;
  type: ActivityType;
  content?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface DealActivityInsertInput extends DealActivityLogInput {
  userId: string;
}

const normalizeContent = (content?: string | null) => {
  const trimmed = content?.trim();
  return trimmed ? trimmed : null;
};

const normalizeMeta = (meta?: Record<string, unknown> | null) => {
  return meta && Object.keys(meta).length > 0 ? meta : null;
};

export const mapActivityLoggerError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : 'Unable to log activity.';
  return isNetworkErrorMessage(message) ? CONNECTION_LOST_MESSAGE : message;
};

export async function insertDealActivity(
  client: SupabaseClient,
  params: DealActivityInsertInput,
): Promise<DealActivity> {
  const payload = {
    deal_id: params.dealId,
    user_id: params.userId,
    type: params.type,
    content: normalizeContent(params.content),
    meta: normalizeMeta(params.meta),
  };

  const { data, error } = await client
    .from('deal_activities')
    .insert(payload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(mapActivityLoggerError(error));
  }

  return data as DealActivity;
}

export async function logDealActivity(params: DealActivityLogInput): Promise<DealActivity> {
  if (!supabase || supabaseConfigError) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured');
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(mapActivityLoggerError(error));
  }

  if (!user) {
    throw new Error('You must be signed in to log activity.');
  }

  return insertDealActivity(supabase, {
    ...params,
    userId: user.id,
  });
}
