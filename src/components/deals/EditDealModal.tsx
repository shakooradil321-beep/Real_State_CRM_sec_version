import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { DealFormFields, dealFormSchema, type DealFormValues, toDealUpdate } from '@/components/deals/DealFormFields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Spinner } from '@/components/ui/spinner';
import { useDealsStore } from '@/store/dealsStore';
import type { Deal } from '@/types';

interface EditDealModalProps {
  deal: Deal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toFormValues = (deal: Deal): DealFormValues => ({
  client_name: deal.client_name,
  phone: deal.phone,
  budget: deal.budget,
  area: deal.area,
  property_type: deal.property_type,
  source: deal.source ?? undefined,
  stage: deal.stage,
  followup_date: deal.followup_date ?? '',
  notes: deal.notes ?? '',
});

export const EditDealModal = ({ deal, open, onOpenChange }: EditDealModalProps) => {
  const isMobile = useIsMobile();
  const updateDeal = useDealsStore((state) => state.updateDeal);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DealFormValues>({ defaultValues: toFormValues(deal) });

  useEffect(() => {
    if (open) {
      reset(toFormValues(deal));
    }
  }, [deal, open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const parsed = dealFormSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as keyof DealFormValues;
        setError(fieldName, { message: issue.message });
      });
      return;
    }

    try {
      await updateDeal(deal.id, toDealUpdate(parsed.data));
      toast.success('Deal updated successfully.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update deal.');
    }
  });

  const content = (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <DealFormFields errors={errors} register={register} setValue={setValue} watch={watch} showStage={deal.stage !== 'closed'} />
      </div>
      <div className="mt-6">
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" className="gap-2">
            {isSubmitting ? <Spinner className="h-4 w-4" /> : null}
            Save Changes
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
            <SheetTitle>Edit Deal</SheetTitle>
            <SheetDescription>Update client details, notes, and pipeline stage.</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
          <DialogDescription>Update client details, notes, and pipeline stage.</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
