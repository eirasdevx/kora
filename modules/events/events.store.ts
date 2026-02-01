import { create } from "zustand";
import { Event } from "./event.types";
import { db } from "@/core/storage/kora.db";

interface EventsState {
  events: Event[];
  loadEvents: () => Promise<void>;
  addOrUpdateEvent: (event: Event) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

export const useEventsStore = create<EventsState>((set) => ({
  events: [],

  loadEvents: async () => {
    const all = await db.events.toArray();
    set({ events: all });
  },

  addOrUpdateEvent: async (event) => {
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
    await db.events.delete(id);
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    }));
  },
}));
