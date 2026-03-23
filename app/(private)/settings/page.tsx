"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PageTopbar from "@/components/PageTopbar";
import { useSessionStore } from "@/core/session/session.store";
import { type UserRole, useUsersStore } from "@/core/users/users.store";

const cards = [
  {
    title: "Mi perfil",
    description:
      "Actualiza tu información personal, credenciales y preferencias de cuenta.",
    href: "/settings/profile",
    tone: "bg-blue-50 text-blue-600",
    icon: <span className="material-symbols-outlined text-[20px]">person</span>,
  },
  {
    title: "Perfil de asociación",
    description:
      "Información legal, contacto y configuración de cuotas, importes y periodicidades de socios.",
    href: "/settings/association",
    tone: "bg-indigo-50 text-indigo-600",
    icon: (
      <span className="material-symbols-outlined text-[20px]">apartment</span>
    ),
  },
  {
    title: "Gestión de usuarios",
    description:
      "Administra los accesos del equipo, define roles, permisos y monitoriza la actividad.",
    href: "/settings/users",
    tone: "bg-purple-50 text-purple-600",
    icon: <span className="material-symbols-outlined text-[20px]">group</span>,
  },
  {
    title: "Notificaciones",
    description:
      "Revisa el centro de notificaciones con cambios, pagos y eventos clave.",
    href: "/settings/notifications",
    tone: "bg-amber-50 text-amber-600",
    icon: (
      <span className="material-symbols-outlined text-[20px]">
        notifications
      </span>
    ),
  },
  {
    title: "Mensajería",
    description:
      "Guarda credenciales de correo y números para envíos masivos.",
    href: "/settings/messaging",
    tone: "bg-sky-50 text-sky-600",
    icon: <span className="material-symbols-outlined text-[20px]">mail</span>,
  },
  {
    title: "Seguridad",
    description:
      "Ajustes de 2FA, políticas de contraseñas, sesiones activas y logs de seguridad.",
    href: "/settings/security",
    tone: "bg-rose-50 text-rose-600",
    icon: (
      <span className="material-symbols-outlined text-[20px]">security</span>
    ),
  },
  {
    title: "Apariencia",
    description:
      "Personaliza los colores corporativos, temas claros/oscuros y la tipografía.",
    href: "/settings/appearance",
    tone: "bg-emerald-50 text-emerald-600",
    icon: (
      <span className="material-symbols-outlined text-[20px]">palette</span>
    ),
  },
  {
    title: "Migración",
    description:
      "Exporta e importa los datos de tu asociación en formato JSON o CSV.",
    href: "/settings/migration",
    tone: "bg-sky-50 text-sky-600",
    icon: (
      <span className="material-symbols-outlined text-[20px]">
        cloud_download
      </span>
    ),
  },
] as const;

const GUEST_HIDDEN_CARD_HREFS = [
  "/settings/users",
  "/settings/messaging",
  "/settings/security",
];

const roleLabels: Record<UserRole, string> = {
  Admin: "Administrador",
  Gestor: "Gestor",
  Lector: "Lector",
};

export default function SettingsPage() {
  const mode = useSessionStore((s) => s.mode);
  const activeUserId = useSessionStore((s) => s.activeUserId);
  const users = useUsersStore((s) => s.users);
  const [search, setSearch] = useState("");

  const activeUser = users.find((user) => user.id === activeUserId);
  const activeUserName =
    `${activeUser?.firstName ?? ""} ${activeUser?.lastName ?? ""}`.trim() ||
    activeUser?.name?.trim() ||
    activeUser?.email ||
    "Admin Kora";
  const activeUserRoleLabel = activeUser?.role
    ? roleLabels[activeUser.role]
    : "Administrador";
  const activeUserInitials =
    activeUserName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AK";
  const activeUserPhotoUrl = activeUser?.photoUrl?.trim();

  const visibleCards =
    mode === "guest"
      ? cards.filter((card) => !GUEST_HIDDEN_CARD_HREFS.includes(card.href))
      : cards;

  const filteredCards = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return visibleCards;
    return visibleCards.filter((card) => {
      const haystack = `${card.title} ${card.description}`
        .toLowerCase()
        .trim();
      return haystack.includes(term);
    });
  }, [search, visibleCards]);

  return (
    <div className="space-y-10">
      <PageTopbar>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
              Configuración
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">
              Configuración general
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Gestiona todos los aspectos centrales de tu asociación desde un
              único lugar. Selecciona una categoría para empezar.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:w-auto xl:justify-end">
            <div className="relative w-full sm:w-72">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <span className="material-symbols-outlined text-[16px] leading-none">
                  search
                </span>
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar en configuración..."
                className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <Link
              href="/settings/profile"
              className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
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
                <p className="truncate text-sm font-semibold text-gray-800">
                  {activeUserName}
                </p>
                <p className="text-xs text-gray-500">{activeUserRoleLabel}</p>
              </div>
            </Link>
          </div>
        </div>
      </PageTopbar>

      {filteredCards.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No hay resultados para tu búsqueda.
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group flex h-full flex-col justify-between rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${card.tone} group-hover:scale-[1.03]`}
                >
                  {card.icon}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </section>
      )}

      <footer className="flex flex-col gap-4 border-t border-gray-200 pt-6 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
        <span>
          © {new Date().getFullYear()} Kora Association Management Suite. Todos
          los derechos reservados.
        </span>
        <div className="flex gap-6">
          <Link href="/settings/terms" className="transition hover:text-gray-700">
            Términos
          </Link>
          <Link href="/settings/privacy" className="transition hover:text-gray-700">
            Privacidad
          </Link>
          <Link href="/settings/status" className="transition hover:text-gray-700">
            Estado del sistema
          </Link>
        </div>
      </footer>
    </div>
  );
}
