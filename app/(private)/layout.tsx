"use client";

import { useEffect, useState } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="min-h-screen bg-background-light lg:pl-72">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Contenido principal */}
      <main className="min-h-screen p-6">
        <div className="mb-4 flex items-center gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-controls="app-sidebar"
            aria-expanded={sidebarOpen}
            aria-label="Abrir menú"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50"
          >
            <span className="material-symbols-outlined text-[20px]">
              menu
            </span>
          </button>
          <span className="text-sm font-semibold text-gray-600">Menú</span>
        </div>
        {children}
      </main>
    </div>
  );
}
