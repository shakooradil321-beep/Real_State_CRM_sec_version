import { useMemo } from 'react'

import { PIPELINE_BUDGET_RANGES, type PipelineFilterState } from '@/components/pipeline/PipelineFilters'
import { useDealsStore } from '@/store/dealsStore'

const BUDGET_RANGES: Record<string, { min: number; max: number }> = Object.fromEntries(
  PIPELINE_BUDGET_RANGES.map((range) => [range.label, { min: range.min, max: range.max }]),
)

export function useFilteredDeals(filters: PipelineFilterState) {
  const deals = useDealsStore((state) => state.deals)

  return useMemo(() => {
    return deals.filter((deal) => {
      if (filters.search && !deal.client_name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }

      if (filters.area && deal.area !== filters.area) {
        return false
      }

      if (filters.propertyType && deal.property_type !== filters.propertyType) {
        return false
      }

      if (filters.source && deal.source !== filters.source) {
        return false
      }

      if (filters.budgetRange) {
        const range = BUDGET_RANGES[filters.budgetRange]
        const budget = Number(deal.budget)

        if (!range || budget < range.min || budget >= range.max) {
          return false
        }
      }

      return true
    })
  }, [deals, filters])
}
