import { supabase } from '@/lib/supabase';
import type { Agency, AgencyMembership, AgencySettings, AgencySettingsUpdate } from '@/types';

function client() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function getCurrentMembership(userId: string): Promise<AgencyMembership | null> {
  const { data, error } = await client()
    .from('agency_memberships')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as AgencyMembership | null;
}

export async function getAgencyById(agencyId: string): Promise<Agency | null> {
  const { data, error } = await client()
    .from('agencies')
    .select('*')
    .eq('id', agencyId)
    .maybeSingle();

  if (error) throw error;
  return data as Agency | null;
}

export async function getAgencySettings(agencyId: string): Promise<AgencySettings | null> {
  const { data, error } = await client()
    .from('agency_settings')
    .select('*')
    .eq('agency_id', agencyId)
    .maybeSingle();

  if (error) throw error;
  return data as AgencySettings | null;
}

export async function getAgencyMembers(agencyId: string): Promise<AgencyMembership[]> {
  const { data, error } = await client()
    .from('agency_memberships')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AgencyMembership[];
}

export async function updateAgencySettings(
  agencyId: string,
  payload: AgencySettingsUpdate,
): Promise<AgencySettings> {
  const { data, error } = await client()
    .from('agency_settings')
    .update(payload)
    .eq('agency_id', agencyId)
    .select()
    .single();

  if (error || !data) throw error ?? new Error('Failed to update agency settings.');
  return data as AgencySettings;
}
