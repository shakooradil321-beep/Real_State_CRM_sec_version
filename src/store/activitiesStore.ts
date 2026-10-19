import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { logDealActivity } from '@/lib/activityLogger';
import { supabase } from '@/lib/supabase';
import type { ActivityType, DealActivity } from '@/types';

interface ActivitiesStore {
  activities: Record<string, DealActivity[]>; // keyed by deal_id
  loading: boolean;

  // Realtime — only one deal is subscribed at a time (the open detail sheet).
  // The channel reference is kept here so ActivityTimeline can unsubscribe
  // when it unmounts.
  _realtimeChannel: RealtimeChannel | null;

  ingestActivity: (activity: DealActivity) => void;
  fetchActivities: (dealId: string) => Promise<void>;
  addActivity: (params: {
    dealId: string;
    type: ActivityType;
    content?: string;
    meta?: Record<string, unknown>;
  }) => Promise<void>;

  // Realtime lifecycle — called by ActivityTimeline on mount / unmount.
  subscribeToActivities: (dealId: string) => void;
  unsubscribeFromActivities: () => void;
}

export const useActivitiesStore = create<ActivitiesStore>((set, get) => ({
  activities: {},
  loading: false,
  _realtimeChannel: null,

  ingestActivity: (activity) => {
    set((s) => ({
      activities: {
        ...s.activities,
        [activity.deal_id]: [
          activity,
          // Deduplicate: if this id is already in cache (e.g. from optimistic
          // insert), replace it rather than prepend a duplicate.
          ...(s.activities[activity.deal_id] ?? []).filter(
            (entry) => entry.id !== activity.id,
          ),
        ],
      },
    }));
  },

  fetchActivities: async (dealId) => {
    if (!supabase) {
      set({ loading: false });
      return;
    }

    set({ loading: true });
    const { data, error } = await supabase
      .from('deal_activities')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set((s) => ({
        activities: { ...s.activities, [dealId]: data as DealActivity[] },
        loading: false,
      }));
    } else {
      set({ loading: false });
    }
  },

  addActivity: async ({ dealId, type, content, meta }) => {
    const activity = await logDealActivity({ dealId, type, content, meta });
    // ingestActivity deduplicates so the realtime event arriving shortly
    // after will not create a duplicate row in the UI.
    get().ingestActivity(activity);
  },

  // -------------------------------------------------------------------------
  // subscribeToActivities
  //
  // Opens a Supabase Realtime channel filtered to INSERT events on
  // deal_activities for the given dealId. Only one subscription is held at a
  // time — calling this again while a channel is open will first clean up the
  // previous one.
  //
  // Scope: this is intentionally narrow (one deal) because:
  //   1. We only need live updates when the detail sheet is open.
  //   2. A global subscription on deal_activities would receive every agent's
  //      activity across the whole agency, which is both noisy and wasteful.
  //
  // FUTURE: If you add an agency-wide activity feed (e.g. an owner dashboard
  // showing all recent activity), you can add a separate global channel here
  // without changing this per-deal subscription logic.
  // -------------------------------------------------------------------------
  subscribeToActivities: (dealId) => {
    if (!supabase) return;

    // Clean up any existing channel first (e.g. user switched between deals).
    const existing = get()._realtimeChannel;
    if (existing) {
      void supabase.removeChannel(existing);
    }

    const channel = supabase
      .channel(`deal_activities:${dealId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deal_activities',
          filter: `deal_id=eq.${dealId}`,
        },
        (payload) => {
          // Append directly into cache — matches the agreed strategy (option a).
          // ingestActivity deduplicates so manually added notes (which are
          // already in cache from addActivity) are not shown twice.
          get().ingestActivity(payload.new as DealActivity);
        },
      )
      .subscribe();

    set({ _realtimeChannel: channel });
  },

  unsubscribeFromActivities: () => {
    if (!supabase) return;

    const channel = get()._realtimeChannel;
    if (channel) {
      void supabase.removeChannel(channel);
      set({ _realtimeChannel: null });
    }
  },
}));