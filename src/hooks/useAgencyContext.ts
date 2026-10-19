import { useAgencyStore } from '@/store/agencyStore';
import type { Agency, AgencyMembership, AgencyRole, AgencySettings } from '@/types';

export interface AgencyContext {
  agency: Agency | null;
  membership: AgencyMembership | null;
  settings: AgencySettings | null;
  role: AgencyRole | null;
  isSoloUser: boolean;
  loading: boolean;
}

export function useAgencyContext(): AgencyContext {
  const agency = useAgencyStore((s) => s.agency);
  const membership = useAgencyStore((s) => s.membership);
  const settings = useAgencyStore((s) => s.settings);
  const loading = useAgencyStore((s) => s.loading);

  const role = membership?.role ?? null;
  const isSoloUser = !membership;

  return { agency, membership, settings, role, isSoloUser, loading };
}
