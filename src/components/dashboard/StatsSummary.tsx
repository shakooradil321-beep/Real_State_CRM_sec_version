import { BadgeDollarSign, BellRing, Briefcase, CheckCircle2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useDealsStore } from '@/store/dealsStore';

const cardStyles = [
  'bg-blue-50 text-blue-700',
  'bg-red-50 text-red-700',
  'bg-orange-50 text-orange-700',
  'bg-green-50 text-green-700',
] as const;

export const StatsSummary = () => {
  const stats = useDealsStore((state) => state.getStats());
  const dueCount = useDealsStore((state) => state.getFollowUpsToday().length);

  const cards = [
    { label: 'Active Deals', value: stats.totalActive, icon: Briefcase, tone: cardStyles[0] },
    { label: 'Follow-ups Due', value: dueCount, icon: BellRing, tone: dueCount > 0 ? cardStyles[1] : 'bg-slate-100 text-slate-600' },
    { label: 'In Negotiation', value: stats.negotiations, icon: BadgeDollarSign, tone: cardStyles[2] },
    { label: 'Closed This Month', value: stats.closedThisMonth, icon: CheckCircle2, tone: cardStyles[3] },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl', card.tone)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-semibold text-slate-900">{card.value}</div>
            <div className="mt-1 text-xs text-slate-500">{card.label}</div>
          </div>
        );
      })}
    </div>
  );
};
