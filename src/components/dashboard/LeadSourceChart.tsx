import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { useDealsStore } from '@/store/dealsStore'
import { LEAD_SOURCES } from '@/types'

ChartJS.register(ArcElement, Tooltip, Legend)

const COLORS = [
  '#22c55e', '#6366f1', '#f59e0b', '#3b82f6',
  '#f43f5e', '#8b5cf6', '#14b8a6', '#f97316', '#94a3b8',
]

export function LeadSourceChart() {
  const deals = useDealsStore((s) => s.deals)

  const sourcedDeals = deals.filter((d) => d.source)

  if (sourcedDeals.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-sm font-bold text-slate-800 mb-3">Lead Sources</p>
        <p className="text-sm text-slate-400 text-center py-8">
          No source data yet — add a source when creating deals
        </p>
      </div>
    )
  }

  const counts = LEAD_SOURCES.map((s) =>
    sourcedDeals.filter((d) => d.source === s.value).length
  )

  const filtered = LEAD_SOURCES
    .map((s, i) => ({ ...s, count: counts[i], color: COLORS[i] }))
    .filter((s) => s.count > 0)

  const data = {
    labels: filtered.map((s) => s.label),
    datasets: [
      {
        data: filtered.map((s) => s.count),
        backgroundColor: filtered.map((s) => s.color),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  }

  const options = {
    responsive: true,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          font: { size: 12 },
          color: '#475569',
        },
      },
      title: {
        display: true,
        text: 'Lead Sources',
        font: { size: 14, weight: 'bold' as const },
        color: '#1e293b',
        padding: { bottom: 12 },
      },
    },
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <Doughnut data={data} options={options} />
    </div>
  )
}