'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { FullScreenSpinner } from '@/components/app/FullScreenSpinner';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const router = useRouter();
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    router.replace(user ? '/pipeline' : '/login');
  }, [initialized, router, user]);

  return <FullScreenSpinner />;
}
