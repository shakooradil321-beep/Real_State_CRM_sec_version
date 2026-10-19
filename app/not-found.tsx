import Link from 'next/link';
import { Home } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-card">
        <div className="text-5xl font-semibold text-primary">404</div>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">The page you are looking for does not exist or has been moved.</p>
        <Button asChild className="mt-6 w-full">
          <Link href="/pipeline">
            <Home className="mr-2 h-4 w-4" />
            Go to Pipeline
          </Link>
        </Button>
      </div>
    </div>
  );
}
