import { Skeleton } from '@/components/ui/skeleton';

export const DealCardSkeleton = () => (
  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-card">
    <div className="mb-3 flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <Skeleton className="mb-3 h-4 w-24" />
    <Skeleton className="mb-4 h-4 w-36" />
    <div className="flex gap-2">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-10" />
    </div>
  </div>
);
