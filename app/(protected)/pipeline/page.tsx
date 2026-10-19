'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

import { DashboardTab } from '@/components/dashboard/DashboardTab';
import { StatsSummary } from '@/components/dashboard/StatsSummary';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { DealCardSkeleton } from '@/components/pipeline/DealCardSkeleton';
import { useDeals } from '@/hooks/useDeals';
import { STAGES, STAGE_CONFIG, type Deal, type Stage } from '@/types';

export default function PipelinePage() {
  const { deals, error, initialized, loading } = useDeals();
  const [activeTab, setActiveTab] = useState<'pipeline' | 'charts'>('pipeline');
  const showInitialSkeleton = deals.length === 0 && !error && (!initialized || loading);

  const handleStageMoved = (deal: Deal, stage: Stage) => {
    toast.success(`${deal.client_name} moved to ${STAGE_CONFIG[stage].label}.`);
  };

  if (showInitialSkeleton) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
        <div className="flex gap-4 overflow-x-auto pb-3 md:grid md:grid-cols-4 md:overflow-visible">
          {STAGES.map((stage) => (
            <div key={stage} className="w-[85vw] flex-shrink-0 rounded-2xl border border-slate-200 bg-white p-3 md:w-auto">
              <div className="mb-3 h-12 rounded-xl bg-slate-100" />
              <div className="space-y-3">
                <DealCardSkeleton />
                <DealCardSkeleton />
                <DealCardSkeleton />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && deals.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center shadow-card">
        <h2 className="text-xl font-semibold text-slate-900">Unable to load deals</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StatsSummary />
      <div className="flex border-b border-slate-200 px-4">
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`border-b-2 px-4 pb-2 text-sm font-medium transition-colors ${
            activeTab === 'pipeline'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-slate-500'
          }`}
          type="button"
        >
          Pipeline
        </button>
        <button
          onClick={() => setActiveTab('charts')}
          className={`border-b-2 px-4 pb-2 text-sm font-medium transition-colors ${
            activeTab === 'charts'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-slate-500'
          }`}
          type="button"
        >
          Charts
        </button>
      </div>
      {activeTab === 'pipeline' ? <PipelineBoard onStageMoved={handleStageMoved} /> : <DashboardTab />}
    </div>
  );
}
