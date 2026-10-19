import { type AuthChangeEvent, type Session, type User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase, supabaseConfigError } from '@/lib/supabase';
import { formatAuthError } from '@/lib/utils';
import type { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

let authSubscription: { unsubscribe: () => void } | null = null;

const mapUser = (user: User | null): AuthUser | null => {
  if (!user?.email) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
};

const handleAuthState = (set: (partial: Partial<AuthState>) => void, session: Session | null) => {
  set({
    user: mapUser(session?.user ?? null),
    loading: false,
    initialized: true,
  });
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  initialize: async () => {
    if (supabaseConfigError || !supabase) {
      set({ initialized: true, loading: false, user: null });
      return;
    }

    if (authSubscription) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      handleAuthState(set, session);
      return;
    }

    set({ loading: true });

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      set({ loading: false, initialized: true });
      throw error;
    }

    handleAuthState(set, session);

    authSubscription = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        handleAuthState(set, nextSession);
      },
    ).data.subscription;
  },
  signIn: async (email, password) => {
    if (!supabase) {
      throw new Error(supabaseConfigError ?? 'Supabase is not configured');
    }

    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      set({ loading: false });
      throw new Error(formatAuthError(error.message));
    }

    set({ loading: false });
  },
  signUp: async (email, password) => {
    if (!supabase) {
      throw new Error(supabaseConfigError ?? 'Supabase is not configured');
    }

    set({ loading: true });
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      set({ loading: false });
      throw new Error(formatAuthError(error.message));
    }

    set({ loading: false });
  },
  signOut: async () => {
    if (!supabase) {
      set({ user: null, loading: false });
      return;
    }

    set({ loading: true });
    const { error } = await supabase.auth.signOut();

    if (error) {
      set({ loading: false });
      throw new Error(error.message);
    }

    set({ user: null, loading: false });
  },
}));
