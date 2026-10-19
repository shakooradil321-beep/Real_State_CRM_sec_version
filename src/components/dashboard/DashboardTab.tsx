import { DealsByStageChart } from './DealsByStageChart'
import { BudgetDistributionChart } from './BudgetDistributionChart'
import { useDealsStore } from '@/store/dealsStore'
import { LeadSourceChart } from './LeadSourceChart'

export function DashboardTab() {
  const deals = useDealsStore((s) => s.deals)

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <p className="text-lg font-medium">No data yet</p>
        <p className="text-sm mt-1">Add some deals to see your charts</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
      <DealsByStageChart />
      <BudgetDistributionChart />
      <LeadSourceChart />
    </div>
  )
}