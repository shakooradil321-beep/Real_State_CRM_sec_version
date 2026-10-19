import { useAgencyContext } from '@/hooks/useAgencyContext';

export interface AgencyPermissions {
  isAgencyOwner: boolean;
  isAgencyAgent: boolean;
  canManageAgency: boolean;
  canManageMembers: boolean;
  canManageSettings: boolean;
}

export function useAgencyPermissions(): AgencyPermissions {
  const { role } = useAgencyContext();

  const isAgencyOwner = role === 'owner';
  const isAgencyAgent = role === 'agent';

  return {
    isAgencyOwner,
    isAgencyAgent,
    canManageAgency: isAgencyOwner,
    canManageMembers: isAgencyOwner,
    canManageSettings: isAgencyOwner,
  };
}
