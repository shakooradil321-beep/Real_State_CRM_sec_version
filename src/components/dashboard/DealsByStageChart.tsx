import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { useDealsStore } from '@/store/dealsStore'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const STAGE_LABELS: Record<string, string> = {
  new_lead: 'New Lead',
  visit: 'Visit Scheduled',
  negotiation: 'Negotiation',
  closed: 'Closed',
}

const STAGE_COLORS: Record<string, string> = {
  new_lead: '#6366f1',
  visit: '#f59e0b',
  negotiation: '#3b82f6',
  closed: '#22c55e',
}

export function DealsByStageChart() {
  const deals = useDealsStore((s) => s.deals)

  const stages = ['new_lead', 'visit', 'negotiation', 'closed']
  const counts = stages.map((stage) =>
    deals.filter((d) => d.stage === stage).length
  )

  const data = {
    labels: stages.map((s) => STAGE_LABELS[s]),
    datasets: [
      {
        label: 'Deals',
        data: counts,
        backgroundColor: stages.map((s) => STAGE_COLORS[s]),
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Deals by Stage',
        font: { size: 14, weight: 'bold' as const },
        color: '#1e293b',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
        grid: { color: '#f1f5f9' },
      },
      x: {
        grid: { display: false },
      },
    },
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <Bar data={data} options={options} />
    </div>
  )
}