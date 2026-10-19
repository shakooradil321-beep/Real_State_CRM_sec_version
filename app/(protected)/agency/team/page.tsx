'use client';

import { useEffect } from 'react';

import { AgencyGuard } from '@/components/agency/AgencyGuard';
import { AgencySummaryCards } from '@/components/agency/AgencySummaryCards';
import { TeamMembersList } from '@/components/agency/TeamMembersList';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useAgencyStore } from '@/store/agencyStore';

export default function AgencyTeamPage() {
  const { agency } = useAgencyContext();
  const members             = useAgencyStore((s) => s.members);
  const membership          = useAgencyStore((s) => s.membership);
  const fetchAgencyMembers  = useAgencyStore((s) => s.fetchAgencyMembers);

  const isOwner = membership?.role === 'owner';

  useEffect(() => {
    void fetchAgencyMembers();
  }, [fetchAgencyMembers]);

  return (
    <AgencyGuard mode="ownerOnly">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          {agency ? (
            <p className="mt-0.5 text-sm text-slate-500">{agency.name}</p>
          ) : null}
        </div>

        <AgencySummaryCards members={members} />

        <div className="space-y-3">
          <TeamMembersList members={members} isOwner={isOwner} />
        </div>
      </div>
    </AgencyGuard>
  );
}