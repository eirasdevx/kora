"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSessionStore } from "@/core/session/session.store";

type NavItem = {
  label: string;
  href: string;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const mode = useSessionStore((s) => s.mode);
  const association = useSessionStore((s) => s.association);
  const logout = useSessionStore((s) => s.logout);

  const mainItems: NavItem[] = [
    { label: "Panel de control", href: "/dashboard" },
    { label: "Contabilidad", href: "/accounting" },
    { label: "Eventos", href: "/events" },
    { label: "Contactos", href: "/contacts" },
    { label: "Redes sociales", href: "/social" },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-72 bg-white border-r min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6">
        <div className="font-heading text-lg font-extrabold text-slate-900">
          Kora
        </div>
        <div className="text-xs text-gray-500">Gestión de asociaciones</div>
        {association?.name ? (
          <p className="mt-3 line-clamp-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            {association.name}
          </p>
        ) : null}
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 px-4">
        <ul className="space-y-1">
          {mainItems.map((item) => {
            const active = isActive(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cx(
                    "block px-4 py-3 rounded-xl font-medium transition",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Configuración */}
      <div className="px-4 pb-4">
        <div className="border-t pt-4">
          <Link
            href="/settings"
            className={cx(
              "block px-4 py-3 rounded-xl font-medium transition",
              isActive("/settings")
                ? "bg-primary/10 text-primary"
                : "text-gray-700 hover:bg-gray-50"
            )}
          >
            Configuración
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t">
        <p className="text-sm text-gray-500">
          {mode === "guest"
            ? "Modo invitado"
            : mode === "authenticated"
              ? "Sesión iniciada"
              : "Sin sesión"}
        </p>
        <button
          type="button"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
