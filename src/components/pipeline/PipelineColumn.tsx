import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { DealCard } from '@/components/pipeline/DealCard';
import { cn } from '@/lib/utils';
import { STAGE_CONFIG, type Deal, type Stage } from '@/types';

interface PipelineColumnProps {
  stage: Stage;
  deals: Deal[];
  dragDisabled?: boolean;
}

export const PipelineColumn = ({ stage, deals, dragDisabled = false }: PipelineColumnProps) => {
  const config = STAGE_CONFIG[stage];
  const { isOver, setNodeRef } = useDroppable({
    id: `column-${stage}`,
    data: { stage },
    disabled: dragDisabled,
  });

  return (
    <section className="flex h-full max-h-[calc(100vh-13rem)] w-[85vw] flex-shrink-0 snap-center flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white md:w-auto">
      <header className={cn('sticky top-0 z-10 flex items-center justify-between border-b-2 px-4 py-3', config.color, config.borderColor)}>
        <div className={cn('text-sm font-semibold', config.headerColor)}>{config.label}</div>
        <div className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', config.badgeColor)}>{deals.length}</div>
      </header>
      <SortableContext items={deals.map((deal) => deal.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className={cn('flex-1 space-y-3 overflow-y-auto p-3', isOver && 'bg-slate-50')}>
          {deals.length > 0 ? (
            deals.map((deal) => <DealCard key={deal.id} deal={deal} dragDisabled={dragDisabled} />)
          ) : (
            <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              No deals here yet
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
};
