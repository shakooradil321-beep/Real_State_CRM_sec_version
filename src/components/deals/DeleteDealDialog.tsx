import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDealsStore } from '@/store/dealsStore';
import type { Deal } from '@/types';

interface DeleteDealDialogProps {
  deal: Deal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export const DeleteDealDialog = ({ deal, open, onOpenChange, onDeleted }: DeleteDealDialogProps) => {
  const deleteDeal = useDealsStore((state) => state.deleteDeal);
  const restoreDeal = useDealsStore((state) => state.restoreDeal);

  const handleDelete = async () => {
    try {
      await deleteDeal(deal.id);
      onOpenChange(false);
      onDeleted?.();
      toast.custom(
        (toastInstance) => (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
            <div>
              <div className="text-sm font-semibold text-slate-900">Deal deleted.</div>
              <div className="text-xs text-slate-500">You have 5 seconds to undo.</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await restoreDeal(deal);
                  toast.dismiss(toastInstance.id);
                  toast.success('Deal restored.');
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Unable to restore deal.');
                }
              }}
            >
              Undo
            </Button>
          </div>
        ),
        { duration: 5000 },
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete deal.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete deal?</DialogTitle>
          <DialogDescription>
            This removes {deal.client_name}&apos;s deal from your pipeline. You can undo for 5 seconds after deletion.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={() => void handleDelete()}>
            Delete Deal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
