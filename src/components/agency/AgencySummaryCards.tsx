import type { AgencyMembership } from '@/types';

interface AgencySummaryCardsProps {
  members: AgencyMembership[];
}

export const AgencySummaryCards = ({ members }: AgencySummaryCardsProps) => {
  const owners = members.filter((m) => m.role === 'owner').length;
  const agents = members.filter((m) => m.role === 'agent').length;

  const cards = [
    { label: 'Total Members', value: members.length },
    { label: 'Owners', value: owners },
    { label: 'Agents', value: agents },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card text-center"
        >
          <div className="text-2xl font-bold text-slate-900">{card.value}</div>
          <div className="mt-0.5 text-xs text-slate-500">{card.label}</div>
        </div>
      ))}
    </div>
  );
};
