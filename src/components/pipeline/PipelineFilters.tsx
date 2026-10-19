import { useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'

import { LEAD_SOURCES } from '@/types'

const PROPERTY_TYPES = ['House', 'Apartment', 'Plot', 'Commercial', 'Office']

export const PIPELINE_BUDGET_RANGES = [
  { label: 'Under 50L', min: 0, max: 5_000_000 },
  { label: '50L - 1Cr', min: 5_000_000, max: 10_000_000 },
  { label: '1Cr - 2Cr', min: 10_000_000, max: 20_000_000 },
  { label: '2Cr - 5Cr', min: 20_000_000, max: 50_000_000 },
  { label: 'Above 5Cr', min: 50_000_000, max: Infinity },
]

export interface PipelineFilterState {
  search: string
  area: string
  propertyType: string
  source: string
  budgetRange: string
}

export const EMPTY_FILTERS: PipelineFilterState = {
  search: '',
  area: '',
  propertyType: '',
  source: '',
  budgetRange: '',
}

interface Props {
  filters: PipelineFilterState
  onChange: (filters: PipelineFilterState) => void
  areas: string[]
}

export function PipelineFilters({ filters, onChange, areas }: Props) {
  const [showFilters, setShowFilters] = useState(false)

  const activeFilterCount = [
    filters.area,
    filters.propertyType,
    filters.source,
    filters.budgetRange,
  ].filter(Boolean).length

  const hasAnyFilter = filters.search || activeFilterCount > 0

  function update(key: keyof PipelineFilterState, value: string) {
    onChange({ ...filters, [key]: value })
  }

  function clearAll() {
    onChange(EMPTY_FILTERS)
    setShowFilters(false)
  }

  return (
    <div className="space-y-2 px-4 pb-2 pt-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search client name..."
            value={filters.search}
            onChange={(event) => update('search', event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => update('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((value) => !value)}
          className={`relative flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'border-green-300 bg-green-50 text-green-700'
              : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-xs text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 transition-colors hover:border-red-200 hover:text-red-500"
          >
            Clear
          </button>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            value={filters.area}
            onChange={(event) => update('area', event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Areas</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <select
            value={filters.propertyType}
            onChange={(event) => update('propertyType', event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Types</option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            value={filters.source}
            onChange={(event) => update('source', event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Sources</option>
            {LEAD_SOURCES.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>

          <select
            value={filters.budgetRange}
            onChange={(event) => update('budgetRange', event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Budgets</option>
            {PIPELINE_BUDGET_RANGES.map((range) => (
              <option key={range.label} value={range.label}>
                {range.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {hasAnyFilter && <p className="px-1 text-xs text-slate-400">Filtering active - some deals may be hidden</p>}
    </div>
  )
}
