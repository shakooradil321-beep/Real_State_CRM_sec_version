import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { useAgencyStore } from '@/store/agencyStore';
import {
  updateAgencySettingsSchema,
  type UpdateAgencySettingsFormValues,
} from '@/lib/agencyValidators';
import type { AgencySettings } from '@/types';

interface AgencySettingsFormProps {
  settings: AgencySettings;
}

export const AgencySettingsForm = ({ settings }: AgencySettingsFormProps) => {
  const updateAgencySettings = useAgencyStore((s) => s.updateAgencySettings);

  const defaultValues: UpdateAgencySettingsFormValues = {
    commission_enabled:           settings.commission_enabled,
    commission_basis:             settings.commission_basis ?? null,
    commission_percentage_value:  settings.commission_percentage_value ?? null,
    commission_flat_fee_value:    settings.commission_flat_fee_value ?? null,
    agent_share_percentage:       settings.agent_share_percentage ?? null,
    agency_share_percentage:      settings.agency_share_percentage ?? null,
    commission_earned_trigger:    settings.commission_earned_trigger,
    // Migration 008 — defaults to false when the column does not exist yet
    // on older rows (the DB default handles new rows automatically).
    show_commission_to_agents:    settings.show_commission_to_agents ?? false,
  };

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateAgencySettingsFormValues>({ defaultValues });

  useEffect(() => {
    reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.agency_id]);

  const commissionEnabled = watch('commission_enabled');
  const commissionBasis   = watch('commission_basis');

  const onSubmit = async (values: UpdateAgencySettingsFormValues) => {
    const parsed = updateAgencySettingsSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as keyof UpdateAgencySettingsFormValues;
        if (fieldName) setError(fieldName, { message: issue.message });
      });
      return;
    }

    // If commission disabled, null-out detailed fields to satisfy the DB
    // check constraint. show_commission_to_agents is preserved either way.
    const payload = parsed.data.commission_enabled
      ? parsed.data
      : {
          commission_enabled:          false,
          commission_basis:            null,
          commission_percentage_value: null,
          commission_flat_fee_value:   null,
          agent_share_percentage:      null,
          agency_share_percentage:     null,
          commission_earned_trigger:   parsed.data.commission_earned_trigger,
          show_commission_to_agents:   parsed.data.show_commission_to_agents,
        };

    try {
      await updateAgencySettings(payload);
      toast.success('Settings saved.');
    } catch {
      toast.error('Could not save settings. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* Commission enabled toggle */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-card">
        <div>
          <div className="text-sm font-medium text-slate-900">Commission Tracking</div>
          <div className="text-xs text-slate-500">
            Calculate agent commissions on closed deals.
          </div>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" className="peer sr-only" {...register('commission_enabled')} />
          <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-500 peer-checked:after:translate-x-full" />
        </label>
      </div>

      {commissionEnabled ? (
        <>
          {/* Commission basis */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-900">Commission Basis</div>
            <div className="grid grid-cols-2 gap-3">
              {(['percentage', 'flat_fee'] as const).map((basis) => (
                <label
                  key={basis}
                  className={`flex cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                    commissionBasis === basis
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    value={basis}
                    className="sr-only"
                    {...register('commission_basis')}
                  />
                  {basis === 'percentage' ? '% Percentage' : 'Flat Fee'}
                </label>
              ))}
            </div>
            {errors.commission_basis ? (
              <p className="text-xs text-red-600">{errors.commission_basis.message}</p>
            ) : null}
          </div>

          {/* Basis-specific value */}
          {commissionBasis === 'percentage' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Commission %</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  placeholder="e.g. 2.5"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  {...register('commission_percentage_value')}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  %
                </span>
              </div>
              {errors.commission_percentage_value ? (
                <p className="text-xs text-red-600">
                  {errors.commission_percentage_value.message}
                </p>
              ) : null}
            </div>
          ) : commissionBasis === 'flat_fee' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Flat Fee (PKR)</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 100000"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                {...register('commission_flat_fee_value')}
              />
              {errors.commission_flat_fee_value ? (
                <p className="text-xs text-red-600">{errors.commission_flat_fee_value.message}</p>
              ) : null}
            </div>
          ) : null}

          {/* Share split */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-900">Commission Split</div>
            <p className="text-xs text-slate-500">
              Agent share + Agency share must equal 100%.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Agent %</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g. 70"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  {...register('agent_share_percentage')}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Agency %</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g. 30"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  {...register('agency_share_percentage')}
                />
              </div>
            </div>
            {errors.agent_share_percentage ? (
              <p className="text-xs text-red-600">{errors.agent_share_percentage.message}</p>
            ) : null}
          </div>

          {/* Earned trigger */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-900">Commission Earned When</div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'on_close',   label: 'Deal Closes' },
                { value: 'on_payment', label: 'Payment Received' },
              ] as const).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                    watch('commission_earned_trigger') === opt.value
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    value={opt.value}
                    className="sr-only"
                    {...register('commission_earned_trigger')}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Commission visibility — owner controls whether agents see their
              commission breakdown. Off by default (migration 008). */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-card">
            <div>
              <div className="text-sm font-medium text-slate-900">
                Show Commission to Agents
              </div>
              <div className="text-xs text-slate-500">
                When on, agents can see the commission breakdown on their own
                closed deals. Off by default.
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                {...register('show_commission_to_agents')}
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-500 peer-checked:after:translate-x-full" />
            </label>
          </div>
        </>
      ) : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Save Settings'}
      </Button>
    </form>
  );
};