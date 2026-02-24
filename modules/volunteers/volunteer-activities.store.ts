"use client";

import { create } from "zustand";
import { db } from "@/core/storage/kora.db";
import { useSessionStore } from "@/core/session/session.store";
import { VolunteerActivity } from "./volunteer-activity.types";

interface VolunteerActivitiesState {
  activities: VolunteerActivity[];
  loadActivities: () => Promise<void>;
  addActivity: (activity: VolunteerActivity) => Promise<void>;
  updateActivity: (activity: VolunteerActivity) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  resetActivities: () => void;
}

const isAuthenticated = () =>
  useSessionStore.getState().mode === "authenticated";

export const useVolunteerActivitiesStore =
  create<VolunteerActivitiesState>((set) => ({
    activities: [],

    loadActivities: async () => {
      if (!isAuthenticated()) return;
      const all = await db.volunteerActivities.toArray();
      set({ activities: all });
    },

    addActivity: async (activity) => {
      if (!isAuthenticated()) {
        set((state) => ({
          activities: [activity, ...state.activities],
        }));
        return;
      }
      await db.volunteerActivities.put(activity);
      set((state) => ({
        activities: [activity, ...state.activities],
      }));
    },

    updateActivity: async (activity) => {
      if (!isAuthenticated()) {
        set((state) => ({
          activities: state.activities.map((item) =>
            item.id === activity.id ? activity : item
          ),
        }));
        return;
      }
      await db.volunteerActivities.put(activity);
      set((state) => ({
        activities: state.activities.map((item) =>
          item.id === activity.id ? activity : item
        ),
      }));
    },

    deleteActivity: async (id) => {
      if (!isAuthenticated()) {
        set((state) => ({
          activities: state.activities.filter((item) => item.id !== id),
        }));
        return;
      }
      await db.volunteerActivities.delete(id);
      set((state) => ({
        activities: state.activities.filter((item) => item.id !== id),
      }));
    },

    resetActivities: () => set({ activities: [] }),
  }));
