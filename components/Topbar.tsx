"use client";

import { useSessionStore } from "@/core/session/session.store";

export default function Topbar() {
  const mode = useSessionStore((s) => s.mode);

  return (
    <header className="h-14 bg-white border-b flex items-center justify-end px-6">
      {mode === "guest" && (
        <span className="text-sm text-orange-600 font-medium">
          Modo invitado
        </span>
      )}
    </header>
  );
}
