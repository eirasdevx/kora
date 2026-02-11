"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SessionMode = "guest" | "authenticated";

export type AdminAccount = {
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  password: string;
};

export type AssociationRepresentative = {
  id: string;
  role: string;
  name: string;
  email?: string;
  phone?: string;
};

export type AssociationProfile = {
  name: string;
  logoUrl?: string;
  taxId?: string;
  contactEmail?: string;
  phone?: string;
  location?: string;
  address?: string;
  representatives?: AssociationRepresentative[];
};

interface SessionState {
  mode: SessionMode | null;
  association: AssociationProfile | null;
  admin: AdminAccount | null;
  companyCode: string | null;
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  setAssociation: (association: AssociationProfile | null) => void;
  registerAdmin: (payload: {
    admin: AdminAccount;
    association: AssociationProfile;
    companyCode: string;
  }) => void;
  setGuest: () => void;
  setAuthenticated: () => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      mode: null,
      association: null,
      admin: null,
      companyCode: null,
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),
      setAssociation: (association) => set({ association }),
      registerAdmin: ({ admin, association, companyCode }) =>
        set({
          admin,
          association,
          companyCode,
          mode: null,
        }),
      setGuest: () => set({ mode: "guest" }),
      setAuthenticated: () => set({ mode: "authenticated" }),
      logout: () => set({ mode: null }),
    }),
    {
      name: "kora-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        association: state.association,
        admin: state.admin,
        companyCode: state.companyCode,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
