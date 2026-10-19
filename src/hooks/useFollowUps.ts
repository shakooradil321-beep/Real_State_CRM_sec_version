import { useMemo } from 'react';

import { getDaysUntil } from '@/lib/formatters';
import { useDealsStore } from '@/store/dealsStore';
import type { FollowUpItem } from '@/types';

export const useFollowUps = () => {
  const deals = useDealsStore((state) => state.deals);

  return useMemo(() => {
    const items: FollowUpItem[] = deals
      .filter((deal) => deal.stage !== 'closed' && Boolean(deal.followup_date))
      .map((deal) => {
        const daysUntil = getDaysUntil(deal.followup_date);
        return {
          deal,
          daysUntil,
          status: daysUntil < 0 ? 'overdue' : daysUntil === 0 ? 'today' : 'upcoming',
        } satisfies FollowUpItem;
      })
      .sort((left, right) => left.daysUntil - right.daysUntil);

    return {
      overdue: items.filter((item) => item.status === 'overdue'),
      today: items.filter((item) => item.status === 'today'),
      upcoming: items.filter((item) => item.status === 'upcoming' && item.daysUntil <= 7),
      totalDue: items.filter((item) => item.status === 'overdue' || item.status === 'today').length,
      all: items,
    };
  }, [deals]);
};
