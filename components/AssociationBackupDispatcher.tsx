"use client";

import { useEffect, useRef } from "react";
import { useSessionStore } from "@/core/session/session.store";

export default function AssociationBackupDispatcher() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const mode = useSessionStore((state) => state.mode);
  const activeAssociationId = useSessionStore((state) => state.activeAssociationId);
  const lastAssociationRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || mode !== "authenticated" || !activeAssociationId) {
      return;
    }

    if (lastAssociationRef.current === activeAssociationId) {
      return;
    }

    lastAssociationRef.current = activeAssociationId;

    void fetch("/api/account/security/backup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ force: false }),
    }).catch((error) => {
      console.error(error);
    });
  }, [activeAssociationId, hydrated, mode]);

  return null;
}
