import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { recordPayment } from '@/lib/api/paymentsApi';
import type { Deal, DealPayment } from '@/types';

interface RecordPaymentDialogProps {
  deal: Deal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Called after a successful payment so the parent can append to its list.
  onRecorded: (payment: DealPayment) => void;
  // Whether to show the "mark commission as earned" checkbox.
  // True when: deal has agency_id, commission exists, earned_trigger = 'on_payment',
  // status = 'pending'. Evaluated by the parent (DealDetailSheet).
  canMarkCommissionEarned: boolean;
}

// ---------------------------------------------------------------------------
// RecordPaymentDialog
//
// Collects: payment_kind, amount, received_on, optional notes, and the
// explicit mark_commission_as_earned boolean (api-manifest.md requirement).
//
// Amount is entered in PKR as a plain integer — no decimals.
// The route handler validates this server-side as well.
// ---------------------------------------------------------------------------
export function RecordPaymentDialog({
  deal,
  open,
  onOpenChange,
  onRecorded,
  canMarkCommissionEarned,
}: RecordPaymentDialogProps) {
  const [kind, setKind]         = useState<'token_money' | 'bayana'>('token_money');
  const [amount, setAmount]     = useState('');
  const [date, setDate]         = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes]       = useState('');
  const [markEarned, setMarkEarned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setKind('token_money');
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setMarkEarned(false);
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  async function handleSubmit() {
    const parsedAmount = parseInt(amount.replace(/,/g, ''), 10);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Enter a valid amount in PKR.');
      return;
    }

    setSubmitting(true);
    try {
      const { payment } = await recordPayment(deal.id, {
        payment_kind: kind,
        amount: parsedAmount,
        received_on: date,
        notes: notes.trim() || null,
        mark_commission_as_earned: markEarned,
      });

      if (markEarned) {
        toast.success('Payment recorded and commission marked as earned.');
      } else {
        toast.success('Payment recorded.');
      }

      onRecorded(payment);
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Payment kind */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Payment Type</label>
            <div className="flex gap-2">
              {(['token_money', 'bayana'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                    kind === k
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {k === 'token_money' ? 'Token Money' : 'Bayana'}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700" htmlFor="payment-amount">
              Amount (PKR)
            </label>
            <input
              id="payment-amount"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500000"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Received on */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700" htmlFor="payment-date">
              Date Received
            </label>
            <input
              id="payment-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700" htmlFor="payment-notes">
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Received in office, cheque #1234"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Mark commission as earned — only shown when applicable */}
          {canMarkCommissionEarned ? (
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={markEarned}
                onChange={(e) => setMarkEarned(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-green-600"
              />
              <div>
                <div className="text-sm font-medium text-slate-700">
                  Mark commission as earned
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  This payment will be recorded as the trigger for the pending
                  commission on this deal.
                </div>
              </div>
            </label>
          ) : null}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !amount.trim() || !date}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Record Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}