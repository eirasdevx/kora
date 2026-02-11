"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { type AdminAccount } from "@/core/session/session.store";

export type UserRole = "Admin" | "Gestor" | "Lector";
export type UserStatus = "Activo" | "Pendiente";

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastAccessAt: string | null;
};

interface UsersState {
  companyCode: string | null;
  users: UserAccount[];
  ensureSeed: (companyCode: string | null, admin: AdminAccount | null) => void;
  addUser: (payload: { name: string; email: string; role: UserRole }) => void;
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

const toAdminUser = (admin: AdminAccount): UserAccount => ({
  id: createUserId(),
  name: `${admin.firstName} ${admin.lastName}`.trim() || "Administrador",
  email: admin.email,
  role: "Admin",
  status: "Activo",
  lastAccessAt: new Date().toISOString(),
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

          if (state.companyCode !== companyCode || state.users.length === 0) {
            return {
              companyCode,
              users: [adminUser],
            };
          }

          const exists = state.users.some(
            (user) => user.email.toLowerCase() === admin.email.toLowerCase()
          );

          if (!exists) {
            return {
              companyCode,
              users: [adminUser, ...state.users],
            };
          }

          return {
            companyCode: state.companyCode ?? companyCode,
            users: state.users,
          };
        }),
      addUser: ({ name, email, role }) =>
        set((state) => ({
          users: [
            {
              id: createUserId(),
              name,
              email,
              role,
              status: "Pendiente",
              lastAccessAt: null,
            },
            ...state.users,
          ],
        })),
      updateUser: (id, updates) =>
        set((state) => ({
          users: state.users.map((user) =>
            user.id === id ? { ...user, ...updates } : user
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
