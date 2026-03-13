"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSessionStore } from "@/core/session/session.store";
import { type UserRole, useUsersStore } from "@/core/users/users.store";

type NavModule = "accounting" | "events" | "contacts" | "documents";
type NavItem = {
  label: string;
  href: string;
  icon: string;
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
  const hydrated = useSessionStore((s) => s.hydrated);
  const association = useSessionStore((s) => s.association);
  const associations = useSessionStore((s) => s.associations);
  const activeAssociationId = useSessionStore((s) => s.activeAssociationId);
  const setActiveAssociation = useSessionStore((s) => s.setActiveAssociation);
  const addAssociation = useSessionStore((s) => s.addAssociation);
  const ensureAssociations = useSessionStore((s) => s.ensureAssociations);
  const logout = useSessionStore((s) => s.logout);
  const activeUserId = useSessionStore((s) => s.activeUserId);
  const users = useUsersStore((s) => s.users);

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
    { label: "Mensajeria", href: "/messaging", icon: "mail" },
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
    if (
      mode === "guest" &&
      (item.href === "/messaging" || item.href === "/resources")
    ) {
      return false;
    }
    if (!item.moduleKey) return true;
    if (!activeUser || isAdmin || !moduleAccess) return true;
    return moduleAccess[item.moduleKey];
  });

  const [associationMenuOpen, setAssociationMenuOpen] = useState(false);
  const [newAssociationName, setNewAssociationName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    ensureAssociations();
  }, [hydrated, ensureAssociations]);

  useEffect(() => {
    if (!associationMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setAssociationMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [associationMenuOpen]);

  const associationEntries =
    associations.length > 0
      ? associations
      : association
        ? [
            {
              id: "active",
              profile: association,
              companyCode: "",
            },
          ]
        : [];

  const handleCreateAssociation = () => {
    const name = newAssociationName.trim();
    if (!name) {
      setCreateError("Indica el nombre de la asociación.");
      return;
    }
    addAssociation({ name });
    setNewAssociationName("");
    setCreateError(null);
    setAssociationMenuOpen(false);
  };

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
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="kora-logo" aria-hidden="true">
                <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                  <path
                    d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <div>
                <div className="font-heading text-lg font-extrabold text-slate-900">
                  Kora
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Gestión de asociaciones
                </div>
              </div>
            </div>
            {showAssociationName ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setAssociationMenuOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  aria-haspopup="menu"
                  aria-expanded={associationMenuOpen}
                >
                  <span className="line-clamp-2">{associationName}</span>
                  <span className="material-symbols-outlined text-[18px] text-slate-400">
                    expand_more
                  </span>
                </button>
                {associationMenuOpen ? (
                  <div className="absolute left-0 top-full z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Cambiar asociación
                    </p>
                    <div className="mt-3 space-y-1">
                      {associationEntries.map((entry) => {
                        const isActive = entry.id === activeAssociationId;
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => {
                              setActiveAssociation(entry.id);
                              setAssociationMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <span className="line-clamp-2">
                              {entry.profile.name}
                            </span>
                            {isActive ? (
                              <span className="text-[11px] font-semibold text-primary">
                                Activa
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold text-slate-500">
                        Crear nueva
                      </p>
                      <input
                        value={newAssociationName}
                        onChange={(event) =>
                          setNewAssociationName(event.target.value)
                        }
                        placeholder="Nombre de la asociación"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                      />
                      {createError ? (
                        <p className="text-xs text-rose-500">{createError}</p>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleCreateAssociation}
                        className="w-full rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90"
                      >
                        Crear asociación
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
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
                      "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg">
                      <span className="material-symbols-outlined text-[20px]">
                        {item.icon}
                      </span>
                    </span>
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
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition",
                  isActive("/settings")
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg">
                  <span className="material-symbols-outlined text-[20px]">
                    settings
                  </span>
                </span>
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
