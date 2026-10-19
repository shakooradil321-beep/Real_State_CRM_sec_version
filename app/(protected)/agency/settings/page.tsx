'use client';

import { useEffect } from 'react';

import { AgencyGuard } from '@/components/agency/AgencyGuard';
import { AgencySettingsForm } from '@/components/agency/AgencySettingsForm';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useAgencyStore } from '@/store/agencyStore';

export default function AgencySettingsPage() {
  const { agency, settings } = useAgencyContext();
  const fetchAgencySettings = useAgencyStore((s) => s.fetchAgencySettings);

  useEffect(() => {
    void fetchAgencySettings();
  }, [fetchAgencySettings]);

  return (
    <AgencyGuard mode="ownerOnly">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agency Settings</h1>
          {agency ? (
            <p className="mt-0.5 text-sm text-slate-500">{agency.name}</p>
          ) : null}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Commission Settings</h2>
          {settings ? (
            <AgencySettingsForm settings={settings} />
          ) : (
            <div className="flex items-center justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
            </div>
          )}
        </div>
      </div>
    </AgencyGuard>
  );
}
