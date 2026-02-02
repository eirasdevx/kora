"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: JSX.Element;
};

const navItems: NavItem[] = [
  {
    label: "Perfil de Asociación",
    href: "/settings/profile",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M4 4h16v16H4z" />
        <path d="M8 8h8" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </svg>
    ),
  },
  {
    label: "Gestión de Usuarios",
    href: "/settings/users",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M16 11a4 4 0 1 0-8 0" />
        <path d="M6 21c1.7-3.4 9.7-3.4 12 0" />
      </svg>
    ),
  },
  {
    label: "Notificaciones",
    href: "/settings/notifications",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
    ),
  },
  {
    label: "Seguridad",
    href: "/settings/security",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 3l8 4v5c0 5-3.6 8.4-8 9-4.4-.6-8-4-8-9V7l8-4z" />
      </svg>
    ),
  },
  {
    label: "Apariencia",
    href: "/settings/appearance",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 3a9 9 0 1 0 9 9" />
        <path d="M12 7v10" />
        <path d="M7 12h10" />
      </svg>
    ),
  },
];

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function SettingsDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="w-full rounded-3xl border border-gray-200 bg-white p-5 shadow-sm lg:w-72 lg:shrink-0">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Configuración
        </div>
        <nav className="mt-5 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <span
                  className={cx(
                    "flex h-8 w-8 items-center justify-center rounded-xl",
                    active ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                  )}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-10 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
          <span className="h-10 w-10 rounded-full bg-emerald-200" />
          <div>
            <p className="text-sm font-semibold text-gray-700">Admin Kora</p>
            <p className="text-xs text-gray-500">Panel General</p>
          </div>
        </div>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
