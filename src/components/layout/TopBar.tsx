'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, LogOut, Settings, Users } from 'lucide-react';
import toast from 'react-hot-toast';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { canCreateAgency } from '@/lib/admin';
import { getAvatarColorClass, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useAgencyPermissions } from '@/hooks/useAgencyPermissions';

const titles: Record<string, string> = {
  '/pipeline': 'Pipeline',
  '/followups': 'Follow-ups',
  '/closed': 'Closed Deals',
  '/agency/create': 'Create Agency',
  '/agency/team': 'Team',
  '/agency/settings': 'Agency Settings',
};

export const TopBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const { agency } = useAgencyContext();
  const { isAgencyOwner } = useAgencyPermissions();
  const canShowCreateAgency = canCreateAgency(user?.email);

  const title = pathname ? titles[pathname] ?? 'DealFlow' : 'DealFlow';
  const initials = getInitials(user?.email ?? 'DF');

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully.');
      router.replace('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign out.');
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
        {/* Left: logo + agency name or tagline */}
        <Link href="/pipeline" className="flex min-w-0 items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-slate-900">DealFlow</div>
            <div className="text-xs text-slate-500">
              {agency ? agency.name : 'Karachi real estate pipeline'}
            </div>
          </div>
        </Link>

        {/* Centre: page title */}
        <h1 className="truncate text-base font-semibold text-slate-900 md:text-xl">{title}</h1>

        {/* Right: user avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm"
            >
              <span
                className={
                  getAvatarColorClass(user?.email ?? initials) +
                  ' flex h-10 w-10 items-center justify-center rounded-full'
                }
              >
                {initials}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2 text-xs text-slate-500">{user?.email}</div>

            {/* Agency owner links */}
            {isAgencyOwner ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/agency/team')}>
                  <Users className="mr-2 h-4 w-4" />
                  Team
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/agency/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Agency Settings
                </DropdownMenuItem>
              </>
            ) : null}

            {/* Solo user: offer create agency */}
            {canShowCreateAgency ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/agency/create')}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Create Agency
                </DropdownMenuItem>
              </>
            ) : null}

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void handleSignOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
