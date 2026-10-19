'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Plus } from 'lucide-react';

import { AddDealModal } from '@/components/deals/AddDealModal';
import { BottomNav } from '@/components/layout/BottomNav';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { CONNECTION_LOST_MESSAGE } from '@/lib/utils';
import { useDealsStore } from '@/store/dealsStore';

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const [addOpen, setAddOpen] = useState(false);
  const error = useDealsStore((state) => state.error);

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />
      {error === CONNECTION_LOST_MESSAGE ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
          {CONNECTION_LOST_MESSAGE}
        </div>
      ) : null}
      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 md:px-6 md:pb-10">{children}</main>
      <Button
        type="button"
        onClick={() => setAddOpen(true)}
        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg md:bottom-6 md:right-6"
        size="icon"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">Add deal</span>
      </Button>
      <AddDealModal open={addOpen} onOpenChange={setAddOpen} />
      <BottomNav />
    </div>
  );
};
