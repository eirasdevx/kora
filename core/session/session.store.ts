"use client";

import { create } from "zustand";
import type { SessionBootstrapPayload } from "@/core/session/session-payload";
import type { PublicAssociationMessagingSettings } from "@/core/messaging/settings";
import type { PasswordDigest } from "@/core/security/passwords";
import {
  type AssociationAccountingSettings,
  getAssociationAccountingSettings,
} from "@/core/session/accounting-settings";
import {
  type AssociationMembershipSettings,
  getAssociationMembershipSettings,
} from "@/core/session/membership-settings";

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

export type AssociationProfile = {
  name: string;
  logoUrl?: string;
  taxId?: string;
  contactEmail?: string;
  phone?: string;
  location?: string;
  address?: string;
  representatives?: AssociationRepresentative[];
  membershipSettings?: AssociationMembershipSettings;
  accountingSettings?: AssociationAccountingSettings;
  messagingSettings?: PublicAssociationMessagingSettings;
};

export type AssociationEntry = {
  id: string;
  profile: AssociationProfile;
  companyCode: string;
};

const normalizeAssociationProfile = (
  association: AssociationProfile | null
): AssociationProfile | null => {
  if (!association) return null;

  return {
    ...association,
    membershipSettings: getAssociationMembershipSettings(association),
    accountingSettings: getAssociationAccountingSettings(association),
  };
};

const getAdminFromPayload = (
  payload: SessionBootstrapPayload | null
): AdminAccount | null => {
  const adminUser = payload?.users.find((user) => user.role === "Admin");
  if (!adminUser) {
    return null;
  }

  return {
    firstName: adminUser.firstName ?? "",
    lastName: adminUser.lastName ?? "",
    dni: adminUser.dni ?? "",
    email: adminUser.email,
  };
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
  hydrateFromServer: (payload: SessionBootstrapPayload | null) => void;
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

export const useSessionStore = create<SessionState>((set) => ({
  mode: null,
  association: null,
  associations: [],
  activeAssociationId: null,
  admin: null,
  companyCode: null,
  activeUserId: null,
  hydrated: false,
  setHydrated: (hydrated) => set({ hydrated }),
  hydrateFromServer: (payload) =>
    set(() => {
      if (!payload) {
        return {
          mode: null,
          association: null,
          associations: [],
          activeAssociationId: null,
          admin: null,
          companyCode: null,
          activeUserId: null,
          hydrated: true,
        };
      }

      return {
        mode: "authenticated",
        association: normalizeAssociationProfile(payload.association),
        associations: payload.associations.map((entry) => ({
          id: entry.id,
          companyCode: entry.companyCode,
          profile: normalizeAssociationProfile(entry.profile)!,
        })),
        activeAssociationId: payload.activeAssociationId,
        admin: getAdminFromPayload(payload),
        companyCode: payload.companyCode,
        activeUserId: payload.activeUserId,
        hydrated: true,
      };
    }),
  setAdmin: (admin) => set({ admin }),
  setAssociation: (association) =>
    set((state) => {
      const normalizedAssociation = normalizeAssociationProfile(association);
      if (!normalizedAssociation) {
        return {
          association: null,
        };
      }

      return {
        association: normalizedAssociation,
        associations: state.associations.map((entry) =>
          entry.id === state.activeAssociationId
            ? { ...entry, profile: normalizedAssociation }
            : entry
        ),
      };
    }),
  addAssociation: (association) => {
    const entry = {
      id: createAssociationId(),
      profile: normalizeAssociationProfile(association)!,
      companyCode: createCompanyCode(),
    };

    set((state) => ({
      associations: [...state.associations, entry],
      association: entry.profile,
      activeAssociationId: entry.id,
      companyCode: entry.companyCode,
    }));

    return entry;
  },
  setActiveAssociation: (id) =>
    set((state) => {
      const entry = state.associations.find((item) => item.id === id);
      if (!entry) {
        return {};
      }

      return {
        activeAssociationId: entry.id,
        association: entry.profile,
        companyCode: entry.companyCode,
      };
    }),
  ensureAssociations: () =>
    set((state) => {
      if (state.associations.length > 0 || !state.association) {
        return {};
      }

      const entry = {
        id: createAssociationId(),
        profile: normalizeAssociationProfile(state.association)!,
        companyCode: state.companyCode ?? createCompanyCode(),
      };

      return {
        associations: [entry],
        activeAssociationId: entry.id,
        companyCode: entry.companyCode,
      };
    }),
  removeAssociation: (id) =>
    set((state) => {
      const associations = state.associations.filter((entry) => entry.id !== id);

      if (associations.length === 0) {
        return {
          associations: [],
          association: null,
          activeAssociationId: null,
          companyCode: null,
        };
      }

      const next = associations[0];
      return {
        associations,
        association: next.profile,
        activeAssociationId: next.id,
        companyCode: next.companyCode,
      };
    }),
  registerAdmin: ({ admin, association, companyCode }) =>
    set(() => {
      const normalizedAssociation = normalizeAssociationProfile(association);
      const entry = {
        id: createAssociationId(),
        profile: normalizedAssociation!,
        companyCode,
      };

      return {
        admin,
        association: normalizedAssociation,
        associations: [entry],
        activeAssociationId: entry.id,
        companyCode,
        mode: "authenticated",
        activeUserId: null,
        hydrated: true,
      };
    }),
  setGuest: () =>
    set({
      mode: "guest",
      hydrated: true,
      association: null,
      associations: [],
      activeAssociationId: null,
      admin: null,
      companyCode: null,
      activeUserId: null,
    }),
  setAuthenticated: (activeUserId = null) =>
    set({
      mode: "authenticated",
      activeUserId,
      hydrated: true,
    }),
  logout: () =>
    set({
      mode: null,
      association: null,
      associations: [],
      activeAssociationId: null,
      admin: null,
      companyCode: null,
      activeUserId: null,
      hydrated: true,
    }),
}));
