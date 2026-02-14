
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import PageTopbar from "@/components/PageTopbar";
import { useSessionStore } from "@/core/session/session.store";
import {
  type UserAccount,
  type UserPermissions,
  type UserRole,
  type UserStatus,
  useUsersStore,
} from "@/core/users/users.store";

const ROLE_OPTIONS: UserRole[] = ["Admin", "Gestor", "Lector"];
const STATUS_OPTIONS: UserStatus[] = ["Activo", "Pendiente"];

const ROLE_LABELS: Record<UserRole, string> = {
  Admin: "Administrador",
  Gestor: "Gestor",
  Lector: "Lector",
};

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  Admin: "bg-purple-50 text-purple-700",
  Gestor: "bg-blue-50 text-blue-700",
  Lector: "bg-slate-100 text-slate-600",
};

const STATUS_DOT_STYLES: Record<UserStatus, string> = {
  Activo: "bg-emerald-500",
  Pendiente: "bg-amber-500",
};

const DEFAULT_PERMISSIONS: UserPermissions = {
  modules: {
    accounting: true,
    events: true,
    contacts: true,
    documents: true,
    social: true,
  },
  actions: {
    view: true,
    edit: true,
    delete: false,
  },
};

const normalizePermissions = (
  permissions?: UserPermissions
): UserPermissions => {
  const modules = (permissions?.modules ?? {}) as Record<string, unknown>;
  const edit = permissions?.actions?.edit ?? DEFAULT_PERMISSIONS.actions.edit;
  return {
    modules: {
      accounting: Boolean(
        modules.accounting ?? modules.treasury ?? DEFAULT_PERMISSIONS.modules.accounting
      ),
      events: Boolean(modules.events ?? DEFAULT_PERMISSIONS.modules.events),
      contacts: Boolean(modules.contacts ?? DEFAULT_PERMISSIONS.modules.contacts),
      documents: Boolean(modules.documents ?? DEFAULT_PERMISSIONS.modules.documents),
      social: Boolean(modules.social ?? DEFAULT_PERMISSIONS.modules.social),
    },
    actions: {
      view: edit ? false : true,
      edit,
      delete: permissions?.actions?.delete ?? DEFAULT_PERMISSIONS.actions.delete,
    },
  };
};

const splitName = (value?: string) => {
  const parts = (value ?? "").trim().split(" ").filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
};

