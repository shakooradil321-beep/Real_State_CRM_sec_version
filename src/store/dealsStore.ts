import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth } from 'date-fns';
import { type RealtimeChannel } from '@supabase/supabase-js';
import { create } from 'zustand';

import { insertDealActivity } from '@/lib/activityLogger';
import { closeDeal as closeDealRequest, type CloseDealPayload } from '@/lib/api/closeDeal';
import { getDaysUntil } from '@/lib/formatters';
import { supabase, supabaseConfigError } from '@/lib/supabase';
import { CONNECTION_LOST_MESSAGE, isNetworkErrorMessage } from '@/lib/utils';
import { useActivitiesStore } from '@/store/activitiesStore';
import { useAgencyStore } from '@/store/agencyStore';
import { useAuthStore } from '@/store/authStore';
import {
  STAGE_CONFIG,
  type AgencyMembership,
  type AuthUser,
  type Deal,
  type DealInsert,
  type DealStats,
  type DealUpdate,
  type FollowUpItem,
  type Stage,
} from '@/types';

interface DealsState {
  deals: Deal[];
  loading: boolean;
  initialized: boolean;
  error: string | null;
  subscriptions: RealtimeChannel[];
  fetchDeals: () => Promise<void>;
  addDeal: (data: DealInsert) => Promise<Deal>;
  closeDeal: (id: string, payload: CloseDealPayload) => Promise<Deal>;
  updateDeal: (id: string, data: DealUpdate) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;
  restoreDeal: (deal: Deal) => Promise<Deal>;
  moveDeal: (id: string, newStage: Stage, newSortOrder: number) => Promise<void>;
  reorderDeals: (stageDeals: Deal[]) => Promise<void>;
  subscribeToDeals: () => void;
  unsubscribeFromDeals: () => void;
  reset: () => void;
  getDealsByStage: (stage: Stage) => Deal[];
  getFollowUpsToday: () => FollowUpItem[];
  getOverdueDeals: () => Deal[];
  getStats: () => DealStats;
}

const STAGE_ORDER: Stage[] = ['new_lead', 'visit', 'negotiation', 'closed'];

const normalizeDeal = (deal: Deal): Deal => ({
  ...deal,
  agency_id: deal.agency_id ?? null,
  property_id: deal.property_id ?? null,
  notes: deal.notes ?? null,
  followup_date: deal.followup_date ?? null,
  closed_at: deal.closed_at ?? null,
  source: deal.source ?? null,
  closing_amount: deal.closing_amount ?? null,
  closing_disposition: deal.closing_disposition ?? null,
});

const sortDeals = (deals: Deal[]): Deal[] =>
  [...deals].sort((left, right) => {
    const stageDiff = STAGE_ORDER.indexOf(left.stage) - STAGE_ORDER.indexOf(right.stage);
    if (stageDiff !== 0) {
      return stageDiff;
    }

    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });

const upsertDeal = (deals: Deal[], incoming: Deal): Deal[] => {
  const normalizedIncoming = normalizeDeal(incoming);
  const exists = deals.some((deal) => deal.id === incoming.id);
  return sortDeals(exists ? deals.map((deal) => (deal.id === normalizedIncoming.id ? normalizedIncoming : deal)) : [normalizedIncoming, ...deals]);
};

const requireClient = () => {
  const user = useAuthStore.getState().user;

  if (!supabase || supabaseConfigError) {
    throw new Error(supabaseConfigError ?? 'Supabase is not configured');
  }

  if (!user) {
    throw new Error('You must be signed in to manage deals.');
  }

  return { client: supabase, user };
};

const mapStoreError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : 'Unable to complete request.';
  return isNetworkErrorMessage(message) ? CONNECTION_LOST_MESSAGE : message;
};

const formatFollowUpActivityDate = (date: string) => format(parseISO(date), 'MMMM d, yyyy');

const logActivityFailure = (action: string, error: unknown) => {
  console.error(`Failed to log ${action} activity.`, error);
};

const dealAccessible = (
  deal: Deal,
  user: AuthUser | null,
  membership: AgencyMembership | null,
): boolean => {
  if (!user) {
    return false;
  }

  if (deal.agency_id === null) {
    return deal.user_id === user.id;
  }

  if (deal.user_id === user.id) {
    return true;
  }

  return membership?.agency_id === deal.agency_id && membership.role === 'owner';
};

