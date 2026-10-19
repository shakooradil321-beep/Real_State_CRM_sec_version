'use client';

import { useEffect, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

import { MissingConfigScreen } from '@/components/app/MissingConfigScreen';
import { supabaseConfigError } from '@/lib/supabase';
import { useAgencyStore } from '@/store/agencyStore';
import { useAuthStore } from '@/store/authStore';
import { useDealsStore } from '@/store/dealsStore';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  const initialize = useAuthStore((state) => state.initialize);
  const user = useAuthStore((state) => state.user);
  const agencyInitialized = useAgencyStore((state) => state.initialized);
  const agencyLoading = useAgencyStore((state) => state.loading);
  const membership = useAgencyStore((state) => state.membership);
  const fetchDeals = useDealsStore((state) => state.fetchDeals);
  const subscribeToDeals = useDealsStore((state) => state.subscribeToDeals);
  const unsubscribeFromDeals = useDealsStore((state) => state.unsubscribeFromDeals);
  const resetDeals = useDealsStore((state) => state.reset);
  const fetchAgencyContext = useAgencyStore((state) => state.fetchAgencyContext);
  const resetAgency = useAgencyStore((state) => state.reset);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      void fetchAgencyContext();
      return;
    }

    unsubscribeFromDeals();
    resetDeals();
    resetAgency();
  }, [fetchAgencyContext, resetAgency, resetDeals, unsubscribeFromDeals, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!agencyInitialized || agencyLoading) {
      unsubscribeFromDeals();
      return;
    }

    void fetchDeals().catch(() => undefined);
    subscribeToDeals();

    return () => {
      unsubscribeFromDeals();
    };
  }, [
    agencyInitialized,
    agencyLoading,
    fetchDeals,
    membership?.agency_id,
    membership?.role,
    subscribeToDeals,
    unsubscribeFromDeals,
    user,
  ]);

  if (supabaseConfigError) {
    return <MissingConfigScreen message={supabaseConfigError} />;
  }

  return (
    <>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            padding: '12px 14px',
          },
        }}
      />
    </>
  );
};
