"use client";

import { useEffect } from "react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import {
  type GlobalActivityKind,
  useGlobalActivityStore,
} from "@/core/ui/global-activity.store";

type PatchedFetch = typeof window.fetch & {
  __koraTracked?: boolean;
};

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit) {
  const method =
    init?.method ??
    (typeof Request !== "undefined" && input instanceof Request
      ? input.method
      : "GET");

  return method.toUpperCase();
}

function getRequestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url;
  }
  return "";
}

function shouldTrackRequest(input: RequestInfo | URL, init?: RequestInit) {
  const method = getRequestMethod(input, init);
  if (method !== "GET" && method !== "HEAD" && method !== "POST" && method !== "PUT" && method !== "PATCH" && method !== "DELETE") {
    return false;
  }

  const rawUrl = getRequestUrl(input);
  if (!rawUrl) return false;

  try {
    const url = new URL(rawUrl, window.location.origin);
    return (
      url.origin === window.location.origin &&
      url.pathname.startsWith("/api/")
    );
  } catch {
    return false;
  }
}

function getActivityKind(input: RequestInfo | URL, init?: RequestInit): GlobalActivityKind {
  const method = getRequestMethod(input, init);
  return method === "GET" || method === "HEAD" ? "read" : "write";
}

export default function GlobalRequestOverlay() {
  const pendingReads = useGlobalActivityStore((state) => state.pendingReads);
  const pendingWrites = useGlobalActivityStore((state) => state.pendingWrites);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentFetch = window.fetch as PatchedFetch;
    if (currentFetch.__koraTracked) {
      return;
    }

    const originalFetch = window.fetch.bind(window);
    const trackedFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!shouldTrackRequest(input, init)) {
        return originalFetch(input, init);
      }

      const kind = getActivityKind(input, init);
      useGlobalActivityStore.getState().start(kind);

      try {
        return await originalFetch(input, init);
      } finally {
        useGlobalActivityStore.getState().finish(kind);
      }
    }) as PatchedFetch;

    trackedFetch.__koraTracked = true;
    window.fetch = trackedFetch;
  }, []);

  if (pendingReads === 0 && pendingWrites === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/15 backdrop-blur-[2px]">
      <LoadingSpinner
        label={pendingWrites > 0 ? "Guardando cambios..." : "Cargando datos..."}
        description={
          pendingWrites > 0
            ? "La ruleta desaparecera automaticamente cuando termine el guardado."
            : "La ruleta desaparecera automaticamente cuando termine la carga."
        }
        className="w-full max-w-sm border-slate-200 shadow-xl"
      />
    </div>
  );
}
