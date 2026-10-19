'use client';

import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

import { FollowUpItem } from '@/components/followups/FollowUpItem';
import { Badge } from '@/components/ui/badge';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useDealsStore } from '@/store/dealsStore';

const Section = ({ title, count, tone, children }: { title: string; count: number; tone: string; children: ReactNode }) => {
  if (count === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className={`text-sm font-semibold ${tone}`}>{title}</h2>
        <Badge className="bg-slate-100 text-slate-700">{count}</Badge>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
};

export default function FollowUpsPage() {
  const dealsInitialized = useDealsStore((state) => state.initialized);
  const dealsError = useDealsStore((state) => state.error);
  const { overdue, today, upcoming, totalDue, all } = useFollowUps();

  if (!dealsInitialized && all.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-10 shadow-card">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (dealsError && all.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-card">
        <h2 className="text-xl font-semibold text-slate-900">Unable to load follow-ups</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">{dealsError}</p>
      </div>
    );
  }

  if (all.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-card">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">All caught up!</h2>
        <p className="mt-2 text-sm text-slate-500">No follow-ups pending.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold text-slate-900">Follow-ups</h1>
        <Badge className="bg-slate-100 text-slate-700">{totalDue}</Badge>
      </div>

      <Section title="Overdue" count={overdue.length} tone="text-red-700">
        {overdue.map((item) => (
          <FollowUpItem key={item.deal.id} item={item} />
        ))}
      </Section>

      <Section title="Today" count={today.length} tone="text-amber-700">
        {today.map((item) => (
          <FollowUpItem key={item.deal.id} item={item} />
        ))}
      </Section>

      <Section title="Next 7 days" count={upcoming.length} tone="text-blue-700">
        {upcoming.map((item) => (
          <FollowUpItem key={item.deal.id} item={item} />
        ))}
      </Section>
    </div>
  );
}
