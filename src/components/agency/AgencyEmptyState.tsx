interface AgencyEmptyStateProps {
  title: string;
  description: string;
}

export const AgencyEmptyState = ({ title, description }: AgencyEmptyStateProps) => {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
};
