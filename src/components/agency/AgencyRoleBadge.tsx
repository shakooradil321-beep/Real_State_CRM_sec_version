import { cn } from '@/lib/utils';
import type { AgencyRole } from '@/types';

interface AgencyRoleBadgeProps {
  role: AgencyRole;
  className?: string;
}

export const AgencyRoleBadge = ({ role, className }: AgencyRoleBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        role === 'owner'
          ? 'bg-green-100 text-green-800'
          : 'bg-slate-100 text-slate-700',
        className,
      )}
    >
      {role === 'owner' ? 'Owner' : 'Agent'}
    </span>
  );
};
