"use client";

import type { SessionBootstrapPayload } from "@/core/session/session-payload";
import { useNotificationsStore } from "@/core/notifications/notifications.store";
import { useSessionStore } from "@/core/session/session.store";
import { useUsersStore } from "@/core/users/users.store";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useDocumentsStore } from "@/modules/documents/documents.store";
import { useEventsStore } from "@/modules/events/events.store";
import { useInventoryStore } from "@/modules/resources/inventory.store";
import { useMessagingStore } from "@/modules/messaging/messaging.store";
import { useMemberPointsStore } from "@/modules/people/member-points.store";
import { useVolunteerActivitiesStore } from "@/modules/volunteers/volunteer-activities.store";

type ApiErrorShape = {
  error?: string;
};

const QUIET_CLIENT_API_ERROR_PATTERNS = [
  "no se puede conectar con la base de datos",
  "connection terminated due to connection timeout",
  "max client connections reached",
  "connect timeout",
  "connection timeout",
  "failed to fetch",
  "fetch failed",
  "networkerror",
] as const;

export function applySessionPayload(payload: SessionBootstrapPayload) {
  useUsersStore.getState().hydrateUsers({
    companyCode: payload.companyCode,
    users: payload.users,
  });
  useSessionStore.getState().hydrateFromServer(payload);
}

export async function reloadAssociationScopedStores() {
  useNotificationsStore.getState().clearNotifications();
  useContactsStore.getState().resetContacts();
  useEventsStore.getState().resetEvents();
  useDocumentsStore.getState().resetDocuments();
  useTransactionsStore.getState().resetTransactions();
  useInventoryStore.getState().resetItems();
  useVolunteerActivitiesStore.getState().resetActivities();
  useMemberPointsStore.getState().resetPointsData();
  useMessagingStore.getState().resetTemplates();

  await Promise.all([
    useContactsStore.getState().loadContacts(),
    useEventsStore.getState().loadEvents(),
    useDocumentsStore.getState().loadDocuments(),
    useTransactionsStore.getState().loadTransactions(),
    useInventoryStore.getState().loadItems(),
    useVolunteerActivitiesStore.getState().loadActivities(),
    useMemberPointsStore.getState().loadPointsData(),
    useMessagingStore.getState().loadTemplates(),
  ]);
}

export function clearClientSession() {
  useNotificationsStore.getState().clearNotifications();
  useContactsStore.getState().resetContacts();
  useEventsStore.getState().resetEvents();
  useDocumentsStore.getState().resetDocuments();
  useTransactionsStore.getState().resetTransactions();
  useInventoryStore.getState().resetItems();
  useVolunteerActivitiesStore.getState().resetActivities();
  useMemberPointsStore.getState().resetPointsData();
  useMessagingStore.getState().resetTemplates();
  useUsersStore.getState().resetUsers();
  useSessionStore.getState().logout();
}

export function isQuietClientApiError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (!message) {
    return false;
  }

  const normalized = message.trim().toLowerCase();
  return QUIET_CLIENT_API_ERROR_PATTERNS.some((pattern) =>
    normalized.includes(pattern)
  );
}

export function shouldLogClientApiError(error: unknown) {
  return !isQuietClientApiError(error);
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | T
    | ApiErrorShape
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? payload.error
        : null;
    throw new Error(message || "La solicitud no se pudo completar.");
  }

  return payload as T;
}
