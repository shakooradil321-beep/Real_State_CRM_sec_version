import { z } from 'zod';

export const createAgencySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Agency name must be at least 2 characters.')
    .max(100, 'Agency name must be 100 characters or fewer.'),
  owner_user_id: z.string().uuid('Enter a valid owner user ID.'),
});

export type CreateAgencyFormValues = z.infer<typeof createAgencySchema>;

export const updateAgencySettingsSchema = z
  .object({
    commission_enabled: z.boolean(),
    commission_basis: z.enum(['percentage', 'flat_fee']).nullable().optional(),
    commission_percentage_value: z.coerce
      .number()
      .min(0.01)
      .max(100)
      .nullable()
      .optional(),
    commission_flat_fee_value: z.coerce
      .number()
      .int()
      .min(1)
      .nullable()
      .optional(),
    agent_share_percentage: z.coerce
      .number()
      .min(0)
      .max(100)
      .nullable()
      .optional(),
    agency_share_percentage: z.coerce
      .number()
      .min(0)
      .max(100)
      .nullable()
      .optional(),
    commission_earned_trigger: z.enum(['on_close', 'on_payment']),
    // Added in migration 008.
    // Controls whether agents can see the commission breakdown on their own
    // closed deals. Defaults to false (owner-only). Owner can toggle this on.
    show_commission_to_agents: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.commission_enabled) return;

    if (!data.commission_basis) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commission_basis'],
        message: 'Select a commission basis.',
      });
    }

    if (data.commission_basis === 'percentage') {
      if (!data.commission_percentage_value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['commission_percentage_value'],
          message: 'Enter a commission percentage.',
        });
      }
    }

    if (data.commission_basis === 'flat_fee') {
      if (!data.commission_flat_fee_value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['commission_flat_fee_value'],
          message: 'Enter a flat fee amount.',
        });
      }
    }

    const agentShare  = data.agent_share_percentage  ?? 0;
    const agencyShare = data.agency_share_percentage ?? 0;
    if (Math.round((agentShare + agencyShare) * 100) !== 10000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['agent_share_percentage'],
        message: 'Agent and agency shares must add up to 100%.',
      });
    }
  });

export type UpdateAgencySettingsFormValues = z.infer<typeof updateAgencySettingsSchema>;