import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { UserPlus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { AgencyRoleBadge } from '@/components/agency/AgencyRoleBadge';
import { AgencyEmptyState } from '@/components/agency/AgencyEmptyState';
import { InviteMemberDialog } from '@/components/agency/InviteMemberDialog';
import { Button } from '@/components/ui/button';
import { cn, getAvatarColorClass, getInitials } from '@/lib/utils';
import { useAgencyStore } from '@/store/agencyStore';
import type { AgencyMembership } from '@/types';

// ---------------------------------------------------------------------------
// TeamMemberRow — unchanged from original, kept here for co-location.
// ---------------------------------------------------------------------------
interface TeamMemberRowProps {
  membership: AgencyMembership;
}

const TeamMemberRow = ({ membership }: TeamMemberRowProps) => {
  const shortId = membership.user_id.slice(0, 8);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          getAvatarColorClass(membership.user_id),
        )}
      >
        {getInitials(shortId)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-900">
          {shortId}&hellip;
        </div>
        <div className="text-xs text-slate-500">
          Joined {format(new Date(membership.created_at), 'MMM d, yyyy')}
        </div>
      </div>
      <AgencyRoleBadge role={membership.role} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// PendingInvitationRow — one pending invite with a Revoke action.
// ---------------------------------------------------------------------------
interface PendingInvitationRowProps {
  invitation: { id: string; invited_email: string; expires_at: string };
  onRevoke: (id: string) => Promise<void>;
}

const PendingInvitationRow = ({ invitation, onRevoke }: PendingInvitationRowProps) => {
  const [revoking, setRevoking] = useState(false);

  async function handleRevoke() {
    setRevoking(true);
    try {
      await onRevoke(invitation.id);
      toast.success('Invitation revoked.');
    } catch {
      toast.error('Failed to revoke invitation.');
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-500">
        ?
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-700">
          {invitation.invited_email}
        </div>
        <div className="text-xs text-slate-400">
          Invite expires {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
        </div>
      </div>
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
        Pending
      </span>
      <button
        type="button"
        onClick={() => void handleRevoke()}
        disabled={revoking}
        className="ml-1 rounded-lg p-1 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-40"
        title="Revoke invitation"
      >
        {revoking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <X className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// TeamMembersList — main export.
// Owners see the Invite button and pending invitations list.
// Agents see the member list only (no invite controls).
// ---------------------------------------------------------------------------
interface TeamMembersListProps {
  members: AgencyMembership[];
  isOwner: boolean;
}

export const TeamMembersList = ({ members, isOwner }: TeamMembersListProps) => {
  const { invitations, fetchInvitations, revokeInvitation } = useAgencyStore();
  const [inviteOpen, setInviteOpen] = useState(false);

  // Fetch pending invitations when the owner views this page.
  useEffect(() => {
    if (isOwner) {
      void fetchInvitations();
    }
  }, [isOwner, fetchInvitations]);

  const hasPending = invitations.length > 0;

  return (
    <>
      <div className="space-y-4">
        {/* Header row with Invite button for owners */}
        {isOwner ? (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Team Members</h3>
            <Button
              type="button"
              size="sm"
              onClick={() => setInviteOpen(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </div>
        ) : null}

        {/* Active members */}
        {members.length === 0 && !hasPending ? (
          <AgencyEmptyState
            title="No members yet"
            description="Invite an agent to get started."
          />
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <TeamMemberRow key={m.id} membership={m} />
            ))}
          </div>
        )}

        {/* Pending invitations — owner only */}
        {isOwner && hasPending ? (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pending Invitations
            </h4>
            {invitations.map((inv) => (
              <PendingInvitationRow
                key={inv.id}
                invitation={inv}
                onRevoke={revokeInvitation}
              />
            ))}
          </div>
        ) : null}
      </div>

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
};