"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSessionStore } from "@/core/session/session.store";
import { type UserRole, useUsersStore } from "@/core/users/users.store";

type NavModule = "accounting" | "events" | "contacts" | "documents" | "social";
type NavItem = {
  label: string;
  href: string;
  moduleKey?: NavModule;
};

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const mode = useSessionStore((s) => s.mode);
  const association = useSessionStore((s) => s.association);
  const logout = useSessionStore((s) => s.logout);
  const activeUserId = useSessionStore((s) => s.activeUserId);
  const users = useUsersStore((s) => s.users);

  const mainItems: NavItem[] = [
    { label: "Panel de control", href: "/dashboard" },
    { label: "Contabilidad", href: "/accounting", moduleKey: "accounting" },
    { label: "Eventos", href: "/events", moduleKey: "events" },
    { label: "Contactos", href: "/contacts", moduleKey: "contacts" },
    { label: "Documentos", href: "/documents", moduleKey: "documents" },
    { label: "Redes sociales", href: "/social", moduleKey: "social" },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const closeSidebar = () => onClose?.();

  const associationName = association?.name?.trim();
  const showAssociationName =
    !!associationName && associationName.toLowerCase() !== "invitado";
  const activeUser = users.find((user) => user.id === activeUserId);
  const roleLabels: Record<UserRole, string> = {
    Admin: "Administrador",
    Gestor: "Gestor",
    Lector: "Lector",
  };
  const activeUserName =
    `${activeUser?.firstName ?? ""} ${activeUser?.lastName ?? ""}`.trim() ||
    activeUser?.name?.trim() ||
    activeUser?.email?.trim() ||
    "Usuario";
  const activeUserRoleLabel = activeUser?.role
    ? roleLabels[activeUser.role] ?? "Usuario"
    : "Usuario";
  const activeUserInitials =
    activeUserName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";
  const activeUserPhotoUrl = activeUser?.photoUrl?.trim();
  const isAdmin = activeUser?.role === "Admin";
  const moduleAccess = activeUser?.permissions?.modules;
  const showSettings = true;
  const visibleItems = mainItems.filter((item) => {
    if (!item.moduleKey) return true;
    if (!activeUser || isAdmin || !moduleAccess) return true;
    return moduleAccess[item.moduleKey];
  });

  return (
    <>
      <div
        className={cx(
          "fixed inset-0 z-30 bg-black/40 transition lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeSidebar}
        aria-hidden="true"
      />
      <aside
        id="app-sidebar"
        className={cx(
          "fixed left-0 top-0 z-40 h-screen w-72 border-r bg-white flex flex-col overflow-y-auto transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-start justify-between gap-3 px-6 py-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-rounded kora-logo" aria-hidden="true">
              crop_7_5
            </span>
            <div>
              <div className="font-heading text-lg font-extrabold text-slate-900">
                Kora
              </div>
              <div className="text-xs text-gray-500">Gestión de asociaciones</div>
              {showAssociationName ? (
                <p className="mt-3 line-clamp-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  {associationName}
                </p>
              ) : null}
            </div>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={closeSidebar}
              className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 lg:hidden"
              aria-label="Cerrar menú"
            >
              <span className="material-symbols-outlined text-[16px]">
                close
              </span>
            </button>
          ) : null}
        </div>

        {/* Navegación principal */}
        <nav className="flex-1 px-4">
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeSidebar}
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
        {showSettings ? (
          <div className="px-4 pb-4">
            <div className="border-t pt-4">
              <Link
                href="/settings"
                onClick={closeSidebar}
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
        ) : null}

        {/* Footer */}
        <div className="px-6 py-4 border-t">
          {mode === "guest" ? (
            <p className="text-sm text-gray-500">Modo invitado</p>
          ) : mode === "authenticated" ? (
            <button
              type="button"
              onClick={() => router.push("/settings/profile")}
              className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-gray-50"
            >
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-slate-100 text-sm font-semibold text-slate-700">
                {activeUserPhotoUrl ? (
                  <img
                    src={activeUserPhotoUrl}
                    alt={`Perfil de ${activeUserName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{activeUserInitials}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {activeUserName}
                </p>
                <p className="text-xs text-gray-500">{activeUserRoleLabel}</p>
              </div>
            </button>
          ) : (
            <p className="text-sm text-gray-500">Sin sesión</p>
          )}
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
    </>
  );
}
