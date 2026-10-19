'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { FullScreenSpinner } from '@/components/app/FullScreenSpinner';
import { AgencyCreateForm } from '@/components/agency/AgencyCreateForm';
import { canCreateAgency } from '@/lib/admin';
import { useAuthStore } from '@/store/authStore';

export default function AgencyCreatePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAdmin = canCreateAgency(user?.email);

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace('/pipeline');
    }
  }, [isAdmin, router, user]);

  if (user && !isAdmin) {
    return <FullScreenSpinner />;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Create Agency</h1>
        <p className="mt-1 text-sm text-slate-500">
          Admins can create an agency and assign another user as the owner.
        </p>
        <p className="mt-3 text-xs text-slate-400">
          Use the owner&apos;s Supabase auth UUID. The owner will receive the agency membership and settings access automatically.
        </p>
      </div>
      <AgencyCreateForm onSuccess={() => router.push('/pipeline')} />
    </div>
  );
}
