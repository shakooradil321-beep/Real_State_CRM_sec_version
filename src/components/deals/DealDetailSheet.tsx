import { format } from 'date-fns';
import {
  CalendarClock,
  MapPin,
  MessageSquareText,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { ActivityTimeline } from '@/components/deals/ActivityTimeline';
import { CloseDealDialog } from '@/components/deals/CloseDealDialog';
import { DeleteDealDialog } from '@/components/deals/DeleteDealDialog';
import { EditDealModal } from '@/components/deals/EditDealModal';
import { RecordPaymentDialog } from '@/components/deals/RecordPaymentDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  formatBudgetLong,
  formatDate,
  formatPhone,
  getDaysUntil,
  isOverdue,
  isToday,
} from '@/lib/formatters';
import { listPayments } from '@/lib/api/paymentsApi';
import {
  buildDealWhatsAppUrl,
  cn,
  getAvatarColorClass,
  getInitials,
  toDialablePhone,
} from '@/lib/utils';
import { useActivitiesStore } from '@/store/activitiesStore';
import { useAgencyStore } from '@/store/agencyStore';
import { useDealsStore } from '@/store/dealsStore';
import {
  ACTIVE_PIPELINE_STAGES,
  STAGE_CONFIG,
  type Deal,
  type DealCommission,
  type DealPayment,
  type Stage,
} from '@/types';

