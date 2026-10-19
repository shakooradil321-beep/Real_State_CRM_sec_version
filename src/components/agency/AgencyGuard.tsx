'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/store/authStore';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useAgencyPermissions } from '@/hooks/useAgencyPermissions';
import { FullScreenSpinner } from '@/components/app/FullScreenSpinner';

interface AgencyGuardProps {
  children: React.ReactNode;
  mode: 'soloOnly' | 'ownerOnly' | 'agencyMemberOnly';
}

export const AgencyGuard = ({ children, mode }: AgencyGuardProps) => {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const { isSoloUser, loading: agencyLoading } = useAgencyContext();
  const { isAgencyOwner } = useAgencyPermissions();

  const redirectTo =
    authLoading || agencyLoading
      ? null
      : !user
        ? '/login'
        : mode === 'soloOnly' && !isSoloUser
          ? '/agency/team'
          : mode === 'ownerOnly' && !isAgencyOwner
            ? '/pipeline'
            : mode === 'agencyMemberOnly' && isSoloUser
              ? '/pipeline'
              : null;

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  if (authLoading || agencyLoading) {
    return <FullScreenSpinner />;
  }

  if (redirectTo) {
    return <FullScreenSpinner />;
  }

  return <>{children}</>;
};
