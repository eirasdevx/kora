"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SessionMode = "guest" | "authenticated";

export type AssociationProfile = {
  name: string;
  taxId?: string;
  contactEmail?: string;
  phone?: string;
  location?: string;
  address?: string;
};

interface SessionState {
  mode: SessionMode | null;
  association: AssociationProfile | null;
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  setAssociation: (association: AssociationProfile | null) => void;
  setGuest: (association?: AssociationProfile) => void;
  setAuthenticated: () => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      mode: null,
      association: null,
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),
      setAssociation: (association) => set({ association }),
      setGuest: (association) =>
        set((state) => ({
          mode: "guest",
          association: association ?? state.association,
        })),
      setAuthenticated: () => set({ mode: "authenticated", association: null }),
      logout: () => set({ mode: null, association: null }),
    }),
    {
      name: "kora-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        association: state.association,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
