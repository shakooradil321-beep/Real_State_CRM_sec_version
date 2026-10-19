'use client';

import { z } from 'zod';
import { BarChart3 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { FullScreenSpinner } from '@/components/app/FullScreenSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

const authSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function LoginPage() {
  const router = useRouter();
  const initialized = useAuthStore((state) => state.initialized);
  const { signIn, signUp, user, loading } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialized && user) {
      router.replace('/pipeline');
    }
  }, [initialized, router, user]);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    const parsed = authSchema.safeParse(form);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your input.');
      return;
    }

    try {
      if (tab === 'signin') {
        await signIn(parsed.data.email, parsed.data.password);
        router.replace('/pipeline');
      } else {
        await signUp(parsed.data.email, parsed.data.password);
        setSuccess('Check your email to confirm your account');
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to continue.');
    }
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSubmit();
  };

  if (!initialized) {
    return <FullScreenSpinner />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
            <BarChart3 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">DealFlow</h1>
          <p className="mt-1 text-sm text-slate-500">Never lose a deal again</p>
        </div>

        <form onSubmit={handleFormSubmit}>
          <Tabs value={tab} onValueChange={(value) => setTab(value as 'signin' | 'signup')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
              {success ? <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div> : null}
              <div className="space-y-2">
                <Label htmlFor="email-signin">Email</Label>
                <Input id="email-signin" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="agent@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signin">Password</Label>
                <Input id="password-signin" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Enter your password" />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading && tab === 'signin' ? <Spinner className="h-4 w-4" /> : null}
                Sign In
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
              {success ? <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div> : null}
              <div className="space-y-2">
                <Label htmlFor="email-signup">Email</Label>
                <Input id="email-signup" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="agent@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup">Password</Label>
                <Input id="password-signup" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Create a password" />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading && tab === 'signup' ? <Spinner className="h-4 w-4" /> : null}
                Create Account
              </Button>
            </TabsContent>
          </Tabs>
        </form>
      </div>
    </div>
  );
}
