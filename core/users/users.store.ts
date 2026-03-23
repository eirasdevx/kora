"use client";

import { create } from "zustand";
import type { PasswordDigest } from "@/core/security/passwords";

export type UserRole = "Admin" | "Gestor" | "Lector";
export type UserStatus = "Activo" | "Pendiente";

export type UserPreferences = {
  language: string;
  timezone: string;
  notifications: {
    updates: boolean;
    email: boolean;
    browser: boolean;
  };
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorVerifiedAt?: string;
};

export type UserPermissions = {
  modules: {
    accounting: boolean;
    events: boolean;
    contacts: boolean;
    documents: boolean;
  };
  actions: {
    view: boolean;
    edit: boolean;
    delete: boolean;
  };
};

export type SecurityActivityEntry = {
  id: string;
  action: string;
  device: string;
  location: string;
  timestamp: string;
};

export type UserAccount = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  phone?: string;
  dni?: string;
  email: string;
  passwordDigest?: PasswordDigest;
  password?: string;
  role: UserRole;
  status: UserStatus;
  lastAccessAt: string | null;
  permissions?: UserPermissions;
  preferences?: UserPreferences;
  securityActivity?: SecurityActivityEntry[];
};

interface UsersState {
  companyCode: string | null;
  users: UserAccount[];
  hydrateUsers: (payload: {
    companyCode: string | null;
    users: UserAccount[];
  }) => void;
  ensureSeed: (companyCode: string | null, admin: unknown) => void;
  addUser: (payload: {
    firstName: string;
    lastName: string;
    dni: string;
    email: string;
    passwordDigest: PasswordDigest;
    role: UserRole;
    status?: UserStatus;
    permissions?: UserPermissions;
    photoUrl?: string;
  }) => void;
  updateUser: (id: string, updates: Partial<UserAccount>) => void;
  removeUser: (id: string) => void;
  resetUsers: () => void;
}

const createUserId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createDefaultPermissions = (): UserPermissions => ({
  modules: {
    accounting: true,
    events: true,
    contacts: true,
    documents: true,
  },
  actions: {
    view: true,
    edit: true,
    delete: false,
  },
});

export const createDefaultPreferences = (): UserPreferences => ({
  language: "es",
  timezone: "(GMT+01:00) Madrid",
  notifications: {
    updates: true,
    email: true,
    browser: false,
  },
  twoFactorEnabled: false,
  twoFactorSecret: undefined,
  twoFactorVerifiedAt: undefined,
});

const LANGUAGE_ALIASES: Record<string, string> = {
  es: "es",
  "es-419": "es-419",
  "español (españa)": "es",
  "espanol (espana)": "es",
  "español (latam)": "es-419",
  "espanol (latam)": "es-419",
  galego: "gl",
  gallego: "gl",
  euskara: "eu",
  euskera: "eu",
  català: "ca",
  catalan: "ca",
  "catalán": "ca",
  valencià: "va",
  valenciano: "va",
  "english (us)": "en",
  "inglés (us)": "en",
  "ingles (us)": "en",
};

export const normalizeLanguage = (value?: string): string => {
  if (!value) return "es";
  return LANGUAGE_ALIASES[value.toLowerCase()] ? value;
};

const normalizeUser = (user: UserAccount): UserAccount => {
  const composedName =
    `${user.firstName ? ""} ${user.lastName ? ""}`.trim() ||
    user.name?.trim() ||
    "Usuario";
  const parts = composedName.split(" ").filter(Boolean);
  const basePermissions = user.permissions ? createDefaultPermissions();
  const basePreferences = createDefaultPreferences();

  const permissions =
    user.role === "Admin"
      ? {
          modules: {
            accounting: true,
            events: true,
            contacts: true,
            documents: true,
          },
          actions: {
            view: false,
            edit: true,
            delete: true,
          },
        }
      : basePermissions;

  return {
    ...user,
    name: composedName,
    firstName: user.firstName ? parts[0] ? "",
    lastName: user.lastName ? parts.slice(1).join(" "),
    dni: user.dni ? "",
    permissions,
    preferences: {
      ...basePreferences,
      ...(user.preferences ? {}),
      language: normalizeLanguage(
        user.preferences?.language ? basePreferences.language
      ),
      notifications: {
        ...basePreferences.notifications,
        ...(user.preferences?.notifications ? {}),
      },
    },
    password: user.passwordDigest ? undefined : user.password,
  };
};

export const useUsersStore = create<UsersState>((set) => ({
  companyCode: null,
  users: [],
  hydrateUsers: ({ companyCode, users }) =>
    set({
      companyCode,
      users: users.map(normalizeUser),
    }),
  ensureSeed: () => undefined,
  addUser: ({
    firstName,
    lastName,
    dni,
    email,
    passwordDigest,
    role,
    status,
    permissions,
    photoUrl,
  }) =>
    set((state) => ({
      users: [
        normalizeUser({
          id: createUserId(),
          firstName,
          lastName,
          dni,
          email,
          passwordDigest,
          role,
          status: status ? "Pendiente",
          photoUrl,
          lastAccessAt: null,
          permissions: permissions ? createDefaultPermissions(),
        }),
        ...state.users,
      ],
    })),
  updateUser: (id, updates) =>
    set((state) => ({
      users: state.users.map((user) =>
        user.id === id ? normalizeUser({ ...user, ...updates }) : user
      ),
    })),
  removeUser: (id) =>
    set((state) => ({
      users: state.users.filter((user) => user.id !== id),
    })),
  resetUsers: () =>
    set({
      companyCode: null,
      users: [],
    }),
}));
