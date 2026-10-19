import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, ArrowRightLeft, Plus, Calendar, Phone, Send, Loader2 } from 'lucide-react';

import { useActivitiesStore } from '@/store/activitiesStore';
import { formatDate } from '@/lib/formatters';
import { STAGE_CONFIG, type DealActivity, type Stage } from '@/types';

// ---------------------------------------------------------------------------
// Icon and colour maps — one entry per activity type.
// ---------------------------------------------------------------------------
const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  note:          <MessageSquare className="w-3.5 h-3.5" />,
  stage_changed: <ArrowRightLeft className="w-3.5 h-3.5" />,
  deal_created:  <Plus className="w-3.5 h-3.5" />,
  followup_set:  <Calendar className="w-3.5 h-3.5" />,
  called:        <Phone className="w-3.5 h-3.5" />,
  whatsapped:    <Send className="w-3.5 h-3.5" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  note:          'bg-indigo-100 text-indigo-600',
  stage_changed: 'bg-amber-100 text-amber-600',
  deal_created:  'bg-green-100 text-green-600',
  followup_set:  'bg-blue-100 text-blue-600',
  called:        'bg-slate-100 text-slate-600',
  whatsapped:    'bg-emerald-100 text-emerald-600',
};

function activityLabel(activity: DealActivity): string {
  if (activity.content?.trim()) return activity.content;

  switch (activity.type) {
    case 'note':
      return activity.content ?? 'Note added';

    case 'stage_changed': {
      const fromStage = activity.meta?.from_stage ?? activity.meta?.from;
      const toStage   = activity.meta?.to_stage   ?? activity.meta?.to;
      const fromLabel =
        typeof fromStage === 'string' && fromStage in STAGE_CONFIG
          ? STAGE_CONFIG[fromStage as Stage].label
          : '?';
      const toLabel =
        typeof toStage === 'string' && toStage in STAGE_CONFIG
          ? STAGE_CONFIG[toStage as Stage].label
          : '?';
      return `Moved from ${fromLabel} to ${toLabel}.`;
    }

    case 'deal_created':
      return 'Deal created';

    case 'followup_set': {
      const oldDate = activity.meta?.old_followup_date;
      const newDate = activity.meta?.new_followup_date ?? activity.meta?.date;
      if (typeof newDate === 'string' && typeof oldDate === 'string') {
        return `Follow-up updated from ${formatDate(oldDate)} to ${formatDate(newDate)}.`;
      }
      if (typeof newDate === 'string') return `Follow-up set for ${formatDate(newDate)}.`;
      if (typeof oldDate === 'string') return 'Follow-up cleared.';
      return 'Follow-up updated';
    }

    case 'called':
      return `Called ${activity.meta?.client ?? 'client'}`;

    case 'whatsapped':
      return `WhatsApp sent to ${activity.meta?.client ?? 'client'}`;

    default:
      return 'Activity logged';
  }
}

// ---------------------------------------------------------------------------
// ActivityTimeline
//
// Realtime strategy:
//   - subscribeToActivities is called on mount with the current dealId.
//   - unsubscribeFromActivities is called on unmount.
//   - The subscription is scoped to this one deal so we are not holding open
//     a channel when the sheet is closed.
//   - If the user opens a different deal while this sheet is somehow still
//     mounted (edge case), the store's subscribeToActivities call cleans up
//     the previous channel before opening a new one.
// ---------------------------------------------------------------------------
interface Props {
  dealId: string;
}

export function ActivityTimeline({ dealId }: Props) {
  const { activities, loading, fetchActivities, addActivity, subscribeToActivities, unsubscribeFromActivities } =
    useActivitiesStore();

  const dealActivities = activities[dealId] ?? [];
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch existing activities then open the realtime channel.
    fetchActivities(dealId);
    subscribeToActivities(dealId);

    // On unmount (sheet closed), remove the channel.
    return () => {
      unsubscribeFromActivities();
    };
    // dealId is stable for the lifetime of an open sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  async function handleAddNote() {
    const trimmed = note.trim();
    if (!trimmed) return;
    setSaving(true);
    await addActivity({ dealId, type: 'note', content: trimmed });
    setNote('');
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Add note input */}
      <div className="space-y-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder:text-slate-400 resize-none"
        />
        <button
          onClick={handleAddNote}
          disabled={!note.trim() || saving}
          className="w-full py-2 rounded-xl bg-green-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Note'}
        </button>
      </div>

      {/* Timeline list */}
      {loading && dealActivities.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : dealActivities.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          No activity yet — add a note or make changes to this deal
        </p>
      ) : (
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-100" />

          <div className="space-y-4">
            {dealActivities.map((activity) => (
              <div key={activity.id} className="flex gap-3 relative">
                <div
                  className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    ACTIVITY_COLORS[activity.type] ?? 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {ACTIVITY_ICONS[activity.type]}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm text-slate-700 leading-snug">
                    {activityLabel(activity)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}