import { create } from "zustand";
import { Event } from "./event.types";
import { db } from "@/core/storage/kora.db";
import { useSessionStore } from "@/core/session/session.store";

interface EventsState {
  events: Event[];
  loadEvents: () => Promise<void>;
  addOrUpdateEvent: (event: Event) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  resetEvents: () => void;
}

const isAuthenticated = () =>
  useSessionStore.getState().mode === "authenticated";

export const useEventsStore = create<EventsState>((set) => ({
  events: [],

  loadEvents: async () => {
    if (!isAuthenticated()) return;
    const all = await db.events.toArray();
    set({ events: all });
  },

  addOrUpdateEvent: async (event) => {
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
  },

  deleteEvent: async (id) => {
    if (!isAuthenticated()) {
      set((state) => ({
        events: state.events.filter((e) => e.id !== id),
      }));
      return;
    }
    await db.events.delete(id);
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    }));
  },

  resetEvents: () => set({ events: [] }),
}));
