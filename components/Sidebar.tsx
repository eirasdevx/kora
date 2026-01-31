"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar() {
  const pathname = usePathname();

  const mainItems: NavItem[] = [
    { label: "Panel de Control", href: "/dashboard" },
    { label: "Contabilidad", href: "/accounting" },
    { label: "Eventos", href: "/events" },
    { label: "Contactos", href: "/contacts" },
    { label: "Redes Sociales", href: "/social" },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-72 bg-white border-r min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6">
        <div className="font-extrabold text-lg">Kora</div>
        <div className="text-xs text-gray-500">
          Gestión de Asociaciones
        </div>
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
      <div className="px-6 py-4 border-t text-sm text-gray-500">
        Modo invitado
      </div>
    </aside>
  );
}
