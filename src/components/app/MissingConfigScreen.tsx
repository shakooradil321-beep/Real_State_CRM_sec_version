import { AlertTriangle, Building2 } from 'lucide-react';

interface MissingConfigScreenProps {
  message: string;
}

export const MissingConfigScreen = ({ message }: MissingConfigScreenProps) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-card">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div className="mb-2 flex items-center justify-center gap-2 text-slate-900">
        <Building2 className="h-5 w-5 text-primary" />
        <span className="text-xl font-semibold">DealFlow</span>
      </div>
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  </div>
);
