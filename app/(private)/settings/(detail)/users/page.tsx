"use client";

import { useRouter } from "next/navigation";
import PageTopbar from "@/components/PageTopbar";
import { useSessionStore } from "@/core/session/session.store";

const users = [
  {
    name: "Admin Kora",
    email: "admin@asociacionkora.org",
    role: "Admin",
    status: "Activo",
    last: "Hace 2 minutos",
  },
  {
    name: "Lucía Martínez",
    email: "lucia.m@asociacionkora.org",
    role: "Gestor",
    status: "Activo",
    last: "Ayer, 18:45",
  },
  {
    name: "Jorge Ramírez",
    email: "jorge.r@gmail.com",
    role: "Lector",
    status: "Pendiente",
    last: "Nunca",
  },
  {
    name: "Beatriz G.",
    email: "beatriz.garcia@asociacionkora.org",
    role: "Gestor",
    status: "Activo",
    last: "12 Feb 2024",
  },
];

const statusStyles: Record<string, string> = {
  Activo: "bg-emerald-50 text-emerald-700",
  Pendiente: "bg-amber-50 text-amber-700",
};

export default function UsersSettingsPage() {
  const router = useRouter();
  const mode = useSessionStore((s) => s.mode);

  if (mode === "guest") {
    return (
      <div className="space-y-8">
        <PageTopbar>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Configuracion &nbsp;›&nbsp; Gestion de Usuarios
            </p>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Gestion de Usuarios
                </h1>
                <p className="text-sm text-gray-500">
                  Esta seccion solo estara disponible en cuentas autenticadas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/settings")}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm"
              >
                Volver a configuracion
              </button>
            </div>
          </div>
        </PageTopbar>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 6v6" />
              <path d="M12 18h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            Gestion no disponible en modo invitado
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Activa una cuenta para administrar accesos y roles del equipo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageTopbar>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Configuración &nbsp;›&nbsp; Gestión de Usuarios
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Gestión de Usuarios
              </h1>
              <p className="text-sm text-gray-500">
                Administra los accesos y roles de los miembros de tu equipo.
              </p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow">
              + Invitar Usuario
            </button>
          </div>
        </div>
      </PageTopbar>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </span>
          <input
            placeholder="Buscar por nombre o email..."
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm">
            Filtrar
          </button>
          <button className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm">
            Exportar
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_0.5fr] gap-4 border-b border-gray-100 bg-gray-50 px-6 py-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
          <span>Usuario</span>
          <span>Rol</span>
          <span>Estado</span>
          <span>Último acceso</span>
          <span>Acciones</span>
        </div>
        {users.map((user) => (
          <div
            key={user.email}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_0.5fr] items-center gap-4 border-b border-gray-100 px-6 py-4 text-sm text-gray-700 last:border-none"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {user.name
                  .split(" ")
                  .map((item) => item[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <p className="font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
            <span className="inline-flex w-fit rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
              {user.role.toUpperCase()}
            </span>
            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[user.status]}`}
            >
              {user.status}
            </span>
            <span className="text-sm text-gray-500">{user.last}</span>
            <button className="text-xl text-gray-400">⋯</button>
          </div>
        ))}
        <div className="flex items-center justify-between px-6 py-4 text-sm text-gray-500">
          <span>Mostrando 4 de 12 usuarios</span>
          <div className="flex items-center gap-2">
            <button className="h-9 w-9 rounded-xl border border-gray-200 text-gray-500">
              ‹
            </button>
            <button className="h-9 w-9 rounded-xl border border-gray-200 text-gray-500">
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6 text-sm text-blue-700">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white">
            i
          </div>
          <div>
            <p className="font-semibold text-gray-900">Acerca de los roles</p>
            <p className="mt-2 text-sm text-gray-600">
              Los Administradores tienen control total sobre la plataforma. Los
              Gestores pueden editar contenido y gestionar miembros. Los
              Lectores solo tienen acceso de visualización.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
