"use client";

import { useMemo, useRef, useState } from "react";
import PageTopbar from "@/components/PageTopbar";
import { useSessionStore } from "@/core/session/session.store";
import { type UserAccount, useUsersStore } from "@/core/users/users.store";

type UserProfileFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  photoUrl: string;
  dni: string;
  email: string;
  password: string;
  passwordRepeat: string;
};

function normalize(value: string) {
  return value.trim();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getUserFormState(user: UserAccount | null): UserProfileFormState {
  return {
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
    photoUrl: user?.photoUrl ?? "",
    dni: user?.dni ?? "",
    email: user?.email ?? "",
    password: "",
    passwordRepeat: "",
  };
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.82 21.82 0 0 1 5.06-6.94" />
      <path d="M1 1l22 22" />
      <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
      <path d="M14.12 14.12L9.88 9.88" />
    </svg>
  );
}

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

function UserProfileCard({
  user,
  onSave,
}: {
  user: UserAccount | null;
  onSave: (updates: Partial<UserAccount>) => void;
}) {
  const [form, setForm] = useState<UserProfileFormState>(
    getUserFormState(user)
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const fullName = `${form.firstName} ${form.lastName}`.trim();
  const displayName = fullName || user?.name || "Usuario";
  const initials = getInitials(displayName || "Usuario");
  const roleLabel =
    user?.role === "Admin"
      ? "Administrador"
      : user?.role === "Gestor"
        ? "Gestor"
        : user?.role === "Lector"
          ? "Lector"
          : "Usuario";
  const memberSinceLabel = user?.lastAccessAt
    ? new Date(user.lastAccessAt).toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
      })
    : "Sin fecha";

  const hasChanges = useMemo(() => {
    if (!user) return false;
    return (
      normalize(form.firstName) !== normalize(user.firstName ?? "") ||
      normalize(form.lastName) !== normalize(user.lastName ?? "") ||
      normalize(form.phone) !== normalize(user.phone ?? "") ||
      normalize(form.photoUrl) !== normalize(user.photoUrl ?? "") ||
      normalize(form.dni) !== normalize(user.dni ?? "") ||
      normalizeEmail(form.email) !== normalizeEmail(user.email ?? "") ||
      normalize(form.password) !== "" ||
      normalize(form.passwordRepeat) !== ""
    );
  }, [form, user]);

  const hasPassword =
    normalize(form.password).length > 0 ||
    normalize(form.passwordRepeat).length > 0;
  const passwordsMatch = form.password === form.passwordRepeat;
  const canSave =
    hasChanges &&
    normalize(form.firstName).length > 0 &&
    normalize(form.lastName).length > 0 &&
    normalize(form.dni).length > 0 &&
    normalizeEmail(form.email).length > 0 &&
    (!hasPassword || passwordsMatch);

  const handleSave = () => {
    if (!user) return;
    setFormError(null);
    const firstName = normalize(form.firstName);
    const lastName = normalize(form.lastName);
    const phone = normalize(form.phone);
    const photoUrl = normalize(form.photoUrl);
    const dni = normalize(form.dni).toUpperCase();
    const email = normalizeEmail(form.email);
    const password = form.password;

    if (!firstName || !lastName || !dni || !email) {
      setFormError("Completa nombre, apellidos, DNI y correo.");
      return;
    }

    if (hasPassword && !passwordsMatch) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    const updates: Partial<UserAccount> = {
      firstName,
      lastName,
      phone,
      photoUrl,
      dni,
      email,
      name: `${firstName} ${lastName}`.trim(),
    };

    if (hasPassword) {
      updates.password = password;
    }

    onSave(updates);
    setLastSavedAt(Date.now());
    setPasswordOpen(false);
    setForm((prev) => ({
      ...prev,
      firstName,
      lastName,
      phone,
      photoUrl,
      dni,
      email,
      password: "",
      passwordRepeat: "",
    }));
  };

  const handleReset = () => {
    setForm(getUserFormState(user));
    setFormError(null);
    setPasswordOpen(false);
  };

  const handlePhotoChange = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, photoUrl: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFullNameChange = (value: string) => {
    const parts = value.trim().split(" ").filter(Boolean);
    const nextFirstName = parts.shift() ?? "";
    const nextLastName = parts.join(" ");
    setForm((prev) => ({
      ...prev,
      firstName: nextFirstName,
      lastName: nextLastName,
    }));
  };

  if (!user) {
    return (
      <section className="rounded-3xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
        No hay un usuario activo para editar.
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-slate-100 text-2xl font-semibold text-slate-700">
              {form.photoUrl ? (
                <img
                  src={form.photoUrl}
                  alt={`Perfil de ${displayName}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials || "U"}</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
              <p className="text-sm text-primary">{roleLabel}</p>
              <p className="text-xs text-gray-400">
                Miembro desde: {memberSinceLabel}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50">
              Cambiar imagen
              <input
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="sr-only"
                onChange={(event) => handlePhotoChange(event.target.files?.[0])}
              />
            </label>
            {form.photoUrl ? (
              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, photoUrl: "" }));
                  if (photoInputRef.current) {
                    photoInputRef.current.value = "";
                  }
                }}
                className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-500 shadow-sm hover:bg-rose-50"
              >
                Eliminar foto
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {formError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {formError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="7" r="4" />
                <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
              </svg>
            </span>
            Datos Personales
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500">
                Nombre completo
              </label>
              <input
                value={fullName}
                onChange={(event) => handleFullNameChange(event.target.value)}
                placeholder="Juan Perez"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">
                Correo electrónico profesional
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder="juan.perez@kora.org"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">
                Teléfono de contacto
              </label>
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                placeholder="+34 612 345 678"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">
                DNI / Identificacion
              </label>
              <input
                value={form.dni}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, dni: event.target.value }))
                }
                placeholder="12345678X"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            Seguridad y Cuenta
          </div>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Contraseña</p>
                <p className="text-xs text-gray-400">
                  Última actualización: {lastSavedAt ? new Date(lastSavedAt).toLocaleDateString() : "Sin cambios"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPasswordOpen((prev) => {
                    if (prev) {
                      setForm((current) => ({
                        ...current,
                        password: "",
                        passwordRepeat: "",
                      }));
                      setShowPassword(false);
                      setShowRepeat(false);
                    }
                    return !prev;
                  });
                }}
                className="text-sm font-semibold text-primary"
              >
                {passwordOpen ? "Cancelar" : "Cambiar"}
              </button>
            </div>

            {passwordOpen ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-gray-500">
                    Nueva contraseña
                  </label>
                  <div className="relative mt-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }))
                      }
                      placeholder="********"
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-11 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={
                        showPassword ? "Ocultar contraseña" : "Ver contraseña"
                      }
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
                      type={showRepeat ? "text" : "password"}
                      value={form.passwordRepeat}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          passwordRepeat: event.target.value,
                        }))
                      }
                      placeholder="********"
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-11 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRepeat((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={
                        showRepeat ? "Ocultar contraseña" : "Ver contraseña"
                      }
                    >
                      <EyeIcon open={showRepeat} />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Autenticación 2FA</p>
                <p className="text-xs text-gray-400">
                  Activada vía App de autenticación
                </p>
              </div>
              <ToggleSwitch
                checked={twoFactorEnabled}
                onChange={() => setTwoFactorEnabled((prev) => !prev)}
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Sesiones activas</p>
                <p className="text-xs text-gray-400">Conectado en 2 dispositivos</p>
              </div>
              <button type="button" className="text-sm font-semibold text-primary">
                Ver detalles
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasChanges}
          className={`rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition ${
            hasChanges
              ? "text-gray-600 hover:bg-gray-50"
              : "cursor-not-allowed text-gray-300 opacity-60"
          }`}
        >
          Descartar
        </button>
        <button
          id="profile-user-save"
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={`rounded-2xl px-5 py-2 text-sm font-semibold text-white shadow transition ${
            canSave ? "bg-primary hover:bg-primary/90" : "cursor-not-allowed bg-primary/50"
          }`}
        >
          Guardar Cambios
        </button>
      </div>
      {lastSavedAt ? (
        <p className="text-xs text-gray-400">
          Última actualización: {new Date(lastSavedAt).toLocaleString()}
        </p>
      ) : null}
    </section>
  );
}

export default function ProfileSettingsPage() {
  const hydrated = useSessionStore((s) => s.hydrated);
  const activeUserId = useSessionStore((s) => s.activeUserId);
  const users = useUsersStore((s) => s.users);
  const updateUser = useUsersStore((s) => s.updateUser);
  const activeUser = users.find((user) => user.id === activeUserId) ?? null;

  const [uiLanguage, setUiLanguage] = useState("Español (España)");
  const [uiTimezone, setUiTimezone] = useState("(GMT+01:00) Madrid");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [updatesNotifications, setUpdatesNotifications] = useState(true);

  if (!hydrated) {
    return <div className="min-h-screen bg-background-light" aria-busy="true" />;
  }

  return (
    <div className="space-y-8">
      <PageTopbar>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Configuración &nbsp;&gt;&nbsp; Perfil
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">
              Configuración del Perfil
            </h1>
            <p className="text-sm text-gray-500">
              Gestiona tu información personal y preferencias de cuenta.
            </p>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById("profile-user-save")?.click()}
            className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow"
          >
            Guardar Cambios
          </button>
        </div>
      </PageTopbar>

      <UserProfileCard
        user={activeUser}
        onSave={(updates) => {
          if (!activeUser) return;
          updateUser(activeUser.id, updates);
        }}
      />

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="m19.4 15-2.1-1.2" />
              <path d="m4.6 15 2.1-1.2" />
              <path d="m19.4 9-2.1 1.2" />
              <path d="m4.6 9 2.1 1.2" />
              <path d="M12 3v3" />
              <path d="M12 18v3" />
            </svg>
          </span>
          Preferencias
        </div>
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500">
                Idioma de la interfaz
              </label>
              <select
                value={uiLanguage}
                onChange={(event) => setUiLanguage(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              >
                <option>Español (España)</option>
                <option>Español (Latam)</option>
                <option>English (US)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">
                Zona Horaria
              </label>
              <select
                value={uiTimezone}
                onChange={(event) => setUiTimezone(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              >
                <option>(GMT+01:00) Madrid</option>
                <option>(GMT+00:00) Lisboa</option>
                <option>(GMT-03:00) Buenos Aires</option>
              </select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Notificaciones del sistema
                </p>
                <p className="text-xs text-gray-400">
                  Avisos generales y cambios importantes.
                </p>
              </div>
              <ToggleSwitch
                checked={updatesNotifications}
                onChange={() => setUpdatesNotifications((prev) => !prev)}
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Alertas por correo electrónico
                </p>
                <p className="text-xs text-gray-400">
                  Recibe resúmenes y notificaciones clave.
                </p>
              </div>
              <ToggleSwitch
                checked={emailNotifications}
                onChange={() => setEmailNotifications((prev) => !prev)}
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Notificaciones en el navegador
                </p>
                <p className="text-xs text-gray-400">
                  Avisos en tiempo real desde el navegador.
                </p>
              </div>
              <ToggleSwitch
                checked={browserNotifications}
                onChange={() => setBrowserNotifications((prev) => !prev)}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
