import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { useDealsStore } from '@/store/dealsStore'

ChartJS.register(ArcElement, Tooltip, Legend)

const RANGES = [
  { label: 'Under 50L', min: 0, max: 5_000_000 },
  { label: '50L – 1Cr', min: 5_000_000, max: 10_000_000 },
  { label: '1Cr – 2Cr', min: 10_000_000, max: 20_000_000 },
  { label: '2Cr – 5Cr', min: 20_000_000, max: 50_000_000 },
  { label: 'Above 5Cr', min: 50_000_000, max: Infinity },
]

const COLORS = ['#6366f1', '#f59e0b', '#3b82f6', '#22c55e', '#f43f5e']

export function BudgetDistributionChart() {
  const deals = useDealsStore((s) => s.deals)

  const counts = RANGES.map(
    ({ min, max }) =>
      deals.filter((d) => {
        const b = Number(d.budget)
        return b >= min && b < max
      }).length
  )

  // Only show ranges that have deals
  const filtered = RANGES.map((r, i) => ({ ...r, count: counts[i], color: COLORS[i] }))
    .filter((r) => r.count > 0)

  const data = {
    labels: filtered.map((r) => r.label),
    datasets: [
      {
        data: filtered.map((r) => r.count),
        backgroundColor: filtered.map((r) => r.color),
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
        text: 'Budget Distribution (PKR)',
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