import { useState } from 'react';
import { Copy, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAgencyStore } from '@/store/agencyStore';
import type { AgencyInvitation } from '@/lib/api/invitationsApi';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Build the full accept URL the agent will visit.
// The agent must already have a DealFlow account, then they visit this link
// while signed in and the app calls the accept route.
//
// FUTURE: If automatic email invitations are added (see migration 007 and
// route handler comments), this link is still the destination — it just gets
// delivered via email instead of manually copied by the owner.
// ---------------------------------------------------------------------------
function buildInviteLink(token: string): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/invite/${token}`;
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const inviteAgent = useAgencyStore((s) => s.inviteAgent);

  const [email, setEmail]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<AgencyInvitation | null>(null);
  const [copied, setCopied]         = useState(false);

  const inviteLink = invitation ? buildInviteLink(invitation.token) : null;

  async function handleSubmit() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      toast.error('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await inviteAgent(trimmed);
      setInvitation(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invitation.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    // Reset form state when the dialog closes.
    setEmail('');
    setInvitation(null);
    setCopied(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a Team Member</DialogTitle>
        </DialogHeader>

        {!invitation ? (
          // Step 1 — enter email.
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-500">
              Enter the email address of the agent you want to invite. They must
              already have a DealFlow account.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="invite-email">
                Email address
              </label>
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit(); }}
                placeholder="agent@example.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={submitting}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting || !email.trim()}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Generate Invite Link
              </Button>
            </div>
          </div>
        ) : (
          // Step 2 — show the copyable link.
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-500">
              Invite link generated for{' '}
              <span className="font-medium text-slate-700">{invitation.invited_email}</span>.
              Copy and send it via WhatsApp or email. The link expires in 7 days.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="flex-1 truncate text-xs text-slate-600">{inviteLink}</span>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="flex-shrink-0 rounded-lg p-1.5 hover:bg-slate-200 transition-colors"
                title="Copy link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4 text-slate-500" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              The agent must be signed in to their DealFlow account before visiting
              this link.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
