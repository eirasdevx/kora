"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { type AdminAccount } from "@/core/session/session.store";

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
};

export type UserPermissions = {
  modules: {
    accounting: boolean;
    events: boolean;
    contacts: boolean;
    documents: boolean;
    social: boolean;
  };
  actions: {
    view: boolean;
    edit: boolean;
    delete: boolean;
  };
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
  password?: string;
  role: UserRole;
  status: UserStatus;
  lastAccessAt: string | null;
  permissions?: UserPermissions;
  preferences?: UserPreferences;
};

interface UsersState {
  companyCode: string | null;
  users: UserAccount[];
  ensureSeed: (companyCode: string | null, admin: AdminAccount | null) => void;
  addUser: (payload: {
    firstName: string;
    lastName: string;
    dni: string;
    email: string;
    password: string;
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
    social: true,
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
  twoFactorEnabled: true,
});

const LANGUAGE_ALIASES: Record<string, string> = {
  "es": "es",
  "es-419": "es-419",
  "español (españa)": "es",
  "espanol (espana)": "es",
  "español (latam)": "es-419",
  "espanol (latam)": "es-419",
  "galego": "gl",
  "gallego": "gl",
  "euskara": "eu",
  "euskera": "eu",
  "català": "ca",
  "catalan": "ca",
  "catalán": "ca",
  "valencià": "va",
  "valenciano": "va",
  "english (us)": "en",
  "inglés (us)": "en",
  "ingles (us)": "en",
};

export const normalizeLanguage = (value?: string): string => {
  if (!value) return "es";
  const key = value.toLowerCase();
  return LANGUAGE_ALIASES[key] ?? value;
};

const normalizeEnabled = (value?: string | boolean): boolean => {
  if (value === true) return true;
  if (value === "edit" || value === "read") return true;
  return false;
};

type LegacyModules = Partial<{
  accounting: string | boolean;
  events: string | boolean;
  contacts: string | boolean;
  documents: string | boolean;
  social: string | boolean;
  treasury: string | boolean;
}>;

const withDefaultPermissions = (
  permissions?: UserPermissions
): UserPermissions => {
  const defaults = createDefaultPermissions();
  const modules = (permissions?.modules ?? {}) as LegacyModules;
  const resolveEnabled = (value: unknown, fallback: boolean) => {
    if (value === null || value === undefined) return fallback;
    return normalizeEnabled(value as string | boolean);
  };

  const edit = permissions?.actions?.edit ?? defaults.actions.edit;
  return {
    modules: {
      accounting: resolveEnabled(
        modules.accounting ?? modules.treasury,
        defaults.modules.accounting
      ),
      events: resolveEnabled(modules.events, defaults.modules.events),
      contacts: resolveEnabled(modules.contacts, defaults.modules.contacts),
      documents: resolveEnabled(modules.documents, defaults.modules.documents),
      social: resolveEnabled(modules.social, defaults.modules.social),
    },
    actions: {
      view: edit ? false : true,
      edit,
      delete: permissions?.actions?.delete ?? defaults.actions.delete,
    },
  };
};

const normalizeUser = (user: UserAccount): UserAccount => {
  const name = user.name?.trim() ?? "";
  const composed =
    `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || name;
  const parts = composed.split(" ").filter(Boolean);
  const basePermissions = withDefaultPermissions(user.permissions);
  const basePreferences = createDefaultPreferences();
  const preferences: UserPreferences = {
    ...basePreferences,
    ...(user.preferences ?? {}),
    language: normalizeLanguage(user.preferences?.language ?? basePreferences.language),
    notifications: {
      ...basePreferences.notifications,
      ...(user.preferences?.notifications ?? {}),
    },
  };
  const permissions =
    user.role === "Admin"
      ? {
          ...basePermissions,
          modules: {
            accounting: true,
            events: true,
            contacts: true,
            documents: true,
            social: true,
          },
        }
      : basePermissions;
  return {
    ...user,
    name: name || composed || "Usuario",
    firstName: user.firstName ?? parts[0] ?? "",
    lastName: user.lastName ?? parts.slice(1).join(" "),
    dni: user.dni ?? "",
    permissions,
    preferences,
  };
};

const toAdminUser = (admin: AdminAccount): UserAccount =>
  normalizeUser({
    id: createUserId(),
    firstName: admin.firstName ?? "",
    lastName: admin.lastName ?? "",
    name: `${admin.firstName} ${admin.lastName}`.trim() || "Administrador",
    dni: admin.dni ?? "",
    email: admin.email,
    password: admin.password,
    role: "Admin",
    status: "Activo",
    lastAccessAt: new Date().toISOString(),
    permissions: createDefaultPermissions(),
  });

export const useUsersStore = create<UsersState>()(
  persist(
    (set) => ({
      companyCode: null,
      users: [],
      ensureSeed: (companyCode, admin) =>
        set((state) => {
          if (!companyCode || !admin) return state;
          const adminUser = toAdminUser(admin);
          const normalizedUsers = state.users.map(normalizeUser);

          if (state.companyCode !== companyCode || normalizedUsers.length === 0) {
            return {
              companyCode,
              users: [adminUser],
            };
          }

          const exists = normalizedUsers.some(
            (user) => user.email.toLowerCase() === admin.email.toLowerCase()
          );

          if (!exists) {
            return {
              companyCode,
              users: [adminUser, ...normalizedUsers],
            };
          }

          return {
            companyCode: state.companyCode ?? companyCode,
            users: normalizedUsers,
          };
        }),
      addUser: ({
        firstName,
        lastName,
        dni,
        email,
        password,
        role,
        status,
        permissions,
        photoUrl,
      }) =>
        set((state) => ({
          users: [
            normalizeUser({
              id: createUserId(),
              name: `${firstName} ${lastName}`.trim(),
              firstName,
              lastName,
              dni,
              email,
              password,
              role,
              status: status ?? "Pendiente",
              lastAccessAt: null,
              permissions: permissions ?? createDefaultPermissions(),
              photoUrl,
            }),
            ...state.users.map(normalizeUser),
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
      resetUsers: () => set({ users: [] }),
    }),
    {
      name: "kora-users",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        companyCode: state.companyCode,
        users: state.users,
      }),
    }
  )
);
