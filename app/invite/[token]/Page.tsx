'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { acceptInvitation } from '@/lib/api/invitationsApi';
import { useAuthStore } from '@/store/authStore';

// ---------------------------------------------------------------------------
// /invite/[token]
//
// This is a public-ish route — it is reachable without auth, but the accept
// action requires the agent to be signed in. If they are not signed in, we
// redirect to /login with a return_to param so they come back here after auth.
//
// Flow:
//   1. Agent receives invite link from owner (WhatsApp / email).
//   2. Agent opens the link in browser.
//   3. If not signed in → redirected to /login?return_to=/invite/[token].
//   4. After sign in → redirected back here.
//   5. Page calls acceptInvitation(token) automatically.
//   6. On success → redirect to /pipeline with a success message.
//   7. On error → show the error with a retry option.
// ---------------------------------------------------------------------------

type Status = 'idle' | 'accepting' | 'success' | 'error';

interface InvitePageProps {
  params: { token: string };
}

export default function InvitePage({ params }: InvitePageProps) {
  const { token } = params;
  const router    = useRouter();
  const user      = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.initialized);

  const [status, setStatus]   = useState<Status>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authReady) return;

    // Not signed in — send to login with return_to.
    if (!user) {
      router.replace(`/login?return_to=/invite/${token}`);
      return;
    }

    // Signed in — attempt to accept the invitation.
    if (status === 'idle') {
      setStatus('accepting');
      acceptInvitation(token)
        .then(() => {
          setStatus('success');
          // Give the user a moment to read the success message then go to pipeline.
          setTimeout(() => router.replace('/pipeline'), 2000);
        })
        .catch((err) => {
          setStatus('error');
          setMessage(err instanceof Error ? err.message : 'Unable to accept invitation.');
        });
    }
  // Run once after auth is ready and user is known.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user]);

  if (!authReady || status === 'idle' || status === 'accepting') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        <p className="text-sm text-slate-500">Joining agency…</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <h1 className="text-xl font-semibold text-slate-900">You have joined the agency!</h1>
        <p className="text-sm text-slate-500">Taking you to the pipeline…</p>
      </div>
    );
  }

  // Error state.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <XCircle className="h-12 w-12 text-red-400" />
      <h1 className="text-xl font-semibold text-slate-900">Invitation failed</h1>
      <p className="text-sm text-slate-500 max-w-sm">{message}</p>
      <Button type="button" variant="outline" onClick={() => router.push('/pipeline')}>
        Go to Pipeline
      </Button>
    </div>
  );
}