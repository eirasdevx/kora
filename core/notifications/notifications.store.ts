"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type NotificationCategory =
  | "payments"
  | "documents"
  | "members"
  | "system";

export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  category: NotificationCategory;
  createdAt: string;
  read: boolean;
  href?: string;
  actionLabel?: string;
  icon?: string;
  tone?: string;
};

type NotificationPayload = Omit<
  NotificationItem,
  "id" | "createdAt" | "read"
> & {
  id?: string;
  createdAt?: string;
  read?: boolean;
};

interface NotificationsState {
  notifications: NotificationItem[];
  addNotification: (payload: NotificationPayload) => NotificationItem;
  markRead: (id: string, read?: boolean) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const MAX_NOTIFICATIONS = 200;

const createNotificationId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      notifications: [],
      addNotification: (payload) => {
        const notification: NotificationItem = {
          id: payload.id ?? createNotificationId(),
          createdAt: payload.createdAt ?? new Date().toISOString(),
          read: payload.read ?? false,
          title: payload.title,
          description: payload.description,
          category: payload.category,
          href: payload.href,
          actionLabel: payload.actionLabel,
        };
        set((state) => ({
          notifications: [notification, ...state.notifications].slice(
            0,
            MAX_NOTIFICATIONS
          ),
        }));
        return notification;
      },
      markRead: (id, read = true) =>
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === id ? { ...item, read } : item
          ),
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter(
            (item) => item.id !== id
          ),
        })),
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: "kora-notifications",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ notifications: state.notifications }),
    }
  )
);
