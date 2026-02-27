import { create } from "zustand";
import { Event } from "./event.types";
import { db } from "@/core/storage/kora.db";
import { useSessionStore } from "@/core/session/session.store";
import { useNotificationsStore } from "@/core/notifications/notifications.store";

interface EventsState {
  events: Event[];
  loadEvents: () => Promise<void>;
  addOrUpdateEvent: (event: Event) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  resetEvents: () => void;
}

const isAuthenticated = () =>
  useSessionStore.getState().mode === "authenticated";

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],

  loadEvents: async () => {
    if (!isAuthenticated()) return;
    const all = await db.events.toArray();
    set({ events: all });
  },

  addOrUpdateEvent: async (event) => {
    const exists = get().events.some((item) => item.id === event.id);
    if (!isAuthenticated()) {
      set((state) => {
        const exists = state.events.some((e) => e.id === event.id);
        return {
          events: exists
            ? state.events.map((e) =>
                e.id === event.id ? event : e
              )
            : [...state.events, event],
        };
      });
      useNotificationsStore.getState().addNotification({
        category: "system",
        title: exists ? "Evento actualizado" : "Nuevo evento creado",
        description: event.title
          ? `${event.title} se ${exists ? "actualizo" : "creo"}.`
          : exists
            ? "Se actualizo un evento."
            : "Se creo un evento.",
        href: "/events",
        actionLabel: "Ver calendario",
        icon: "event",
        tone: "bg-indigo-50 text-indigo-600",
      });
      return;
    }
    await db.events.put(event);
    set((state) => {
      const exists = state.events.some((e) => e.id === event.id);
      return {
        events: exists
          ? state.events.map((e) =>
              e.id === event.id ? event : e
            )
          : [...state.events, event],
      };
    });
    useNotificationsStore.getState().addNotification({
      category: "system",
      title: exists ? "Evento actualizado" : "Nuevo evento creado",
      description: event.title
        ? `${event.title} se ${exists ? "actualizo" : "creo"}.`
        : exists
          ? "Se actualizo un evento."
          : "Se creo un evento.",
      href: "/events",
      actionLabel: "Ver calendario",
      icon: "event",
      tone: "bg-indigo-50 text-indigo-600",
    });
  },

  deleteEvent: async (id) => {
    const target = get().events.find((event) => event.id === id);
    if (!isAuthenticated()) {
      set((state) => ({
        events: state.events.filter((e) => e.id !== id),
      }));
      useNotificationsStore.getState().addNotification({
        category: "system",
        title: "Evento eliminado",
        description: target?.title
          ? `Se elimino ${target.title}.`
          : "Se elimino un evento.",
        href: "/events",
        actionLabel: "Ver calendario",
        icon: "delete",
        tone: "bg-rose-50 text-rose-600",
      });
      return;
    }
    await db.events.delete(id);
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    }));
    useNotificationsStore.getState().addNotification({
      category: "system",
      title: "Evento eliminado",
      description: target?.title
        ? `Se elimino ${target.title}.`
        : "Se elimino un evento.",
      href: "/events",
      actionLabel: "Ver calendario",
      icon: "delete",
      tone: "bg-rose-50 text-rose-600",
    });
  },

  resetEvents: () => set({ events: [] }),
}));
