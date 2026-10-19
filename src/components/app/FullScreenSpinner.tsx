import { Spinner } from '@/components/ui/spinner';

export const FullScreenSpinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50">
    <Spinner className="h-8 w-8 text-primary" />
  </div>
);
