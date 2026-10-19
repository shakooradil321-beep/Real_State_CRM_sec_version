import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { createAgencySchema, type CreateAgencyFormValues } from '@/lib/agencyValidators';
import { useAgencyStore } from '@/store/agencyStore';
import type { Agency } from '@/types';

interface AgencyCreateFormProps {
  onSuccess: (agency: Agency) => void;
}

export const AgencyCreateForm = ({ onSuccess }: AgencyCreateFormProps) => {
  const createAgency = useAgencyStore((s) => s.createAgency);
  const loading = useAgencyStore((s) => s.loading);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreateAgencyFormValues>({
    defaultValues: { name: '', owner_user_id: '' },
  });

  const onSubmit = async (values: CreateAgencyFormValues) => {
    const parsed = createAgencySchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as keyof CreateAgencyFormValues;
        setError(fieldName, { message: issue.message });
      });
      return;
    }

    try {
      const agency = await createAgency(parsed.data);
      toast.success('Agency created and owner assigned.');
      reset();
      onSuccess(agency);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create agency.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="agency-name" className="text-sm font-medium text-slate-700">
          Agency Name
        </label>
        <input
          id="agency-name"
          type="text"
          placeholder="e.g. Premier Properties"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          {...register('name')}
        />
        {errors.name ? (
          <p className="text-xs text-red-600">{errors.name.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="owner-user-id" className="text-sm font-medium text-slate-700">
          Owner User ID
        </label>
        <input
          id="owner-user-id"
          type="text"
          placeholder="Supabase auth user UUID"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-400 shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          {...register('owner_user_id')}
        />
        <p className="text-xs text-slate-500">
          Enter the UUID of the user who should own this agency.
        </p>
        {errors.owner_user_id ? (
          <p className="text-xs text-red-600">{errors.owner_user_id.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating...' : 'Create Agency'}
      </Button>
    </form>
  );
};
