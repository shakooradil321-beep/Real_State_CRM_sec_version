import { create } from 'zustand';
import {

  getAgencyById,
  getAgencyMembers,
  getAgencySettings,
  getCurrentMembership,
  updateAgencySettings as apiUpdateAgencySettings,
} from '@/lib/agency';
import {
  createAgency as apiCreateAgency,
  type CreateAgencyPayload,
} from '@/lib/api/createAgency';
import { canCreateAgency } from '@/lib/admin';
import {
  listInvitations,
  createInvitation,
  revokeInvitation,
  type AgencyInvitation,
} from '@/lib/api/invitationsApi';
import { useAuthStore } from '@/store/authStore';
import type { Agency, AgencyMembership, AgencySettings, AgencySettingsUpdate } from '@/types';

interface AgencyState {
  agency: Agency | null;
  membership: AgencyMembership | null;
  settings: AgencySettings | null;
  members: AgencyMembership[];
  // Pending invitations — only populated for agency owners via fetchInvitations.
  invitations: AgencyInvitation[];
  initialized: boolean;
  loading: boolean;
  error: string | null;

  fetchAgencyContext: () => Promise<void>;
  fetchAgencyMembers: () => Promise<void>;
  fetchAgencySettings: () => Promise<void>;
  createAgency: (payload: CreateAgencyPayload) => Promise<Agency>;
  updateAgencySettings: (payload: AgencySettingsUpdate) => Promise<void>;

  // Invitation actions — owner only.
  fetchInvitations: () => Promise<void>;
  inviteAgent: (email: string) => Promise<AgencyInvitation>;
  revokeInvitation: (invitationId: string) => Promise<void>;

  reset: () => void;
}

export const useAgencyStore = create<AgencyState>((set, get) => ({
  agency: null,
  membership: null,
  settings: null,
  members: [],
  invitations: [],
  initialized: false,
  loading: false,
  error: null,

  fetchAgencyContext: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ loading: true, error: null });
    try {
      const membership = await getCurrentMembership(user.id);

      if (!membership) {
        set({
          membership: null,
          agency: null,
          settings: null,
          initialized: true,
          loading: false,
        });
        return;
      }

      const [agency, settings] = await Promise.all([
        getAgencyById(membership.agency_id),
        getAgencySettings(membership.agency_id),
      ]);

      set({ membership, agency, settings, initialized: true, loading: false });
    } catch (err) {
      set({
        initialized: true,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load agency context.',
      });
    }
  },

  fetchAgencyMembers: async () => {
    const { agency } = get();
    if (!agency) return;

    set({ error: null });
    try {
      const members = await getAgencyMembers(agency.id);
      set({ members });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load team members.' });
    }
  },

  fetchAgencySettings: async () => {
    const { agency } = get();
    if (!agency) return;

    set({ error: null });
    try {
      const settings = await getAgencySettings(agency.id);
      set({ settings });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load agency settings.' });
    }
  },

  createAgency: async (payload) => {
    const user = useAuthStore.getState().user;
    if (!user) throw new Error('You must be signed in.');
    if (!canCreateAgency(user.email)) {
      throw new Error('Only the admin account can create agencies.');
    }

    set({ loading: true, error: null });
    try {
      const agency = await apiCreateAgency({
        name: payload.name.trim(),
        owner_user_id: payload.owner_user_id,
      });
      await get().fetchAgencyContext();
      set({ agency, loading: false });
      return agency;
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to create agency.',
      });
      throw err;
    }
  },

  updateAgencySettings: async (payload) => {
    const { agency } = get();
    if (!agency) throw new Error('No agency loaded.');

    set({ error: null });
    try {
      const settings = await apiUpdateAgencySettings(agency.id, payload);
      set({ settings });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update settings.' });
      throw err;
    }
  },

  // -------------------------------------------------------------------------
  // Invitation actions
  // -------------------------------------------------------------------------

  fetchInvitations: async () => {
    set({ error: null });
    try {
      const invitations = await listInvitations();
      set({ invitations });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load invitations.' });
    }
  },

  inviteAgent: async (email) => {
    set({ error: null });
    try {
      const invitation = await createInvitation({ email });
      // Prepend to local list so the UI reflects it immediately.
      set((s) => ({ invitations: [invitation, ...s.invitations] }));
      return invitation;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to send invitation.' });
      throw err;
    }
  },

  revokeInvitation: async (invitationId) => {
    set({ error: null });
    try {
      await revokeInvitation(invitationId);
      // Remove from local list immediately.
      set((s) => ({
        invitations: s.invitations.filter((inv) => inv.id !== invitationId),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to revoke invitation.' });
      throw err;
    }
  },

  reset: () => {
    set({
      agency: null,
      membership: null,
      settings: null,
      members: [],
      invitations: [],
      initialized: false,
      loading: false,
      error: null,
    });
  },
}));
