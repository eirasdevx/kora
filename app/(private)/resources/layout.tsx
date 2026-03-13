"use client";

import Link from "next/link";
import ModuleTopbar, {
  moduleTopbarButtonStyles,
} from "@/components/shared/ModuleTopbar";
import { useSessionStore } from "@/core/session/session.store";

const RESOURCES_MODULE_TITLE = "Recursos";
const RESOURCES_PAGE_TITLE = "Centro de recursos";
const RESOURCES_MODULE_DESCRIPTION =
  "Inventario, préstamos y documentación clave.";

type ResourcesLayoutProps = {
  children: React.ReactNode;
};

export default function ResourcesLayout({
  children,
}: ResourcesLayoutProps) {
  const mode = useSessionStore((state) => state.mode);

  if (mode === "guest") {
    return (
      <div className="space-y-6">
        <ModuleTopbar
          module={RESOURCES_MODULE_TITLE}
          title={RESOURCES_PAGE_TITLE}
          description={RESOURCES_MODULE_DESCRIPTION}
          actions={
            <Link href="/dashboard" className={moduleTopbarButtonStyles.secondary}>
              Volver al panel
            </Link>
          }
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <span className="material-symbols-outlined text-[24px]">info</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Recursos no disponible en modo invitado
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Inicia sesión para gestionar inventario, préstamos y documentación.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
