'use client';

import { format, parseISO } from 'date-fns';
import { CheckCircle2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DealDetailSheet } from '@/components/deals/DealDetailSheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatBudget } from '@/lib/formatters';
import { useDealsStore } from '@/store/dealsStore';
import type { Deal } from '@/types';

export default function ClosedDealsPage() {
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [query, setQuery] = useState('');
  const initialized = useDealsStore((state) => state.initialized);
  const error = useDealsStore((state) => state.error);
  const closedDeals = useDealsStore((state) => state.deals.filter((deal) => deal.stage === 'closed'));

  const getClosedDealValue = (deal: Deal) => deal.closing_amount ?? deal.budget;

  const filteredDeals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return closedDeals
      .filter((deal) => {
        if (!normalizedQuery) {
          return true;
        }

        return deal.client_name.toLowerCase().includes(normalizedQuery) || deal.area.toLowerCase().includes(normalizedQuery);
      })
      .sort((left, right) => new Date(right.closed_at ?? right.updated_at).getTime() - new Date(left.closed_at ?? left.updated_at).getTime());
  }, [closedDeals, query]);

  const groupedDeals = useMemo(() => {
    return filteredDeals.reduce<Record<string, Deal[]>>((accumulator, deal) => {
      const key = format(parseISO(deal.closed_at ?? deal.updated_at), 'MMMM yyyy');
      accumulator[key] = accumulator[key] ? [...accumulator[key], deal] : [deal];
      return accumulator;
    }, {});
  }, [filteredDeals]);

  const totalValue = filteredDeals.reduce((sum, deal) => sum + getClosedDealValue(deal), 0);

  if (!initialized && closedDeals.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-10 shadow-card">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (error && closedDeals.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-card">
        <h2 className="text-xl font-semibold text-slate-900">Unable to load closed deals</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  if (closedDeals.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-card">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">No closed deals yet</h2>
        <p className="mt-2 text-sm text-slate-500">Closed deals will appear here once they move to the final stage.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <div className="text-sm font-medium text-slate-900">{filteredDeals.length} deals closed - Total value: {formatBudget(totalValue)}</div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by client or area" className="pl-10" />
        </div>
      </div>

      {filteredDeals.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-card">
          No closed deals match your search.
        </div>
      ) : (
        Object.entries(groupedDeals).map(([month, deals]) => (
          <section key={month} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">{month}</h2>
              <Badge className="bg-slate-100 text-slate-700">{deals.length}</Badge>
            </div>
            <div className="space-y-3">
              {deals.map((deal) => (
                <button
                  key={deal.id}
                  type="button"
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover"
                  onClick={() => setSelectedDeal(deal)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{deal.client_name}</div>
                      <div className="mt-1 text-xs text-slate-500">{deal.area} - {deal.property_type}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-primary">{formatBudget(getClosedDealValue(deal))}</div>
                      <div className="mt-1 text-xs text-slate-500">{format(parseISO(deal.closed_at ?? deal.updated_at), 'MMMM d, yyyy')}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))
      )}

      {selectedDeal ? <DealDetailSheet deal={selectedDeal} open={Boolean(selectedDeal)} onOpenChange={(open) => !open && setSelectedDeal(null)} readOnly /> : null}
    </div>
  );
}
