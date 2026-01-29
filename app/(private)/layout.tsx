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

  useEffect(() => {
    if (!mode) {
      router.push("/login");
    }
  }, [mode, router]);

  return (
    <div className="min-h-screen flex bg-background-light">
      <Sidebar />

      {/* Contenido principal SIN topbar global */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