export const useDealsStore = create<DealsState>((set, get) => ({
  deals: [],
  loading: false,
  initialized: false,
  error: null,
  subscriptions: [],
  fetchDeals: async () => {
    try {
      const { client } = requireClient();
      set({ loading: true, error: null });

      const { data, error } = await client
        .from('deals')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      set({
        deals: sortDeals(((data ?? []) as Deal[]).map(normalizeDeal)),
        loading: false,
        initialized: true,
        error: null,
      });
    } catch (error) {
      set({ loading: false, initialized: true, error: mapStoreError(error) });
      throw error;
    }
  },
  addDeal: async (data) => {
    const { client, user } = requireClient();
    const now = new Date().toISOString();
    const stageDeals = get().getDealsByStage('new_lead');
    const nextSortOrder = stageDeals.length > 0 ? Math.max(...stageDeals.map((deal) => deal.sort_order)) + 1 : 0;
    const tempId = `temp-${Date.now()}`;

    const optimisticDeal: Deal = {
      ...data,
      id: tempId,
      agency_id: data.agency_id ?? null,
      user_id: user.id,
      property_id: data.property_id ?? null,
      stage: 'new_lead',
      sort_order: nextSortOrder,
      created_at: now,
      updated_at: now,
      closed_at: null,
      source: data.source ?? null,
      closing_amount: data.closing_amount ?? null,
      closing_disposition: data.closing_disposition ?? null,
      notes: data.notes || null,
      followup_date: data.followup_date || null,
    };

    set({ deals: upsertDeal(get().deals, optimisticDeal), error: null });

    const { data: created, error } = await client
      .from('deals')
      .insert({
        ...data,
        user_id: user.id,
        source: data.source ?? null,
        stage: 'new_lead',
        sort_order: nextSortOrder,
        notes: data.notes || null,
        followup_date: data.followup_date || null,
      })
      .select()
      .single();

    if (error || !created) {
      set({ deals: get().deals.filter((deal) => deal.id !== tempId), error: mapStoreError(error) });
      throw error ?? new Error('Unable to create deal.');
    }

    const createdDeal = normalizeDeal(created as Deal);
    set({ deals: sortDeals(get().deals.filter((deal) => deal.id !== tempId).concat(createdDeal)), error: null });

    try {
      const activity = await insertDealActivity(client, {
        dealId: createdDeal.id,
        userId: user.id,
        type: 'deal_created',
        content: 'Deal created.',
        meta: { stage: createdDeal.stage },
      });
      useActivitiesStore.getState().ingestActivity(activity);
    } catch (error) {
      logActivityFailure('deal creation', error);
    }

    return createdDeal;
  },
  closeDeal: async (id, payload) => {
    const existing = get().deals.find((deal) => deal.id === id);

    if (!existing) {
      throw new Error('Deal not found.');
    }

    if (existing.stage === 'closed') {
      throw new Error('This deal is already closed.');
    }

    set({ error: null });

    try {
      const response = await closeDealRequest(id, payload);
      const closedDeal = normalizeDeal(response.deal);
      set({ deals: upsertDeal(get().deals, closedDeal), error: null });
      return closedDeal;
    } catch (error) {
      set({ error: mapStoreError(error) });
      throw error;
    }
  },
  updateDeal: async (id, data) => {
    const { client, user } = requireClient();
    const previousDeals = get().deals;
    const existing = previousDeals.find((deal) => deal.id === id);

    if (!existing) {
      return;
    }

    if (data.stage === 'closed' && existing.stage !== 'closed') {
      throw new Error('Use the Close Deal workflow to move a deal into Closed.');
    }

    if (existing.stage === 'closed' && data.stage && data.stage !== 'closed') {
      throw new Error('Reopening a closed deal must run through the server-managed API.');
    }

    const optimisticDeal: Deal = {
      ...existing,
      ...data,
      notes: data.notes === undefined ? existing.notes : data.notes,
      followup_date: data.followup_date === undefined ? existing.followup_date : data.followup_date,
      updated_at: new Date().toISOString(),
    };

    set({ deals: upsertDeal(previousDeals, normalizeDeal(optimisticDeal)), error: null });

    const { data: updated, error } = await client
      .from('deals')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      set({ deals: previousDeals, error: mapStoreError(error) });
      throw error ?? new Error('Unable to update deal.');
    }

    const updatedDeal = normalizeDeal(updated as Deal);
    set({ deals: upsertDeal(get().deals, updatedDeal), error: null });

    if (existing.stage !== updatedDeal.stage) {
      try {
        const activity = await insertDealActivity(client, {
          dealId: updatedDeal.id,
          userId: user.id,
          type: 'stage_changed',
          content: `Moved from ${STAGE_CONFIG[existing.stage].label} to ${STAGE_CONFIG[updatedDeal.stage].label}.`,
          meta: {
            from_stage: existing.stage,
            to_stage: updatedDeal.stage,
          },
        });
        useActivitiesStore.getState().ingestActivity(activity);
      } catch (activityError) {
        logActivityFailure('stage change', activityError);
      }
    }

    if (existing.followup_date !== updatedDeal.followup_date) {
      const content =
        updatedDeal.followup_date && existing.followup_date
          ? `Follow-up updated to ${formatFollowUpActivityDate(updatedDeal.followup_date)}.`
          : updatedDeal.followup_date
            ? `Follow-up set for ${formatFollowUpActivityDate(updatedDeal.followup_date)}.`
            : 'Follow-up cleared.';

      try {
        const activity = await insertDealActivity(client, {
          dealId: updatedDeal.id,
          userId: user.id,
          type: 'followup_set',
          content,
          meta: {
            old_followup_date: existing.followup_date,
            new_followup_date: updatedDeal.followup_date,
          },
        });
        useActivitiesStore.getState().ingestActivity(activity);
      } catch (activityError) {
        logActivityFailure('follow-up update', activityError);
      }
    }
  },
  deleteDeal: async (id) => {
    const { client } = requireClient();
    const previousDeals = get().deals;
    set({ deals: previousDeals.filter((deal) => deal.id !== id), error: null });

    const { error } = await client.from('deals').delete().eq('id', id);

    if (error) {
      set({ deals: previousDeals, error: mapStoreError(error) });
      throw error;
    }
  },
  restoreDeal: async (deal) => {
    const { client, user } = requireClient();
    const { data, error } = await client
      .from('deals')
      .insert({
        ...deal,
        user_id: user.id,
      })
      .select()
      .single();

    if (error || !data) {
      set({ error: mapStoreError(error) });
      throw error ?? new Error('Unable to restore deal.');
    }

    const restored = normalizeDeal(data as Deal);
    set({ deals: upsertDeal(get().deals, restored), error: null });
    return restored;
  },
  moveDeal: async (id, newStage, newSortOrder) => {
    const { client, user } = requireClient();
    const previousDeals = get().deals;
    const existing = previousDeals.find((deal) => deal.id === id);

    if (!existing) {
      return;
    }

    if (newStage === 'closed' && existing.stage !== 'closed') {
      throw new Error('Use the Close Deal workflow to move a deal into Closed.');
    }

    if (existing.stage === 'closed' && newStage !== 'closed') {
      throw new Error('Reopening a closed deal must run through the server-managed API.');
    }

    const optimisticDeal: Deal = {
      ...existing,
      stage: newStage,
      sort_order: newSortOrder,
      updated_at: new Date().toISOString(),
      closed_at: existing.closed_at,
    };

    set({ deals: upsertDeal(previousDeals, normalizeDeal(optimisticDeal)), error: null });

    const { data, error } = await client
      .from('deals')
      .update({ stage: newStage, sort_order: newSortOrder })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      set({ deals: previousDeals, error: mapStoreError(error) });
      throw error ?? new Error('Unable to move deal.');
    }

    const movedDeal = normalizeDeal(data as Deal);
    set({ deals: upsertDeal(get().deals, movedDeal), error: null });

    if (existing.stage !== movedDeal.stage) {
      try {
        const activity = await insertDealActivity(client, {
          dealId: movedDeal.id,
          userId: user.id,
          type: 'stage_changed',
          content: `Moved from ${STAGE_CONFIG[existing.stage].label} to ${STAGE_CONFIG[movedDeal.stage].label}.`,
          meta: {
            from_stage: existing.stage,
            to_stage: movedDeal.stage,
          },
        });
        useActivitiesStore.getState().ingestActivity(activity);
      } catch (activityError) {
        logActivityFailure('drag stage change', activityError);
      }
    }
  },
  reorderDeals: async (stageDeals) => {
    if (stageDeals.length === 0) {
      return;
    }

    const { client } = requireClient();
    const previousDeals = get().deals;
    const updates = stageDeals.map((deal, index) => ({ ...deal, sort_order: index }));
    const updateMap = new Map(updates.map((deal) => [deal.id, deal]));

    set({
      deals: sortDeals(previousDeals.map((deal) => updateMap.get(deal.id) ?? deal)),
      error: null,
    });

    const responses = await Promise.all(
      updates.map((deal) => client.from('deals').update({ sort_order: deal.sort_order, stage: deal.stage }).eq('id', deal.id)),
    );

    const failed = responses.find((response) => response.error);
    if (failed?.error) {
      set({ deals: previousDeals, error: mapStoreError(failed.error) });
      throw failed.error;
    }
  },
  subscribeToDeals: () => {
    const user = useAuthStore.getState().user;
    const membership = useAgencyStore.getState().membership;

    if (!supabase || !user || get().subscriptions.length > 0) {
      return;
    }

    const subscriptions: RealtimeChannel[] = [];

    const handleSubscriptionStatus = (status: string) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        set({ error: CONNECTION_LOST_MESSAGE });
      }

      if (status === 'SUBSCRIBED') {
        set({ error: null });
      }
    };

    const handleRealtimePayload = (payload: { eventType: string; new: unknown; old: unknown }) => {
      const currentUser = useAuthStore.getState().user;
      const currentMembership = useAgencyStore.getState().membership;

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const incoming = normalizeDeal(payload.new as Deal);

        if (!dealAccessible(incoming, currentUser, currentMembership)) {
          return;
        }

        set({ deals: upsertDeal(get().deals, incoming) });
        return;
      }

      if (payload.eventType === 'DELETE') {
        const deleted = payload.old as Partial<Deal>;

        if (!deleted.id || !get().deals.some((deal) => deal.id === deleted.id)) {
          return;
        }

        set({ deals: get().deals.filter((deal) => deal.id !== deleted.id) });
      }
    };

    subscriptions.push(
      supabase
        .channel(`deals-realtime-own-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'deals',
            filter: `user_id=eq.${user.id}`,
          },
          handleRealtimePayload,
        )
        .subscribe(handleSubscriptionStatus),
    );

    if (membership?.role === 'owner') {
      subscriptions.push(
        supabase
          .channel(`deals-realtime-agency-${membership.agency_id}-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'deals',
              filter: `agency_id=eq.${membership.agency_id}`,
            },
            handleRealtimePayload,
          )
          .subscribe(handleSubscriptionStatus),
      );
    }

    set({ subscriptions });
  },
  unsubscribeFromDeals: () => {
    const subscriptions = get().subscriptions;

    subscriptions.forEach((subscription) => {
      if (supabase) {
        void supabase.removeChannel(subscription);
      }
    });

    set({ subscriptions: [] });
  },
  reset: () => {
    get().unsubscribeFromDeals();
    set({ deals: [], loading: false, initialized: false, error: null });
  },
  getDealsByStage: (stage) =>
    get()
      .deals.filter((deal) => deal.stage === stage)
      .sort((left, right) => left.sort_order - right.sort_order),
  getFollowUpsToday: () =>
    get()
      .deals.filter((deal) => deal.stage !== 'closed' && Boolean(deal.followup_date) && getDaysUntil(deal.followup_date) <= 0)
      .map((deal) => {
        const daysUntil = getDaysUntil(deal.followup_date);
        return {
          deal,
          status: daysUntil < 0 ? 'overdue' : 'today',
          daysUntil,
        } satisfies FollowUpItem;
      })
      .sort((left, right) => left.daysUntil - right.daysUntil),
  getOverdueDeals: () =>
    get()
      .deals.filter((deal) => deal.stage !== 'closed' && Boolean(deal.followup_date) && getDaysUntil(deal.followup_date) < 0)
      .sort((left, right) => getDaysUntil(left.followup_date) - getDaysUntil(right.followup_date)),
  getStats: () => {
    const deals = get().deals;
    const range = { start: startOfMonth(new Date()), end: endOfMonth(new Date()) };

    return {
      totalActive: deals.filter((deal) => deal.stage !== 'closed').length,
      newLeads: deals.filter((deal) => deal.stage === 'new_lead').length,
      visits: deals.filter((deal) => deal.stage === 'visit').length,
      negotiations: deals.filter((deal) => deal.stage === 'negotiation').length,
      closedThisMonth: deals.filter((deal) => deal.closed_at && isWithinInterval(parseISO(deal.closed_at), range)).length,
    };
  },
}));
