import { addDays, format } from 'date-fns';
import type { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { z } from 'zod';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatBudgetLong, normalizePakistaniPhone } from '@/lib/formatters';
import { ACTIVE_PIPELINE_STAGES, KARACHI_AREAS, LEAD_SOURCES, PROPERTY_TYPES, type DealInsert, type DealUpdate, type PropertyType, type Stage } from '@/types';

const phoneRegex = /^(?:\+92|92|0)?3\d{9}$/;

export const dealFormSchema = z.object({
  client_name: z.string().min(1, 'Client name is required'),
  phone: z
    .string()
    .transform((value) => normalizePakistaniPhone(value))
    .refine((value) => phoneRegex.test(value), 'Enter a valid Pakistani phone number'),
  budget: z.coerce.number().int().positive('Budget must be greater than zero'),
  area: z.string().min(1, 'Area is required'),
  property_type: z.enum(['House', 'Apartment', 'Plot', 'Commercial', 'Office']),
  source: z.enum(['whatsapp', 'referral', 'olx', 'zameen', 'facebook', 'instagram', 'walk_in', 'cold_call', 'other']).optional(),
  stage: z.enum(['new_lead', 'visit', 'negotiation', 'closed']).optional(),
  followup_date: z.string().optional(),
  notes: z.string().max(5000, 'Notes are too long').optional(),
});

export type DealFormValues = z.infer<typeof dealFormSchema>;

export const defaultDealFormValues: DealFormValues = {
  client_name: '',
  phone: '',
  budget: 0,
  area: '',
  property_type: 'House',
  source: 'other',
  stage: 'new_lead',
  followup_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
  notes: '',
};

const ErrorText = ({ message }: { message?: string }) => (message ? <p className="text-xs text-red-600">{message}</p> : null);

interface DealFormFieldsProps {
  register: UseFormRegister<DealFormValues>;
  errors: FieldErrors<DealFormValues>;
  setValue: UseFormSetValue<DealFormValues>;
  watch: UseFormWatch<DealFormValues>;
  showStage?: boolean;
}

export const DealFormFields = ({ register, errors, setValue, watch, showStage = false }: DealFormFieldsProps) => {
  const selectedBudget = Number(watch('budget')) || 0;
  const selectedArea = watch('area');
  const propertyType = watch('property_type');
  const selectedStage = watch('stage') ?? 'new_lead';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="client_name">Client Name</Label>
        <Input id="client_name" placeholder="e.g. Ahmed Khan" autoFocus {...register('client_name')} />
        <ErrorText message={errors.client_name?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="03XX-XXXXXXX" {...register('phone')} />
        <ErrorText message={errors.phone?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget">Budget (PKR)</Label>
        <Input id="budget" type="number" min="1" placeholder="4500000" {...register('budget', { valueAsNumber: true })} />
        <p className="text-xs text-slate-500">= {selectedBudget > 0 ? formatBudgetLong(selectedBudget) : 'Enter a budget'}</p>
        <ErrorText message={errors.budget?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="area">Area</Label>
        <Input id="area" list="karachi-areas" placeholder="Search or type an area" {...register('area')} />
        <datalist id="karachi-areas">
          {KARACHI_AREAS.map((area) => (
            <option key={area} value={area} />
          ))}
        </datalist>
        <p className="text-xs text-slate-500">Selected: {selectedArea || 'No area selected yet'}</p>
        <ErrorText message={errors.area?.message} />
      </div>

      <div className="space-y-2">
        <Label>Property Type</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PROPERTY_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setValue('property_type', type, { shouldValidate: true })}
              className={
                type === propertyType
                  ? 'min-h-[44px] rounded-xl border border-primary bg-primary-light px-3 py-2 text-sm font-medium text-primary'
                  : 'min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700'
              }
            >
              {type}
            </button>
          ))}
        </div>
        <ErrorText message={errors.property_type?.message} />
      </div>
      {/* Lead Source */}
<div className="space-y-1.5">
  <label className="text-sm font-medium text-slate-700">
    Lead Source
    <span className="text-slate-400 font-normal ml-1">(optional)</span>
  </label>
  <select
    {...register('source')}
    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
  >
    <option value="">Select source...</option>
    {LEAD_SOURCES.map((s) => (
      <option key={s.value} value={s.value}>
        {s.label}
      </option>
    ))}
  </select>
</div>

      {showStage ? (
        <div className="space-y-2">
          <Label>Stage</Label>
          {selectedStage === 'closed' ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Closed deals can only change status through the server-managed close workflow.
            </div>
          ) : (
            <Select defaultValue={selectedStage} value={selectedStage} onValueChange={(value) => setValue('stage', value as Stage, { shouldValidate: true })}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVE_PIPELINE_STAGES.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <ErrorText message={errors.stage?.message} />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="followup_date">Follow-up Date</Label>
        <Input id="followup_date" type="date" {...register('followup_date')} />
        <ErrorText message={errors.followup_date?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Any details about this client..." {...register('notes')} />
        <ErrorText message={errors.notes?.message} />
      </div>
    </div>
  );
};

export const toDealInsert = (values: DealFormValues, agencyId: string | null = null): DealInsert => ({
  agency_id: agencyId,
  client_name: values.client_name.trim(),
  closing_amount: null,
  closing_disposition: null,
  phone: values.phone.trim(),
  budget: Number(values.budget),
  area: values.area.trim(),
  property_id: null,
  property_type: values.property_type as PropertyType,
  source: values.source ?? null,
  stage: 'new_lead' as Stage,
  followup_date: values.followup_date || null,
  notes: values.notes?.trim() ? values.notes.trim() : null,
  sort_order: 0,
});

export const toDealUpdate = (values: DealFormValues): DealUpdate => ({
  client_name: values.client_name.trim(),
  phone: values.phone.trim(),
  budget: Number(values.budget),
  area: values.area.trim(),
  property_type: values.property_type as PropertyType,
  source: values.source ?? null,
  stage: (values.stage ?? 'new_lead') as Stage,
  followup_date: values.followup_date || null,
  notes: values.notes?.trim() ? values.notes.trim() : null,
});
