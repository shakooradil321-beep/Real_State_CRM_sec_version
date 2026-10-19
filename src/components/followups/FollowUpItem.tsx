import { Phone } from 'lucide-react';
import { useState } from 'react';

import { DealDetailSheet } from '@/components/deals/DealDetailSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatBudget, formatDate } from '@/lib/formatters';
import { buildDealWhatsAppUrl, cn, toDialablePhone } from '@/lib/utils';
import { useActivitiesStore } from '@/store/activitiesStore';
import { STAGE_CONFIG, type FollowUpItem as FollowUpItemType } from '@/types';

interface FollowUpItemProps {
  item: FollowUpItemType;
}

// ---------------------------------------------------------------------------
// Fire-and-forget activity logger for contact quick-actions.
//
// The user navigates away immediately after tapping Call or WhatsApp, so we
// do not await the insert. If the insert fails it is silently dropped.
//
// FUTURE: To make this automatic and server-side (so the log survives even
// if the user closes the app instantly), add a POST /api/deals/:id/contact
// route handler that records 'called' or 'whatsapped' using the service-role
// client. Pass { type, phone } in the body. That route can be called here
// instead of addActivity.
// ---------------------------------------------------------------------------
function logContactAction(
  addActivity: ReturnType<typeof useActivitiesStore.getState>['addActivity'],
  item: FollowUpItemType,
  type: 'called' | 'whatsapped',
) {
  void addActivity({
    dealId: item.deal.id,
    type,
    meta: { client: item.deal.client_name, phone: item.deal.phone },
  });
}

export const FollowUpItem = ({ item }: FollowUpItemProps) => {
  const [open, setOpen] = useState(false);
  const addActivity = useActivitiesStore((s) => s.addActivity);

  const stageConfig = STAGE_CONFIG[item.deal.stage];
  const label =
    item.status === 'overdue'
      ? `${Math.abs(item.daysUntil)} day${Math.abs(item.daysUntil) === 1 ? '' : 's'} overdue`
      : item.status === 'today'
        ? 'Today'
        : `In ${item.daysUntil} day${item.daysUntil === 1 ? '' : 's'}`;

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <button type="button" className="w-full text-left" onClick={() => setOpen(true)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                {item.deal.client_name}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {item.deal.area} · {item.deal.property_type}
              </div>
            </div>
            <Badge className={cn(stageConfig.badgeColor)}>{stageConfig.label}</Badge>
          </div>
          <div className="mt-3 text-sm font-medium text-primary">
            {formatBudget(item.deal.budget)}
          </div>
          <div
            className={cn(
              'mt-2 text-xs font-medium',
              item.status === 'overdue'
                ? 'text-red-600'
                : item.status === 'today'
                  ? 'text-amber-700'
                  : 'text-blue-700',
            )}
          >
            {label} · {formatDate(item.deal.followup_date)}
          </div>
        </button>

        <div className="mt-4 flex gap-2">
          {/* Call button — logs 'called' activity on click, fire-and-forget */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => logContactAction(addActivity, item, 'called')}
          >
            <a href={`tel:${toDialablePhone(item.deal.phone)}`}>
              <Phone className="mr-2 h-4 w-4" />
              Phone
            </a>
          </Button>

          {/* WhatsApp button — logs 'whatsapped' activity on click, fire-and-forget */}
          <Button
            asChild
            size="sm"
            className="flex-1"
            onClick={() => logContactAction(addActivity, item, 'whatsapped')}
          >
            <a href={buildDealWhatsAppUrl(item.deal)} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </Button>
        </div>
      </div>

      <DealDetailSheet deal={item.deal} open={open} onOpenChange={setOpen} />
    </>
  );
};