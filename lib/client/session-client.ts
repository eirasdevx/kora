"use client";

import type { SessionBootstrapPayload } from "@/core/session/session-payload";
import { useSessionStore } from "@/core/session/session.store";
import { useUsersStore } from "@/core/users/users.store";

type ApiErrorShape = {
  error?: string;
};

export function applySessionPayload(payload: SessionBootstrapPayload) {
  useUsersStore.getState().hydrateUsers({
    companyCode: payload.companyCode,
    users: payload.users,
  });
  useSessionStore.getState().hydrateFromServer(payload);
}

export function clearClientSession() {
  useUsersStore.getState().resetUsers();
  useSessionStore.getState().logout();
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
