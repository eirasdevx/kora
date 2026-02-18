"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  type PasswordDigest,
  createPasswordDigest,
} from "@/core/security/passwords";

const COMPANY_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const createCompanyCode = () => {
  const pick = () =>
    COMPANY_CODE_CHARS[Math.floor(Math.random() * COMPANY_CODE_CHARS.length)];
  const segment = (size: number) =>
    Array.from({ length: size }, () => pick()).join("");
  return `KORA-${segment(4)}-${segment(4)}`;
};

const createAssociationId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export type SessionMode = "guest" | "authenticated";

export type AdminAccount = {
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  passwordDigest?: PasswordDigest;
  password?: string;
};

export type AssociationRepresentative = {
  id: string;
  role: string;
  name: string;
  email?: string;
  phone?: string;
};

export type AssociationSocialLinks = {
  instagram?: string;
  facebook?: string;
  x?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
};

export type AssociationSocialStats = {
  followers: number;
  views: number;
  likes: number;
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
  socialLinks?: AssociationSocialLinks;
  socialStats?: AssociationSocialStats;
};

export type AssociationEntry = {
  id: string;
  profile: AssociationProfile;
  companyCode: string;
};

const sanitizeAdmin = (admin: AdminAccount | null): AdminAccount | null => {
  if (!admin) return null;
  if (admin.passwordDigest && admin.password) {
    const { password, ...rest } = admin;
    return rest;
  }
  return admin;
};

interface SessionState {
  mode: SessionMode | null;
  association: AssociationProfile | null;
  associations: AssociationEntry[];
  activeAssociationId: string | null;
  admin: AdminAccount | null;
  companyCode: string | null;
  activeUserId: string | null;
  hydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  setAdmin: (admin: AdminAccount | null) => void;
  setAssociation: (association: AssociationProfile | null) => void;
  addAssociation: (association: AssociationProfile) => AssociationEntry;
  setActiveAssociation: (id: string) => void;
  ensureAssociations: () => void;
  removeAssociation: (id: string) => void;
  registerAdmin: (payload: {
    admin: AdminAccount;
    association: AssociationProfile;
    companyCode: string;
  }) => void;
  setGuest: () => void;
  setAuthenticated: (activeUserId?: string | null) => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      mode: null,
      association: null,
      associations: [],
      activeAssociationId: null,
      admin: null,
      companyCode: null,
      activeUserId: null,
      hydrated: false,
      setHydrated: (hydrated) => set({ hydrated }),
      setAdmin: (admin) => set({ admin: sanitizeAdmin(admin) }),
      setAssociation: (association) =>
        set((state) => {
          if (!association) {
            return { association: null };
          }
          if (!state.activeAssociationId) {
            return { association };
          }
          const associations = state.associations.map((entry) =>
            entry.id === state.activeAssociationId
              ? { ...entry, profile: association }
              : entry
          );
          return { association, associations };
        }),
      addAssociation: (association) => {
        const entry = {
          id: createAssociationId(),
          profile: association,
          companyCode: createCompanyCode(),
        };
        set((state) => ({
          associations: [...state.associations, entry],
          association: entry.profile,
          companyCode: entry.companyCode,
          activeAssociationId: entry.id,
        }));
        return entry;
      },
      setActiveAssociation: (id) =>
        set((state) => {
          const entry = state.associations.find((item) => item.id === id);
          if (!entry) return {};
          return {
            activeAssociationId: id,
            association: entry.profile,
            companyCode: entry.companyCode,
          };
        }),
      ensureAssociations: () =>
        set((state) => {
          if (state.associations.length > 0) return {};
          if (!state.association) return {};
          const entry = {
            id: createAssociationId(),
            profile: state.association,
            companyCode: state.companyCode ?? createCompanyCode(),
          };
          return {
            associations: [entry],
            activeAssociationId: entry.id,
            association: entry.profile,
            companyCode: entry.companyCode,
          };
        }),
      removeAssociation: (id) =>
        set((state) => {
          const remaining = state.associations.filter(
            (entry) => entry.id !== id
          );
          if (remaining.length === 0) {
            return {
              associations: [],
              activeAssociationId: null,
              association: null,
              companyCode: null,
            };
          }
          if (state.activeAssociationId === id) {
            const next = remaining[0];
            return {
              associations: remaining,
              activeAssociationId: next.id,
              association: next.profile,
              companyCode: next.companyCode,
            };
          }
          return { associations: remaining };
        }),
      registerAdmin: ({ admin, association, companyCode }) =>
        set(() => {
          const entry = {
            id: createAssociationId(),
            profile: association,
            companyCode,
          };
          return {
            admin: sanitizeAdmin(admin),
            association,
            associations: [entry],
            activeAssociationId: entry.id,
            companyCode,
            mode: null,
            activeUserId: null,
          };
        }),
      setGuest: () => set({ mode: "guest", activeUserId: null }),
      setAuthenticated: (activeUserId = null) =>
        set({ mode: "authenticated", activeUserId }),
      logout: () => set({ mode: null, activeUserId: null }),
    }),
    {
      name: "kora-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        association: state.association,
        associations: state.associations,
        activeAssociationId: state.activeAssociationId,
        admin: sanitizeAdmin(state.admin),
        companyCode: state.companyCode,
        activeUserId: state.activeUserId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        state?.ensureAssociations();
        if (state?.admin) {
          state.setAdmin(state.admin);
          if (state.admin.password && !state.admin.passwordDigest) {
            const legacyAdmin = state.admin;
            void (async () => {
              try {
                const passwordDigest = await createPasswordDigest(
                  legacyAdmin.password ?? ""
                );
                state.setAdmin({ ...legacyAdmin, passwordDigest });
              } catch (error) {
                console.error(error);
              }
            })();
          }
        }
      },
    }
  )
);
