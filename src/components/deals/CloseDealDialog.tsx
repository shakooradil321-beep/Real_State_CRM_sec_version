import { type FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useDealsStore } from '@/store/dealsStore';
import type { Deal, PropertyDisposition } from '@/types';

interface CloseDealDialogProps {
  deal: Deal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed?: (deal: Deal) => void;
}

export const CloseDealDialog = ({ deal, open, onOpenChange, onClosed }: CloseDealDialogProps) => {
  const isMobile = useIsMobile();
  const closeDeal = useDealsStore((state) => state.closeDeal);
  const [closingAmount, setClosingAmount] = useState<string>('');
  const [closingDisposition, setClosingDisposition] = useState<PropertyDisposition | ''>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setClosingAmount(String(deal.closing_amount ?? deal.budget));
    setClosingDisposition(deal.property_id ? (deal.closing_disposition ?? '') : '');
    setNotes('');
  }, [deal.budget, deal.closing_amount, deal.closing_disposition, deal.property_id, open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedAmount = Number(closingAmount);
    const hasLinkedProperty = Boolean(deal.property_id);

    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      toast.error('Enter a valid closing amount.');
      return;
    }

    if (hasLinkedProperty && !closingDisposition) {
      toast.error('Select whether the linked property was sold or rented.');
      return;
    }

    setIsSubmitting(true);

    try {
      const closedDeal = await closeDeal(deal.id, {
        closing_amount: parsedAmount,
        closing_disposition: hasLinkedProperty ? (closingDisposition as PropertyDisposition) : null,
        notes: notes.trim() || null,
      });

      toast.success(`${closedDeal.client_name} was closed successfully.`);
      onOpenChange(false);
      onClosed?.(closedDeal);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to close deal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const form = (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <div className="space-y-2">
          <Label htmlFor="closing_amount">Closing Amount (PKR)</Label>
          <Input
            id="closing_amount"
            type="number"
            min="1"
            step="1"
            value={closingAmount}
            onChange={(event) => setClosingAmount(event.target.value)}
            placeholder="25000000"
          />
          <p className="text-xs text-slate-500">Use the final transaction amount, not the original lead budget estimate.</p>
        </div>

        {deal.property_id ? (
          <div className="space-y-2">
            <Label>Closing Disposition</Label>
            <Select value={closingDisposition} onValueChange={(value) => setClosingDisposition(value as PropertyDisposition)}>
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="rented">Rented</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">The linked property status will be synced automatically after the close workflow runs.</p>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="close_notes">Close Notes</Label>
          <Textarea
            id="close_notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes about how the deal was finalized."
          />
        </div>
      </div>

      <div className="mt-6">
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" className="gap-2" disabled={isSubmitting}>
            {isSubmitting ? <Spinner className="h-4 w-4" /> : null}
            Close Deal
          </Button>
        </DialogFooter>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-hidden rounded-t-3xl p-5">
          <SheetHeader className="mb-4 pr-8">
            <SheetTitle>Close Deal</SheetTitle>
            <SheetDescription>Finish this deal through the server-managed close workflow.</SheetDescription>
          </SheetHeader>
          {form}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Close Deal</DialogTitle>
          <DialogDescription>Finish this deal through the server-managed close workflow.</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
};
