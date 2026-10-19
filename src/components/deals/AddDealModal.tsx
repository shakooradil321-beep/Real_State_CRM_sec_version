import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { DealFormFields, dealFormSchema, defaultDealFormValues, type DealFormValues, toDealInsert } from '@/components/deals/DealFormFields';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Spinner } from '@/components/ui/spinner';
import { useDealsStore } from '@/store/dealsStore';

interface AddDealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddDealModal = ({ open, onOpenChange }: AddDealModalProps) => {
  const isMobile = useIsMobile();
  const addDeal = useDealsStore((state) => state.addDeal);
  const { agency, loading: agencyLoading } = useAgencyContext();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DealFormValues>({ defaultValues: defaultDealFormValues });

  useEffect(() => {
    if (open) {
      reset(defaultDealFormValues);
    }
  }, [open, reset]);

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
      if (agencyLoading) {
        toast.error('Agency context is still loading. Please try again in a moment.');
        return;
      }

      await addDeal(toDealInsert(parsed.data, agency?.id ?? null));
      toast.success(`Deal added for ${parsed.data.client_name}!`);
      onOpenChange(false);
      reset(defaultDealFormValues);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add deal.');
    }
  });

  const content = (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <DealFormFields errors={errors} register={register} setValue={setValue} watch={watch} />
      </div>
      <div className="mt-6">
        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" className="gap-2">
            {isSubmitting ? <Spinner className="h-4 w-4" /> : null}
            Add Deal
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
            <SheetTitle>Add Deal</SheetTitle>
            <SheetDescription>Create a new lead and keep your pipeline moving.</SheetDescription>
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
          <DialogTitle>Add Deal</DialogTitle>
          <DialogDescription>Create a new lead and keep your pipeline moving.</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