interface DealDetailSheetProps {
  deal: Deal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Fire-and-forget contact action logger — same pattern as DealCard.
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

// ---------------------------------------------------------------------------
// Format PKR amounts for display.
// ---------------------------------------------------------------------------
function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

// ---------------------------------------------------------------------------
// PaymentsSection — loads and displays payments, owner can add new ones.
// ---------------------------------------------------------------------------
interface PaymentsSectionProps {
  deal: Deal;
  commission: DealCommission | null;
  isOwner: boolean;
  showCommissionToAgents: boolean;
}

function PaymentsSection({
  deal,
  commission,
  isOwner,
  showCommissionToAgents,
}: PaymentsSectionProps) {
  const [payments, setPayments]         = useState<DealPayment[]>([]);
  const [loadingPay, setLoadingPay]     = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  useEffect(() => {
    if (!deal.id) return;
    setLoadingPay(true);
    listPayments(deal.id)
      .then(setPayments)
      .catch(() => toast.error('Failed to load payments.'))
      .finally(() => setLoadingPay(false));
  }, [deal.id]);

  // Determine whether to show the "mark commission as earned" checkbox.
  // Conditions (api-manifest.md): commission exists, earned_trigger = on_payment,
  // status = pending. Owner only.
  const canMarkCommissionEarned =
    isOwner &&
    commission !== null &&
    commission.earned_trigger === 'on_payment' &&
    commission.status === 'pending';

  // Commission is visible to this user if:
  // - they are the owner, OR
  // - showCommissionToAgents is true (owner has opted in)
  const showCommission = isOwner || showCommissionToAgents;

  return (
    <>
      {/* Payment list */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Payments</h3>
          {!deal.id ? null : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPaymentDialogOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add
            </Button>
          )}
        </div>

        {loadingPay ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-400">
            Loading payments…
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-400">
            No payments recorded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {formatPKR(p.amount)}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {p.payment_kind === 'token_money' ? 'Token Money' : 'Bayana'} ·{' '}
                      {format(new Date(p.received_on), 'MMM d, yyyy')}
                    </div>
                    {p.notes ? (
                      <div className="mt-1 text-xs text-slate-400">{p.notes}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Commission summary — gated by visibility rules */}
      {showCommission && commission ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Commission</h3>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Gross Commission</span>
              <span className="font-medium">{formatPKR(commission.gross_commission_amount)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Agent Share</span>
              <span className="font-medium">{formatPKR(commission.agent_commission_amount)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Agency Share</span>
              <span className="font-medium">{formatPKR(commission.agency_commission_amount)}</span>
            </div>
            <div className="flex justify-between gap-3 pt-1 border-t border-slate-100">
              <span className="text-slate-500">Status</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  commission.status === 'earned'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700',
                )}
              >
                {commission.status === 'earned' ? 'Earned' : 'Pending'}
              </span>
            </div>
            {commission.earned_at ? (
              <div className="flex justify-between gap-3 text-xs text-slate-400">
                <span>Earned on</span>
                <span>{format(new Date(commission.earned_at), 'MMM d, yyyy')}</span>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <RecordPaymentDialog
        deal={deal}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onRecorded={(payment) => setPayments((prev) => [payment, ...prev])}
        canMarkCommissionEarned={canMarkCommissionEarned}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// DealDetailSheet
// ---------------------------------------------------------------------------
export const DealDetailSheet = ({
  deal,
  open,
  onOpenChange,
  readOnly = false,
}: DealDetailSheetProps) => {
  const [closeOpen, setCloseOpen]   = useState(false);
  const [editOpen, setEditOpen]     = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeTab, setActiveTab]   = useState<'details' | 'activity'>('details');

  // Commission row — fetched when the sheet opens for a closed deal.
  const [commission, setCommission] = useState<DealCommission | null>(null);

  const updateDeal   = useDealsStore((s) => s.updateDeal);
  const addActivity  = useActivitiesStore((s) => s.addActivity);
  const membership   = useAgencyStore((s) => s.membership);
  const settings     = useAgencyStore((s) => s.settings);

  const isOwner = membership?.role === 'owner';
  // show_commission_to_agents added in migration 008, defaults to false.
  const showCommissionToAgents = settings?.show_commission_to_agents ?? false;

  const stageConfig = STAGE_CONFIG[deal.stage];

  const followUpStatus = useMemo(() => {
    if (!deal.followup_date) return 'No follow-up scheduled';
    if (isOverdue(deal.followup_date)) {
      const days = Math.abs(getDaysUntil(deal.followup_date));
      return `OVERDUE - ${days} day${days === 1 ? '' : 's'} ago`;
    }
    if (isToday(deal.followup_date)) return 'Due today';
    return formatDate(deal.followup_date);
  }, [deal.followup_date]);

  // Fetch commission row when the deal is closed and the user can see it.
  useEffect(() => {
    if (!open || deal.stage !== 'closed' || !deal.agency_id) return;
    if (!isOwner && !showCommissionToAgents) return;
    if (!supabaseAvailable()) return;

    import('@/lib/supabase').then(({ supabase }) => {
      if (!supabase) return;
      supabase
        .from('deal_commissions')
        .select('*')
        .eq('deal_id', deal.id)
        .maybeSingle()
        .then(({ data }) => setCommission(data ?? null));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deal.id, deal.stage]);

  const handleQuickStageChange = async (stage: Stage) => {
    try {
      await updateDeal(deal.id, { stage });
      toast.success(`Moved to ${STAGE_CONFIG[stage].label}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update stage.');
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Back
            </Button>
            {!readOnly ? (
              <div className="flex items-center gap-2">
                {deal.stage !== 'closed' ? (
                  <Button type="button" onClick={() => setCloseOpen(true)}>
                    Close Deal
                  </Button>
                ) : null}
                <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button type="button" variant="outline" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            ) : null}
          </div>

          <div className="space-y-6 px-4 py-6 sm:px-6">
            {/* Avatar + name + stage */}
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-semibold',
                  getAvatarColorClass(deal.client_name),
                )}
              >
                {getInitials(deal.client_name)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-semibold text-slate-900">{deal.client_name}</h2>
                {readOnly || deal.stage === 'closed' ? (
                  <Badge className={cn('mt-2 inline-flex', stageConfig.badgeColor)}>
                    {stageConfig.label}
                  </Badge>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'mt-2 rounded-full px-3 py-1 text-[11px] font-semibold',
                          stageConfig.badgeColor,
                        )}
                      >
                        {stageConfig.label}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2">
                      <div className="mb-2 text-xs font-medium text-slate-500">
                        Quick stage change
                      </div>
                      <div className="space-y-1">
                        {ACTIVE_PIPELINE_STAGES.map((stage) => (
                          <Button
                            key={stage}
                            type="button"
                            variant={stage === deal.stage ? 'secondary' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => void handleQuickStageChange(stage)}
                          >
                            {STAGE_CONFIG[stage].label}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
              {(['details', 'activity'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`border-b-2 px-4 pb-2 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-slate-500'
                  }`}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'details' ? (
              <>
                <Separator />

                {/* Contact */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">Contact</h3>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-500">Phone</div>
                        <div className="text-sm font-medium text-slate-900">
                          {formatPhone(deal.phone)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          onClick={() => logContactAction(addActivity, deal, 'called')}
                        >
                          <a href={`tel:${toDialablePhone(deal.phone)}`}>
                            <Phone className="mr-2 h-4 w-4" />
                            Call
                          </a>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          onClick={() => logContactAction(addActivity, deal, 'whatsapped')}
                        >
                          <a href={buildDealWhatsAppUrl(deal)} target="_blank" rel="noreferrer">
                            WA
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Deal Info */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">Deal Info</h3>
                  <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-slate-500">
                        <CalendarClock className="h-4 w-4" /> Budget
                      </span>
                      <span className="font-medium text-primary">
                        {formatBudgetLong(deal.budget)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-slate-500">
                        <MapPin className="h-4 w-4" /> Area
                      </span>
                      <span className="font-medium text-slate-900">{deal.area}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-500">Type</span>
                      <span className="font-medium text-slate-900">{deal.property_type}</span>
                    </div>
                    {deal.closing_amount ? (
                      <div className="flex items-center justify-between gap-3 text-sm border-t border-slate-100 pt-2 mt-2">
                        <span className="text-slate-500">Closing Amount</span>
                        <span className="font-medium text-green-700">
                          {formatBudgetLong(deal.closing_amount)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </section>

                {/* Follow-Up */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">Follow-Up</h3>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                    <div className="text-sm text-slate-900">
                      {deal.followup_date
                        ? format(new Date(deal.followup_date), 'MMMM d, yyyy')
                        : 'No follow-up scheduled'}
                    </div>
                    <div
                      className={cn(
                        'mt-2 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold',
                        isOverdue(deal.followup_date)
                          ? 'bg-red-100 text-red-700'
                          : isToday(deal.followup_date)
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {followUpStatus}
                    </div>
                  </div>
                </section>

                {/* Notes */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                    <div className="flex items-start gap-2 text-sm text-slate-700">
                      <MessageSquareText className="mt-0.5 h-4 w-4 text-slate-400" />
                      <p>{deal.notes?.trim() ? deal.notes : 'No notes added yet.'}</p>
                    </div>
                  </div>
                </section>

                {/* Payments + Commission — below Notes, always rendered for agency deals */}
                {deal.agency_id ? (
                  <PaymentsSection
                    deal={deal}
                    commission={commission}
                    isOwner={isOwner}
                    showCommissionToAgents={showCommissionToAgents}
                  />
                ) : null}

                {/* Timeline */}
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">Timeline</h3>
                  <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-card">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Added</span>
                      <span>{format(new Date(deal.created_at), 'MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Updated</span>
                      <span>{format(new Date(deal.updated_at), 'MMMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Closed</span>
                      <span>
                        {deal.closed_at
                          ? format(new Date(deal.closed_at), 'MMMM d, yyyy')
                          : '-'}
                      </span>
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <ActivityTimeline dealId={deal.id} />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {!readOnly ? (
        <EditDealModal deal={deal} open={editOpen} onOpenChange={setEditOpen} />
      ) : null}
      {!readOnly ? (
        <DeleteDealDialog
          deal={deal}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={() => onOpenChange(false)}
        />
      ) : null}
      {!readOnly ? (
        <CloseDealDialog
          deal={deal}
          open={closeOpen}
          onOpenChange={setCloseOpen}
          onClosed={() => onOpenChange(false)}
        />
      ) : null}
    </>
  );
};

// ---------------------------------------------------------------------------
// Small helper — avoids importing supabase at module level just for the check.
// ---------------------------------------------------------------------------
function supabaseAvailable(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}