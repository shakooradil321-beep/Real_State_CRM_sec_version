import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold', {
  variants: {
    variant: {
      default: 'bg-slate-100 text-slate-700',
      success: 'bg-green-100 text-green-800',
      danger: 'bg-red-100 text-red-700',
      warning: 'bg-amber-100 text-amber-800',
      info: 'bg-blue-100 text-blue-800',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);
