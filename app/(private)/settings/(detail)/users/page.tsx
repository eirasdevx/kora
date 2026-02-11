"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageTopbar from "@/components/PageTopbar";
import { useSessionStore } from "@/core/session/session.store";
import {
  type UserRole,
  type UserStatus,
  useUsersStore,
} from "@/core/users/users.store";

const statusStyles: Record<UserStatus, string> = {
  Activo: "bg-emerald-50 text-emerald-700",
  Pendiente: "bg-amber-50 text-amber-700",
};

const ROLE_OPTIONS: UserRole[] = ["Admin", "Gestor", "Lector"];
const STATUS_OPTIONS: UserStatus[] = ["Activo", "Pendiente"];

const formatLastAccess = (value: string | null) => {
  if (!value) return "Nunca";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Nunca";
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const escapeCsv = (value: string) => {
  if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }
  return value;
};

export default function UsersSettingsPage() {
  const router = useRouter();
  const mode = useSessionStore((s) => s.mode);
  const hydrated = useSessionStore((s) => s.hydrated);
  const admin = useSessionStore((s) => s.admin);
  const companyCode = useSessionStore((s) => s.companyCode);

  const users = useUsersStore((s) => s.users);
  const ensureSeed = useUsersStore((s) => s.ensureSeed);
  const addUser = useUsersStore((s) => s.addUser);
  const updateUser = useUsersStore((s) => s.updateUser);
  const removeUser = useUsersStore((s) => s.removeUser);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "Gestor" as UserRole,
  });

  useEffect(() => {
    if (!hydrated || mode !== "authenticated") return;
    ensureSeed(companyCode, admin);
  }, [hydrated, mode, companyCode, admin, ensureSeed]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !term ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const adminCount = useMemo(
    () => users.filter((user) => user.role === "Admin").length,
    [users]
  );

  const handleInviteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviteError(null);

    const name = inviteForm.name.trim();
    const email = inviteForm.email.trim().toLowerCase();

    if (!name || !email) {
      setInviteError("Completa el nombre y el correo para enviar la invitación.");
      return;
    }

    if (users.some((user) => user.email.toLowerCase() === email)) {
      setInviteError("Ya existe un usuario con ese correo.");
      return;
    }

    addUser({
      name,
      email,
      role: inviteForm.role,
    });
    setInviteForm({ name: "", email: "", role: "Gestor" });
    setInviteOpen(false);
  };

  const handleExport = () => {
    const rows = [
      ["Nombre", "Correo", "Rol", "Estado", "Último acceso"],
      ...filteredUsers.map((user) => [
        user.name,
        user.email,
        user.role,
        user.status,
        formatLastAccess(user.lastAccessAt),
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "usuarios-kora.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

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
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow"
            >
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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as "all" | UserRole)
            }
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm"
          >
            <option value="all">Todos los roles</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | UserStatus)
            }
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm"
          >
            <option value="all">Todos los estados</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm"
          >
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
        {filteredUsers.length === 0 ? (
          <div className="px-6 py-8 text-sm text-gray-500">
            No hay usuarios que coincidan con la búsqueda.
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isLastAdmin = user.role === "Admin" && adminCount === 1;
            return (
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
                <select
                  value={user.role}
                  disabled={isLastAdmin}
                  onChange={(event) =>
                    updateUser(user.id, {
                      role: event.target.value as UserRole,
                    })
                  }
                  className="w-fit rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role.toUpperCase()}
                    </option>
                  ))}
                </select>
                <select
                  value={user.status}
                  disabled={isLastAdmin}
                  onChange={(event) =>
                    updateUser(user.id, {
                      status: event.target.value as UserStatus,
                    })
                  }
                  className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[user.status]}`}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">
                  {formatLastAccess(user.lastAccessAt)}
                </span>
                <button
                  type="button"
                  onClick={() => removeUser(user.id)}
                  disabled={isLastAdmin}
                  className="text-xs font-semibold text-rose-500 disabled:cursor-not-allowed disabled:text-gray-300"
                >
                  Eliminar
                </button>
              </div>
            );
          })
        )}
        <div className="flex items-center justify-between px-6 py-4 text-sm text-gray-500">
          <span>
            Mostrando {filteredUsers.length} de {users.length} usuarios
          </span>
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

      {inviteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Invitar usuario
                </h3>
                <p className="text-sm text-slate-500">
                  Envía una invitación para que se una a la asociación.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="mt-5 space-y-4">
              {inviteError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {inviteError}
                </div>
              ) : null}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Nombre completo
                </label>
                <input
                  value={inviteForm.name}
                  onChange={(event) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="María Gómez"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Correo electrónico
                </label>
                <input
                  value={inviteForm.email}
                  onChange={(event) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  type="email"
                  placeholder="maria@asociacion.org"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Rol</label>
                <select
                  value={inviteForm.role}
                  onChange={(event) =>
                    setInviteForm((prev) => ({
                      ...prev,
                      role: event.target.value as UserRole,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setInviteOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30 hover:bg-primary/90"
                >
                  Enviar invitación
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
