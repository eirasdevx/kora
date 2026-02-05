"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/core/session/session.store";

export default function Home() {
  const router = useRouter();
  const mode = useSessionStore((s) => s.mode);
  const hydrated = useSessionStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(mode ? "/dashboard" : "/login");
  }, [hydrated, mode, router]);

  return <div className="min-h-screen bg-background-light" aria-busy="true" />;
}