const getDisplayName = (user: {
  firstName?: string;
  lastName?: string;
  name?: string;
}) => {
  const composed = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return composed || user.name || "Sin nombre";
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

type UserFormState = {
  id?: string;
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  password: string;
  passwordRepeat: string;
  role: UserRole;
  status: UserStatus;
  photoUrl: string;
  permissions: UserPermissions;
};

const MODULE_LABELS: Record<keyof UserPermissions["modules"], string> = {
  accounting: "Tesorería",
  events: "Eventos",
  contacts: "Contactos",
  documents: "Documentos",
  social: "Redes sociales",
};

const clonePermissions = (permissions: UserPermissions): UserPermissions => ({
  modules: { ...permissions.modules },
  actions: { ...permissions.actions },
});

const createEmptyForm = (): UserFormState => ({
  firstName: "",
  lastName: "",
  dni: "",
  email: "",
  password: "",
  passwordRepeat: "",
  role: "Gestor",
  status: "Pendiente",
  photoUrl: "",
  permissions: clonePermissions(DEFAULT_PERMISSIONS),
});

const createFormFromUser = (user: UserAccount): UserFormState => {
  const displayName = getDisplayName(user);
  const fallback = splitName(user.name ?? displayName);
  const firstName = user.firstName ?? fallback.firstName;
  const lastName = user.lastName ?? fallback.lastName;
  return {
    id: user.id,
    firstName,
    lastName,
    dni: user.dni ?? "",
    email: user.email ?? "",
    password: "",
    passwordRepeat: "",
    role: user.role,
    status: user.status,
    photoUrl: user.photoUrl ?? "",
    permissions: clonePermissions(normalizePermissions(user.permissions)),
  };
};

const MODULE_ITEMS = [
  {
    key: "accounting",
    label: "Tesorería",
    description: "Gestión de cobros y facturas",
    icon: (
      <span className="material-symbols-outlined text-[20px]">
        receipt_long
      </span>
    ),
  },
  {
    key: "events",
    label: "Eventos",
    description: "Creación y control de eventos",
    icon: <span className="material-symbols-outlined text-[20px]">event</span>,
  },
  {
    key: "contacts",
    label: "Contactos",
    description: "Gestión de miembros y proveedores",
    icon: (
      <span className="material-symbols-outlined text-[20px]">groups</span>
    ),
  },
  {
    key: "documents",
    label: "Documentos",
    description: "Archivos, actas y plantillas",
    icon: (
      <span className="material-symbols-outlined text-[20px]">
        description
      </span>
    ),
  },
  {
    key: "social",
    label: "Redes Sociales",
    description: "Publicaciones y campañas",
    icon: <span className="material-symbols-outlined text-[20px]">share</span>,
  },
] as const;

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`relative inline-flex items-center ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-primary" />
      <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
    </label>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
      {open ? "visibility" : "visibility_off"}
    </span>
  );
}

export default function UsersSettingsPage() {
  const router = useRouter();
  const mode = useSessionStore((s) => s.mode);
  const hydrated = useSessionStore((s) => s.hydrated);
  const admin = useSessionStore((s) => s.admin);
  const companyCode = useSessionStore((s) => s.companyCode);
  const activeUserId = useSessionStore((s) => s.activeUserId);

  const users = useUsersStore((s) => s.users);
  const ensureSeed = useUsersStore((s) => s.ensureSeed);
  const addUser = useUsersStore((s) => s.addUser);
  const updateUser = useUsersStore((s) => s.updateUser);
  const removeUser = useUsersStore((s) => s.removeUser);
  const activeUser = users.find((user) => user.id === activeUserId);
  const isAdmin = activeUser?.role === "Admin";
  const canEditSidebar = isAdmin;

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<"summary" | "create" | "edit">(
    "summary"
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(createEmptyForm());
  const editorOpen = panelMode === "create" || panelMode === "edit";
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const canDeleteUser =
    isAdmin && panelMode === "edit" && userForm.id && userForm.id !== activeUserId;

  useEffect(() => {
    if (!hydrated || mode !== "authenticated") return;
    ensureSeed(companyCode, admin);
  }, [hydrated, mode, companyCode, admin, ensureSeed]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const normalizedUsers = useMemo(
    () =>
      users.map((user) => {
        const displayName = getDisplayName(user);
        const fallback = splitName(user.name ?? displayName);
        const firstName = user.firstName ?? fallback.firstName;
        const lastName = user.lastName ?? fallback.lastName;
        return {
          ...user,
          name: user.name ?? displayName,
          firstName,
          lastName,
          dni: user.dni ?? "",
          permissions: normalizePermissions(user.permissions),
        };
      }),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const scopedUsers =
      !isAdmin && activeUserId
        ? normalizedUsers.filter((user) => user.id === activeUserId)
        : normalizedUsers;
    const term = search.trim().toLowerCase();
    return scopedUsers.filter((user) => {
      const displayName = getDisplayName(user).toLowerCase();
      const matchesSearch =
        !term ||
        displayName.includes(term) ||
        user.email.toLowerCase().includes(term);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [normalizedUsers, search, roleFilter, statusFilter, isAdmin, activeUserId]);

  useEffect(() => {
    if (panelMode === "create") return;
    if (filteredUsers.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredUsers.some((u) => u.id === selectedId)) {
      setSelectedId(filteredUsers[0].id);
    }
  }, [filteredUsers, selectedId, panelMode]);

  const selectedUser = useMemo(
    () => filteredUsers.find((user) => user.id === selectedId) ?? null,
    [filteredUsers, selectedId]
  );
  const summaryPermissions = selectedUser
    ? normalizePermissions(selectedUser.permissions)
    : DEFAULT_PERMISSIONS;
  const canDeleteSummaryUser =
    isAdmin && selectedUser?.id && selectedUser.id !== activeUserId;

  const handleUserFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const firstName = userForm.firstName.trim();
    const lastName = userForm.lastName.trim();
    const dni = userForm.dni.trim();
    const email = userForm.email.trim().toLowerCase();
    const password = userForm.password.trim();
    const passwordRepeat = userForm.passwordRepeat.trim();
    const hasPassword = password.length > 0 || passwordRepeat.length > 0;
    const name = `${firstName} ${lastName}`.trim();

    if (!firstName || !lastName || !dni || !email) {
      setFormError("Completa nombre, apellidos, DNI y correo.");
      return;
    }

    if (panelMode === "create" && (!password || !passwordRepeat)) {
      setFormError("La contraseña es obligatoria al crear un usuario.");
      return;
    }

    if (hasPassword && password !== passwordRepeat) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    const emailTaken = users.some(
      (user) =>
        user.email.toLowerCase() === email &&
        (panelMode === "create" || user.id !== userForm.id)
    );
    if (emailTaken) {
      setFormError("Ya existe un usuario con ese correo.");
      return;
    }

    const payload = {
      firstName,
      lastName,
      dni,
      email,
      role: userForm.role,
      status: userForm.status,
      photoUrl: userForm.photoUrl.trim() || undefined,
      permissions: clonePermissions(userForm.permissions),
    };

    if (panelMode === "create") {
      addUser({
        ...payload,
        password,
      });
      const created =
        useUsersStore
          .getState()
          .users.find((user) => user.email.toLowerCase() === email) ?? null;
      setSelectedId(created?.id ?? null);
      setPanelMode("summary");
      setUserForm(createEmptyForm());
      setShowPassword(false);
      setShowRepeat(false);
      return;
    }

    if (panelMode === "edit" && userForm.id) {
      updateUser(userForm.id, {
        ...payload,
        name,
        ...(hasPassword ? { password } : {}),
      });
      setUserForm((prev) => ({ ...prev, password: "", passwordRepeat: "" }));
      setPanelMode("summary");
      setShowPassword(false);
      setShowRepeat(false);
    }
  };

  const setModuleEnabled = (
    key: keyof UserPermissions["modules"],
    enabled: boolean
  ) => {
    setUserForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        modules: {
          ...prev.permissions.modules,
          [key]: enabled,
        },
      },
    }));
  };

  const setActionEnabled = (
    key: keyof UserPermissions["actions"],
    enabled: boolean
  ) => {
    setUserForm((prev) => {
      const nextActions = {
        ...prev.permissions.actions,
        [key]: enabled,
      };
      const editEnabled = key === "edit" ? enabled : nextActions.edit;
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          actions: {
            ...nextActions,
            view: editEnabled ? false : true,
          },
        },
      };
    });
  };

  const handleDeleteUser = () => {
    if (!canDeleteUser || !userForm.id) return;
    const fullName = `${userForm.firstName} ${userForm.lastName}`.trim();
    const label = fullName || userForm.email || "este usuario";
    setDeleteRequest({ id: userForm.id, label });
  };

  const handleDeleteSelectedUser = () => {
    if (!canDeleteSummaryUser || !selectedUser) return;
    const label = getDisplayName(selectedUser) || selectedUser.email;
    setDeleteRequest({ id: selectedUser.id, label });
  };

  const confirmDeleteRequest = () => {
    if (!deleteRequest) return;
    removeUser(deleteRequest.id);
    setDeleteRequest(null);
    setSelectedId(null);
    setUserForm(createEmptyForm());
    setPanelMode("summary");
    setFormError(null);
    setShowPassword(false);
    setShowRepeat(false);
  };


  if (mode === "guest") {
    return (
      <div className="space-y-8">
        <PageTopbar>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Configuración &nbsp;&gt;&nbsp; Usuarios y Permisos
            </p>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Usuarios y Permisos
                </h1>
                <p className="text-sm text-gray-500">
                  Esta seccion solo esta disponible en cuentas autenticadas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/settings")}
                className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm"
              >
                ← Volver a configuracion
              </button>
            </div>
          </div>
        </PageTopbar>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
            <span className="material-symbols-outlined text-[24px]">info</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            Gestión no disponible en modo invitado
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Usuarios y Permisos
            </h1>
            <p className="text-sm text-gray-500">
              Administra el acceso de tu equipo a los diferentes módulos de la
              asociación.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm"
            >
              ← Volver a configuracion
            </button>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setUserForm(createEmptyForm());
                  setShowPassword(false);
                  setShowRepeat(false);
                  setPanelMode("create");
                  setSelectedId(null);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow"
              >
                <span className="material-symbols-outlined text-[18px]">
                  person_add
                </span>
                Añadir Usuario
              </button>
            ) : null}
          </div>
        </div>
      </PageTopbar>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">
              <span className="material-symbols-outlined text-[16px] leading-none">
                search
              </span>
            </span>
            <input
              placeholder="Buscar administradores o gestores por nombre o email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">
              tune
            </span>
            Filtros
          </button>
        </div>

        {filtersOpen ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  {ROLE_LABELS[role]}
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
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-gray-100 bg-gray-50 px-6 py-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
            <span>Usuario</span>
            <span>Rol</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="px-6 py-8 text-sm text-gray-500">
              No hay usuarios que coincidan con la búsqueda.
            </div>
          ) : (
            filteredUsers.map((user) => {
              const displayName = getDisplayName(user);
              const initials = getInitials(displayName);
              const isSelected = user.id === selectedId;
              return (
                <div
                  key={user.id}
                  onClick={() => {
                    setSelectedId(user.id);
                    setPanelMode("summary");
                  }}
                  className={`grid cursor-pointer grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 border-b border-gray-100 px-6 py-4 text-sm text-gray-700 transition last:border-none ${
                    isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {displayName}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLE_BADGE_STYLES[user.role]}`}
                    >
                      {ROLE_LABELS[user.role]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_STYLES[user.status]}`}
                    />
                    {user.status}
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(user.id);
                        if (isAdmin) {
                          setFormError(null);
                          setUserForm(createFormFromUser(user));
                          setShowPassword(false);
                          setShowRepeat(false);
                          setPanelMode("edit");
                        } else {
                          setPanelMode("summary");
                        }
                      }}
                      className="text-xs font-semibold text-primary"
                    >
                      {isAdmin
                        ? isSelected && panelMode === "edit"
                          ? "Editando..."
                          : "Editar usuario"
                        : "Ver resumen"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          {selectedUser ? (
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-slate-100 text-sm font-semibold text-slate-700">
                    {selectedUser.photoUrl ? (
                      <img
                        src={selectedUser.photoUrl}
                        alt={`Perfil de ${getDisplayName(selectedUser)}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>{getInitials(getDisplayName(selectedUser))}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                      Resumen del usuario
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getDisplayName(selectedUser)}
                    </h3>
                    <p className="text-sm text-primary">{ROLE_LABELS[selectedUser.role]}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Datos personales</p>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Correo</span>
                      <span className="font-semibold text-gray-800">{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">DNI</span>
                      <span className="font-semibold text-gray-800">
                        {selectedUser.dni || "Sin DNI"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Estado</span>
                      <span className="flex items-center gap-2 font-semibold text-gray-800">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_STYLES[selectedUser.status]}`}
                        />
                        {selectedUser.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Permisos actuales</p>
                  <div className="mt-3 space-y-3 text-sm text-gray-600">
                    <div>
                      <p className="text-xs font-semibold text-gray-500">Módulos habilitados</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(summaryPermissions.modules).filter(
                          ([, enabled]) => enabled
                        ).length === MODULE_ITEMS.length ? (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                            Todos los módulos
                          </span>
                        ) : Object.entries(summaryPermissions.modules)
                            .filter(([, enabled]) => enabled)
                            .map(([key]) => (
                              <span
                                key={key}
                                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
                              >
                                {MODULE_LABELS[key as keyof UserPermissions["modules"]]}
                              </span>
                            ))}
                        {Object.entries(summaryPermissions.modules).filter(
                          ([, enabled]) => enabled
                        ).length === 0 ? (
                          <span className="text-xs text-gray-400">
                            Sin acceso a módulos.
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500">Acciones</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {summaryPermissions.actions.edit ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                            Puede editar
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                            Solo lectura
                          </span>
                        )}
                        {summaryPermissions.actions.delete ? (
                          <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                            Puede eliminar
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-gray-400">
                    La contraseña no se muestra por motivos de seguridad.
                  </p>
                </div>
                {isAdmin ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormError(null);
                        setUserForm(createFormFromUser(selectedUser));
                        setShowPassword(false);
                        setShowRepeat(false);
                        setPanelMode("edit");
                      }}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Editar usuario
                    </button>
                    {canDeleteSummaryUser ? (
                      <button
                        type="button"
                        onClick={handleDeleteSelectedUser}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                      >
                        Eliminar usuario
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
              Selecciona un usuario para ver el resumen o crear uno nuevo.
            </div>
          )}
        </div>
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 px-4 py-8">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[24px]">
                    badge
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {panelMode === "create" ? "Crear usuario" : "Editar usuario"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Configura el perfil y los permisos del sistema.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPanelMode("summary");
                  setFormError(null);
                  setShowPassword(false);
                  setShowRepeat(false);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <form onSubmit={handleUserFormSubmit} className="flex max-h-[75vh] flex-col">
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {formError ? (
                  <div className="px-6 pt-6">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {formError}
                    </div>
                  </div>
                ) : null}

                <section className="px-6 py-6 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <span className="material-symbols-outlined text-[16px]">
                        person
                      </span>
                    </span>
                    Informacion personal
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Nombre</label>
                      <input
                        value={userForm.firstName}
                        onChange={(event) =>
                          setUserForm((prev) => ({
                            ...prev,
                            firstName: event.target.value,
                          }))
                        }
                        placeholder="Ej. Juan"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Apellidos</label>
                      <input
                        value={userForm.lastName}
                        onChange={(event) =>
                          setUserForm((prev) => ({
                            ...prev,
                            lastName: event.target.value,
                          }))
                        }
                        placeholder="Ej. Perez Garcia"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">
                        DNI / Identificacion
                      </label>
                      <input
                        value={userForm.dni}
                        onChange={(event) =>
                          setUserForm((prev) => ({
                            ...prev,
                            dni: event.target.value,
                          }))
                        }
                        placeholder="12345678X"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">
                        Rol de usuario
                      </label>
                      <select
                        value={userForm.role}
                        onChange={(event) =>
                          setUserForm((prev) => ({
                            ...prev,
                            role: event.target.value as UserRole,
                          }))
                        }
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-gray-500">
                        Estado del usuario
                      </label>
                      <select
                        value={userForm.status}
                        onChange={(event) =>
                          setUserForm((prev) => ({
                            ...prev,
                            status: event.target.value as UserStatus,
                          }))
                        }
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="px-6 py-6 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <span className="material-symbols-outlined text-[16px]">
                        lock
                      </span>
                    </span>
                    Seguridad y acceso
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-gray-500">
                        Correo electrónico
                      </label>
                      <input
                        value={userForm.email}
                        onChange={(event) =>
                          setUserForm((prev) => ({
                            ...prev,
                            email: event.target.value,
                          }))
                        }
                        type="email"
                        placeholder="juan.perez@empresa.com"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">
                        Contraseña
                      </label>
                      <div className="relative mt-2">
                        <input
                          value={userForm.password}
                          onChange={(event) =>
                            setUserForm((prev) => ({
                              ...prev,
                              password: event.target.value,
                            }))
                          }
                          type={showPassword ? "text" : "password"}
                          placeholder="********"
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          <EyeIcon open={showPassword} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">
                        Repetir contraseña
                      </label>
                      <div className="relative mt-2">
                        <input
                          value={userForm.passwordRepeat}
                          onChange={(event) =>
                            setUserForm((prev) => ({
                              ...prev,
                              passwordRepeat: event.target.value,
                            }))
                          }
                          type={showRepeat ? "text" : "password"}
                          placeholder="********"
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRepeat((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          aria-label={showRepeat ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          <EyeIcon open={showRepeat} />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="px-6 py-6 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <span className="material-symbols-outlined text-[16px]">
                        apps
                      </span>
                    </span>
                    Acceso a módulos
                  </div>
                  <p className="text-sm text-gray-500">
                    Determina a qué partes del ecosistema Kora tiene acceso este usuario.
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {MODULE_ITEMS.map((module) => {
                      const isAdminSelected = userForm.role === "Admin";
                      const enabled = Boolean(userForm.permissions.modules[module.key]);
                      return (
                        <div
                          key={module.key}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-3"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              {module.icon}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {module.label}
                              </p>
                              <p className="text-xs text-gray-500">
                                {module.description}
                              </p>
                            </div>
                          </div>
                          <ToggleSwitch
                            checked={isAdminSelected ? true : enabled}
                            disabled={isAdminSelected || !canEditSidebar}
                            onChange={() => {
                              if (isAdminSelected || !canEditSidebar) return;
                              setModuleEnabled(module.key, !enabled);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Puede editar</p>
                        <p className="text-xs text-gray-400">Incluye acceso de lectura.</p>
                      </div>
                      <ToggleSwitch
                        checked={userForm.permissions.actions.edit}
                        disabled={!canEditSidebar}
                        onChange={() =>
                          setActionEnabled("edit", !userForm.permissions.actions.edit)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Puede eliminar</p>
                        <p className="text-xs text-gray-400">Permite borrar registros.</p>
                      </div>
                      <ToggleSwitch
                        checked={userForm.permissions.actions.delete}
                        disabled={!canEditSidebar}
                        onChange={() =>
                          setActionEnabled("delete", !userForm.permissions.actions.delete)
                        }
                      />
                    </div>
                  </div>
                </section>
              </div>

              <div className="border-t border-gray-100 bg-white px-6 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {canDeleteUser ? (
                    <button
                      type="button"
                      onClick={handleDeleteUser}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100"
                    >
                      Eliminar usuario
                    </button>
                  ) : (
                    <span />
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setPanelMode("summary");
                        setFormError(null);
                        setShowPassword(false);
                        setShowRepeat(false);
                      }}
                      className="rounded-2xl border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!canEditSidebar}
                      className={`rounded-2xl px-5 py-2 text-sm font-semibold text-white shadow ${
                        canEditSidebar
                          ? "bg-primary hover:bg-primary/90"
                          : "cursor-not-allowed bg-primary/50"
                      }`}
                    >
                      Guardar cambios
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {portalReady && deleteRequest
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setDeleteRequest(null)}
              />
              <div className="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                    <span className="material-symbols-outlined text-[20px]">
                      delete
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Confirmar eliminación
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      ¿Eliminar a {deleteRequest.label}? Esta acción no se puede deshacer.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteRequest(null)}
                    className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteRequest}
                    className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    Eliminar usuario
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
