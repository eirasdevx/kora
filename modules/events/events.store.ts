import { create } from "zustand";
import { Event } from "./event.types";
import { db } from "@/core/storage/kora.db";
import {
  getActiveAssociationId,
  getAssociationScopedRecords,
  withActiveAssociation,
} from "@/core/storage/association-scope";
import { useSessionStore } from "@/core/session/session.store";
import { useNotificationsStore } from "@/core/notifications/notifications.store";
import {
  deleteAssociationModuleRecord,
  listAssociationModuleRecords,
  upsertAssociationModuleRecord,
} from "@/lib/client/association-data-client";

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

    try {
      const events = await listAssociationModuleRecords<Event>("events");
      set({ events });
      return;
    } catch (error) {
      console.error(error);
    }

    const all = await db.events.toArray();
    const { scopedRecords, migratedRecords } = getAssociationScopedRecords(
      all,
      getActiveAssociationId()
    );

    if (migratedRecords.length > 0) {
      await db.events.bulkPut(scopedRecords);
    }

    set({ events: scopedRecords });
  },

  addOrUpdateEvent: async (event) => {
    const normalizedEvent = withActiveAssociation(event);
    const exists = get().events.some((item) => item.id === normalizedEvent.id);
    if (!isAuthenticated()) {
      set((state) => {
        const exists = state.events.some((e) => e.id === normalizedEvent.id);
        return {
          events: exists
            ? state.events.map((e) =>
                e.id === normalizedEvent.id ? normalizedEvent : e
              )
            : [...state.events, normalizedEvent],
        };
      });
      useNotificationsStore.getState().addNotification({
        category: "system",
        title: exists ? "Evento actualizado" : "Nuevo evento creado",
        description: event.title
          ? `${event.title} se ${exists ? "actualizó" : "creó"}.`
          : exists
            ? "Se actualizó un evento."
            : "Se creó un evento.",
        href: "/events",
        actionLabel: "Ver calendario",
        icon: "event",
        tone: "bg-indigo-50 text-indigo-600",
      });
      return;
    }
    await upsertAssociationModuleRecord<Event>("events", normalizedEvent);
    await db.events.put(normalizedEvent);
    set((state) => {
      const exists = state.events.some((e) => e.id === normalizedEvent.id);
      return {
        events: exists
          ? state.events.map((e) =>
              e.id === normalizedEvent.id ? normalizedEvent : e
            )
          : [...state.events, normalizedEvent],
      };
    });
    useNotificationsStore.getState().addNotification({
      category: "system",
      title: exists ? "Evento actualizado" : "Nuevo evento creado",
      description: event.title
        ? `${event.title} se ${exists ? "actualizó" : "creó"}.`
        : exists
          ? "Se actualizó un evento."
          : "Se creó un evento.",
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
          ? `Se eliminó ${target.title}.`
          : "Se eliminó un evento.",
        href: "/events",
        actionLabel: "Ver calendario",
        icon: "delete",
        tone: "bg-rose-50 text-rose-600",
      });
      return;
    }
    await deleteAssociationModuleRecord("events", id);
    await db.events.delete(id);
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    }));
    useNotificationsStore.getState().addNotification({
      category: "system",
      title: "Evento eliminado",
      description: target?.title
        ? `Se eliminó ${target.title}.`
        : "Se eliminó un evento.",
      href: "/events",
      actionLabel: "Ver calendario",
      icon: "delete",
      tone: "bg-rose-50 text-rose-600",
    });
  },

  resetEvents: () => set({ events: [] }),
}));
