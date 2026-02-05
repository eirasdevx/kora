"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/core/session/session.store";
import Sidebar from "@/components/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const mode = useSessionStore((s) => s.mode);
  const hydrated = useSessionStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (!mode) router.replace("/login");
  }, [hydrated, mode, router]);

  if (!hydrated || !mode) {
    return (
      <div className="min-h-screen bg-background-light" aria-busy="true" />
    );
  }

  return (
    <div className="min-h-screen flex bg-background-light">
      <Sidebar />

      {/* Contenido principal */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
