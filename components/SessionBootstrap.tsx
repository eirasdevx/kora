"use client";

import { useEffect, useRef } from "react";
import type { SessionBootstrapPayload } from "@/core/session/session-payload";
import { useSessionStore } from "@/core/session/session.store";
import { useUsersStore } from "@/core/users/users.store";

let bootstrapStarted = false;

export default function SessionBootstrap() {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || bootstrapStarted) {
      return;
    }

    startedRef.current = true;
    bootstrapStarted = true;

    const hydrate = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
        });

        if (!response.ok) {
          useUsersStore.getState().resetUsers();
          useSessionStore.getState().hydrateFromServer(null);
          return;
        }

        const payload = (await response.json()) as SessionBootstrapPayload;
        useUsersStore.getState().hydrateUsers({
          companyCode: payload.companyCode,
          users: payload.users,
        });
        useSessionStore.getState().hydrateFromServer(payload);
      } catch (error) {
        console.error(error);
        useUsersStore.getState().resetUsers();
        useSessionStore.getState().hydrateFromServer(null);
      }
    };

    void hydrate();
  }, []);

  return null;
}
