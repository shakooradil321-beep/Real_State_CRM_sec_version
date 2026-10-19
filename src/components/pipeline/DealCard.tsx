import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { CalendarClock, MoreVertical, Phone } from 'lucide-react';
import { useState } from 'react';

import { DealDetailSheet } from '@/components/deals/DealDetailSheet';
import { DeleteDealDialog } from '@/components/deals/DeleteDealDialog';
import { EditDealModal } from '@/components/deals/EditDealModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatBudget, formatDate, isOverdue, isToday } from '@/lib/formatters';
import {
  buildDealWhatsAppUrl,
  cn,
  getAvatarColorClass,
  getInitials,
  toDialablePhone,
} from '@/lib/utils';
import { useActivitiesStore } from '@/store/activitiesStore';
import { STAGE_CONFIG, type Deal } from '@/types';

interface DealCardProps {
  deal: Deal;
  dragDisabled?: boolean;
}

interface DealCardPreviewProps {
  deal: Deal;
  dragging?: boolean;
}

// ---------------------------------------------------------------------------
// Fire-and-forget activity logger for contact quick-actions.
//
// We do NOT await these calls before opening the phone dialer or WhatsApp
// because the user navigates away immediately. The activity is logged
// optimistically. If the insert fails it is silently dropped — this matches
// the agreed fire-and-forget strategy for contact actions.
//
// FUTURE: If you want automatic server-side logging (e.g. via a Supabase
// webhook or a background job that detects the link click and logs without
// relying on the client), replace this call with a POST to a route handler
// that records the activity using the service-role client. The activity type
// ('called' | 'whatsapped'), deal id, and client name are all you need to
// pass in the body.
// ---------------------------------------------------------------------------
function logContactAction(
  addActivity: ReturnType<typeof useActivitiesStore.getState>['addActivity'],
  deal: Deal,
  type: 'called' | 'whatsapped',
) {
  void addActivity({
    dealId: deal.id,
    type,
    meta: { client: deal.client_name, phone: deal.phone },
  });
}

const CardContent = ({
  deal,
  dragging = false,
  onOpen,
}: DealCardPreviewProps & { onOpen?: () => void }) => {
  const stageConfig = STAGE_CONFIG[deal.stage];
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const addActivity = useActivitiesStore((s) => s.addActivity);

  const handleOpen = () => {
    if (dragging) return;
    onOpen?.();
    setDetailOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          'rounded-xl border border-slate-200 bg-white p-3 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover',
          deal.stage === 'new_lead' && 'border-l-[3px] border-l-stage-new-lead',
          deal.stage === 'visit' && 'border-l-[3px] border-l-stage-visit',
          deal.stage === 'negotiation' && 'border-l-[3px] border-l-stage-negotiation',
          deal.stage === 'closed' && 'border-l-[3px] border-l-stage-closed',
          dragging && 'opacity-60 shadow-none',
        )}
      >
        <button type="button" className="w-full text-left" onClick={handleOpen}>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                getAvatarColorClass(deal.client_name),
              )}
            >
              {getInitials(deal.client_name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold text-slate-900">
                {deal.client_name}
              </div>
              <div className="truncate text-xs text-slate-500">
                {deal.area} · {deal.property_type}
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm font-medium text-primary">
            Budget: {formatBudget(deal.budget)}
          </div>

          {deal.followup_date ? (
            <div className="mt-4 flex items-center justify-between gap-3 text-xs">
              <div
                className={cn(
                  'flex items-center gap-2',
                  isOverdue(deal.followup_date)
                    ? 'text-red-600'
                    : isToday(deal.followup_date)
                      ? 'text-amber-700'
                      : 'text-slate-500',
                )}
              >
                <CalendarClock className="h-4 w-4" />
                <span>Follow-up: {formatDate(deal.followup_date)}</span>
              </div>
              {isOverdue(deal.followup_date) ? (
                <Badge variant="danger">OVERDUE</Badge>
              ) : null}
            </div>
          ) : null}
        </button>

        <div className="mt-4 flex items-center gap-2">
          {/* Call button — logs 'called' activity on click, fire-and-forget */}
          <Button
            asChild
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              logContactAction(addActivity, deal, 'called');
            }}
          >
            <a href={`tel:${toDialablePhone(deal.phone)}`}>
              <Phone className="mr-2 h-4 w-4" />
              Call
            </a>
          </Button>

          {/* WhatsApp button — logs 'whatsapped' activity on click, fire-and-forget */}
          <Button
            asChild
            type="button"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              logContactAction(addActivity, deal, 'whatsapped');
            }}
          >
            <a href={buildDealWhatsAppUrl(deal)} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit</DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DealDetailSheet deal={deal} open={detailOpen} onOpenChange={setDetailOpen} />
      <EditDealModal deal={deal} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteDealDialog deal={deal} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
};

export const DealCardPreview = ({ deal, dragging = false }: DealCardPreviewProps) => {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-3 shadow-card',
        STAGE_CONFIG[deal.stage].borderColor,
        dragging && 'opacity-90',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
            getAvatarColorClass(deal.client_name),
          )}
        >
          {getInitials(deal.client_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-slate-900">
            {deal.client_name}
          </div>
          <div className="truncate text-xs text-slate-500">
            {deal.area} · {deal.property_type}
          </div>
        </div>
      </div>
      <div className="mt-4 text-sm font-medium text-primary">
        Budget: {formatBudget(deal.budget)}
      </div>
    </div>
  );
};

export const DealCard = ({ deal, dragDisabled = false }: DealCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: deal.id,
      disabled: dragDisabled,
      data: { type: 'deal', stage: deal.stage, dealId: deal.id },
    });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'touch-manipulation',
        dragDisabled && 'cursor-default',
        isDragging && 'z-10',
      )}
      {...attributes}
      {...listeners}
    >
      <CardContent deal={deal} dragging={isDragging} />
    </div>
  );
};