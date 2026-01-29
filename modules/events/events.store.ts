import { create } from "zustand";
import { Event } from "./event.types";

interface EventsState {
  events: Event[];
  loadEvents: () => void;
  addOrUpdateEvent: (event: Event) => void;
  deleteEvent: (id: string) => void;
}

const STORAGE_KEY = "kora.events";

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readEvents(): Event[] {
  if (!canUseStorage()) return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Event[];
  } catch {
    return [];
  }
}

function writeEvents(events: Event[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export const useEventsStore = create<EventsState>((set, get) => ({
  events: [],

  loadEvents: () => {
    set({ events: readEvents() });
  },

  addOrUpdateEvent: (event) => {
    const current = get().events;
    const exists = current.some((e) => e.id === event.id);

    const updated = exists
      ? current.map((e) => (e.id === event.id ? event : e))
      : [...current, event];

    writeEvents(updated);
    set({ events: updated });
  },

  deleteEvent: (id) => {
    const updated = get().events.filter((e) => e.id !== id);
    writeEvents(updated);
    set({ events: updated });
  },
}));
