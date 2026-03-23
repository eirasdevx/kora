"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSessionStore } from "@/core/session/session.store";
import { type UserRole, useUsersStore } from "@/core/users/users.store";
import { clearClientSession } from "@/lib/client/session-client";

type NavModule = "accounting" | "events" | "contacts" | "documents";
type NavItem = {
  label: string;
  href: string;
  icon: string;
  moduleKey?: NavModule;
};

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const mode = useSessionStore((state) => state.mode);
  const activeUserId = useSessionStore((state) => state.activeUserId);
  const users = useUsersStore((state) => state.users);

  const [closingSession, setClosingSession] = useState(false);

  const activeUser = users.find((user) => user.id === activeUserId) ?? null;
  const isAdmin = activeUser?.role === "Admin";
  const moduleAccess = activeUser?.permissions?.modules;

  const mainItems: NavItem[] = [
    { label: "Panel de control", href: "/dashboard", icon: "space_dashboard" },
    {
      label: "Personas",
      href: "/people",
      icon: "groups",
      moduleKey: "contacts",
    },
    {
      label: "Finanzas",
      href: "/finance",
      icon: "receipt_long",
      moduleKey: "accounting",
    },
    {
      label: "Recursos",
      href: "/resources",
      icon: "inventory_2",
      moduleKey: "documents",
    },
    { label: "Eventos", href: "/events", icon: "event", moduleKey: "events" },
    { label: "Mensajería", href: "/messaging", icon: "mail" },
  ];

  const visibleItems = mainItems.filter((item) => {
    if (
      !item.moduleKey ||
      mode === "guest" ||
      !activeUser ||
      isAdmin ||
      !moduleAccess
    ) {
      return true;
    }

    return moduleAccess[item.moduleKey];
  });

  const activeUserName =
    `${activeUser?.firstName ?? ""} ${activeUser?.lastName ?? ""}`.trim() ||
    activeUser?.name ||
    activeUser?.email ||
    "Usuario";
  const roleLabels: Record<UserRole, string> = {
    Admin: "Administrador",
    Gestor: "Gestor",
    Lector: "Lector",
  };
  const userRole = activeUser?.role ? roleLabels[activeUser.role] : "Usuario";
  const initials =
    activeUserName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase())
      .join("") || "U";

  const closeSidebar = () => onClose?.();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const handleLogout = async () => {
    if (closingSession) {
      return;
    }

    setClosingSession(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.error(error);
    } finally {
      clearClientSession();
      router.replace("/login");
      setClosingSession(false);
    }
  };

  return (
    <>
      <div
        className={cx(
          "fixed inset-0 z-30 bg-black/40 transition lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closeSidebar}
      />

      <aside
        id="app-sidebar"
        className={cx(
          "fixed left-0 top-0 z-40 flex h-screen w-72 flex-col overflow-y-auto border-r bg-white transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0"
        )}
      >
        <div className="border-b px-6 py-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-lg font-extrabold text-slate-900">
                Kora
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Gestión de asociaciones
              </p>
            </div>
            {onClose ? (
              <button
                type="button"
                onClick={closeSidebar}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 lg:hidden"
              >
                <span className="material-symbols-outlined text-[16px]">
                  close
                </span>
              </button>
            ) : null}
          </div>
        </div>

        <nav className="flex-1 px-4 py-4">
          <ul className="space-y-1">
            {visibleItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeSidebar}
                  className={cx(
                    "flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t px-6 py-4">
          <Link
            href="/settings"
            onClick={closeSidebar}
            className={cx(
              "mb-3 flex items-center gap-3 rounded-xl px-2 py-3 font-medium transition",
              isActive("/settings")
                ? "bg-primary/10 text-primary"
                : "text-slate-700 hover:bg-slate-50"
            )}
          >
            <span className="material-symbols-outlined text-[20px]">
              settings
            </span>
            Configuración
          </Link>

          {mode === "authenticated" ? (
            <button
              type="button"
              onClick={() => router.push("/settings/profile")}
              className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-slate-50"
            >
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
                {activeUser?.photoUrl ? (
                  <img
                    src={activeUser.photoUrl}
                    alt={`Perfil de ${activeUserName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {activeUserName}
                </p>
                <p className="text-xs text-slate-500">{userRole}</p>
              </div>
            </button>
          ) : (
            <p className="text-sm text-slate-500">Modo invitado</p>
          )}

          <button
            type="button"
            onClick={handleLogout}
            disabled={closingSession}
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {closingSession ? "Cerrando..." : "Cerrar sesión"}
          </button>
        </div>
      </aside>
    </>
  );
}
