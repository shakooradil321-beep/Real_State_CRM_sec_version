'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, CheckCircle2, LayoutDashboard } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDealsStore } from '@/store/dealsStore';

const navItems = [
  { to: '/pipeline', label: 'Pipeline', icon: LayoutDashboard },
  { to: '/followups', label: 'Follow-ups', icon: Bell },
  { to: '/closed', label: 'Closed', icon: CheckCircle2 },
] as const;

export const BottomNav = () => {
  const pathname = usePathname();
  const overdueCount = useDealsStore((state) => state.getOverdueDeals().length);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const showBadge = item.to === '/followups' && overdueCount > 0;

          return (
            <Link
              key={item.to}
              href={item.to}
              className={cn(
                'relative flex min-h-[60px] flex-col items-center justify-center gap-1 px-2 py-2 text-xs font-medium',
                pathname === item.to ? 'text-primary' : 'text-slate-500',
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {showBadge ? <Badge className="absolute right-5 top-2" variant="danger">{overdueCount}</Badge> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
