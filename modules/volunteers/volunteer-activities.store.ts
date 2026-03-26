"use client";

import { create } from "zustand";
import { db } from "@/core/storage/kora.db";
import { useSessionStore } from "@/core/session/session.store";
import {
  getActiveAssociationId,
  getAssociationScopedRecords,
  withActiveAssociation,
} from "@/core/storage/association-scope";
import { VolunteerActivity } from "./volunteer-activity.types";
import { useNotificationsStore } from "@/core/notifications/notifications.store";
import {
  deleteAssociationModuleRecord,
  listAssociationModuleRecords,
  shouldLogAssociationDataError,
  upsertAssociationModuleRecord,
} from "@/lib/client/association-data-client";

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
  create<VolunteerActivitiesState>((set, get) => ({
    activities: [],

    loadActivities: async () => {
      if (!isAuthenticated()) return;
      const all = await db.volunteerActivities.toArray();
      const { scopedRecords, migratedRecords } = getAssociationScopedRecords(
        all,
        getActiveAssociationId()
      );

      try {
        const persisted =
          await listAssociationModuleRecords<VolunteerActivity>(
            "volunteerActivities"
          );

        if (persisted.length > 0 || migratedRecords.length > 0) {
          await db.volunteerActivities.bulkPut(persisted);
        }

        set({ activities: persisted });
        return;
      } catch (error) {
        if (shouldLogAssociationDataError(error)) {
          console.error(error);
        }
      }

      if (migratedRecords.length > 0) {
        await db.volunteerActivities.bulkPut(scopedRecords);
      }

      set({ activities: scopedRecords });
    },

    addActivity: async (activity) => {
      const scopedActivity = withActiveAssociation(activity);
      if (!isAuthenticated()) {
        set((state) => ({
          activities: [scopedActivity, ...state.activities],
        }));
        useNotificationsStore.getState().addNotification({
          category: "system",
          title: "Actividad creada",
          description: activity.notes
            ? `Se creó una actividad: ${activity.notes}.`
            : "Se creó una actividad.",
          href: "/people/volunteers",
          actionLabel: "Ver actividades",
          icon: "volunteer_activism",
          tone: "bg-indigo-50 text-indigo-600",
        });
        return;
      }
      await upsertAssociationModuleRecord<VolunteerActivity>(
        "volunteerActivities",
        scopedActivity
      );
      await db.volunteerActivities.put(scopedActivity);
      set((state) => ({
        activities: [scopedActivity, ...state.activities],
      }));
      useNotificationsStore.getState().addNotification({
        category: "system",
        title: "Actividad creada",
        description: activity.notes
          ? `Se creó una actividad: ${activity.notes}.`
          : "Se creó una actividad.",
        href: "/people/volunteers",
        actionLabel: "Ver actividades",
        icon: "volunteer_activism",
        tone: "bg-indigo-50 text-indigo-600",
      });
    },

    updateActivity: async (activity) => {
      const scopedActivity = withActiveAssociation(activity);
      if (!isAuthenticated()) {
        set((state) => ({
          activities: state.activities.map((item) =>
            item.id === scopedActivity.id ? scopedActivity : item
          ),
        }));
        useNotificationsStore.getState().addNotification({
          category: "system",
          title: "Actividad actualizada",
          description: activity.notes
            ? `Se actualizó una actividad: ${activity.notes}.`
            : "Se actualizó una actividad.",
          href: "/people/volunteers",
          actionLabel: "Ver actividades",
          icon: "edit",
          tone: "bg-blue-50 text-blue-600",
        });
        return;
      }
      await upsertAssociationModuleRecord<VolunteerActivity>(
        "volunteerActivities",
        scopedActivity
      );
      await db.volunteerActivities.put(scopedActivity);
      set((state) => ({
        activities: state.activities.map((item) =>
          item.id === scopedActivity.id ? scopedActivity : item
        ),
      }));
      useNotificationsStore.getState().addNotification({
        category: "system",
        title: "Actividad actualizada",
        description: activity.notes
          ? `Se actualizó una actividad: ${activity.notes}.`
          : "Se actualizó una actividad.",
        href: "/people/volunteers",
        actionLabel: "Ver actividades",
        icon: "edit",
        tone: "bg-blue-50 text-blue-600",
      });
    },

    deleteActivity: async (id) => {
      const target = get().activities.find((item) => item.id === id);
      if (!isAuthenticated()) {
        set((state) => ({
          activities: state.activities.filter((item) => item.id !== id),
        }));
        useNotificationsStore.getState().addNotification({
          category: "system",
          title: "Actividad eliminada",
          description: target?.notes
            ? `Se eliminó la actividad: ${target.notes}.`
            : "Se eliminó una actividad.",
          href: "/people/volunteers",
          actionLabel: "Ver actividades",
          icon: "delete",
          tone: "bg-rose-50 text-rose-600",
        });
        return;
      }
      await deleteAssociationModuleRecord("volunteerActivities", id);
      await db.volunteerActivities.delete(id);
      set((state) => ({
        activities: state.activities.filter((item) => item.id !== id),
      }));
      useNotificationsStore.getState().addNotification({
        category: "system",
        title: "Actividad eliminada",
        description: target?.notes
          ? `Se eliminó la actividad: ${target.notes}.`
          : "Se eliminó una actividad.",
        href: "/people/volunteers",
        actionLabel: "Ver actividades",
        icon: "delete",
        tone: "bg-rose-50 text-rose-600",
      });
    },

    resetActivities: () => set({ activities: [] }),
  }));
