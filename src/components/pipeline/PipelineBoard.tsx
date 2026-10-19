import { DndContext, DragOverlay, PointerSensor, TouchSensor, closestCorners, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { DealCardPreview } from '@/components/pipeline/DealCard';
import { PipelineColumn } from '@/components/pipeline/PipelineColumn';
import { EMPTY_FILTERS, PipelineFilters, type PipelineFilterState } from '@/components/pipeline/PipelineFilters';
import { useFilteredDeals } from '@/hooks/useFilteredDeals';
import { useDealsStore } from '@/store/dealsStore';
import { STAGES, type Deal, type Stage } from '@/types';

interface PipelineBoardProps {
  onStageMoved?: (deal: Deal, stage: Stage) => void;
}

export const PipelineBoard = ({ onStageMoved }: PipelineBoardProps) => {
  const deals = useDealsStore((state) => state.deals);
  const getDealsByStage = useDealsStore((state) => state.getDealsByStage);
  const moveDeal = useDealsStore((state) => state.moveDeal);
  const reorderDeals = useDealsStore((state) => state.reorderDeals);
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [filters, setFilters] = useState<PipelineFilterState>(EMPTY_FILTERS);
  const filteredDeals = useFilteredDeals(filters);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const areas = useMemo(
    () => Array.from(new Set(deals.map((deal) => deal.area).filter(Boolean))).sort((left, right) => left.localeCompare(right)),
    [deals],
  );

  const hasActiveFilters = useMemo(() => Object.values(filters).some(Boolean), [filters]);

  const dealsByStage = useMemo(
    () =>
      STAGES.reduce<Record<Stage, Deal[]>>((accumulator, stage) => {
        accumulator[stage] = filteredDeals.filter((deal) => deal.stage === stage).sort((left, right) => left.sort_order - right.sort_order);
        return accumulator;
      }, { new_lead: [], visit: [], negotiation: [], closed: [] }),
    [filteredDeals],
  );

  const activeDeal = activeDealId ? deals.find((deal) => deal.id === activeDealId) ?? null : null;

  const getStageFromContainerId = (id: string): Stage | null => {
    const stage = id.replace('column-', '');
    return STAGES.includes(stage as Stage) ? (stage as Stage) : null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDealId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDealId(null);
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeId = String(active.id);
    const activeDealRecord = deals.find((deal) => deal.id === activeId);

    if (!activeDealRecord) {
      return;
    }

    const overId = String(over.id);
    const overDeal = deals.find((deal) => deal.id === overId);
    const targetStage = overDeal?.stage ?? getStageFromContainerId(overId);

    if (!targetStage || targetStage === 'closed' || activeDealRecord.stage === 'closed') {
      return;
    }

    try {
      if (targetStage === activeDealRecord.stage) {
        const stageDeals = getDealsByStage(targetStage);
        const oldIndex = stageDeals.findIndex((deal) => deal.id === activeId);
        const newIndex = overDeal ? stageDeals.findIndex((deal) => deal.id === overDeal.id) : stageDeals.length - 1;

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          return;
        }

        const reordered = arrayMove(stageDeals, oldIndex, newIndex).map((deal, index) => ({ ...deal, sort_order: index }));
        await reorderDeals(reordered);
        return;
      }

      const sourceDeals = getDealsByStage(activeDealRecord.stage).filter((deal) => deal.id !== activeId).map((deal, index) => ({ ...deal, sort_order: index }));
      const targetDeals = [...getDealsByStage(targetStage)];
      const insertIndex = overDeal ? targetDeals.findIndex((deal) => deal.id === overDeal.id) : targetDeals.length;
      const movedDeal = { ...activeDealRecord, stage: targetStage, sort_order: Math.max(insertIndex, 0) };
      const nextTargetDeals = [...targetDeals];
      nextTargetDeals.splice(Math.max(insertIndex, 0), 0, movedDeal);
      const normalizedTargetDeals = nextTargetDeals.map((deal, index) => ({ ...deal, sort_order: index }));

      await moveDeal(activeDealRecord.id, targetStage, Math.max(insertIndex, 0));
      await reorderDeals(sourceDeals);
      await reorderDeals(normalizedTargetDeals);
      onStageMoved?.(activeDealRecord, targetStage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to move deal.');
    }
  };

  const boardContent = (
    <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory md:grid md:grid-cols-4 md:overflow-visible">
      {STAGES.map((stage) => (
        <PipelineColumn key={stage} stage={stage} deals={dealsByStage[stage]} dragDisabled={hasActiveFilters || stage === 'closed'} />
      ))}
    </div>
  );

  return (
    <>
      <PipelineFilters filters={filters} onChange={setFilters} areas={areas} />
      <DndContext
        sensors={hasActiveFilters ? undefined : sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={(event) => void handleDragEnd(event)}
      >
        {boardContent}
        <DragOverlay>{activeDeal ? <DealCardPreview deal={activeDeal} dragging /> : null}</DragOverlay>
      </DndContext>
    </>
  );
};
