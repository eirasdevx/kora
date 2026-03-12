"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageTopbar from "@/components/PageTopbar";
import { useSessionStore } from "@/core/session/session.store";
import {
  createDefaultPreferences,
  type SecurityActivityEntry,
  type UserAccount,
  useUsersStore,
} from "@/core/users/users.store";
import {
  createPasswordDigest,
  verifyPassword,
} from "@/core/security/passwords";
import {
  buildOtpAuthUrl,
  generateTwoFactorSecret,
  verifyTotp,
} from "@/core/security/totp";

const createActivityId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const resolveDeviceLabel = () => {
  if (typeof navigator === "undefined") return "Navegador";
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "Navegador";
  const os = /Macintosh|Mac OS X/.test(ua)
    ? "macOS"
    : /Windows/.test(ua)
      ? "Windows"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iPod/.test(ua)
          ? "iOS"
          : "Linux";
  return `${browser} en ${os}`;
};

const createActivityEntry = (
  action: string,
  overrides?: Partial<Omit<SecurityActivityEntry, "action" | "id" | "timestamp">>
): SecurityActivityEntry => ({
  id: createActivityId(),
  action,
  device: overrides?.device ?? resolveDeviceLabel(),
  location: overrides?.location ?? "Local",
  timestamp: new Date().toISOString(),
});

const BASE_ACTIVITY: SecurityActivityEntry[] = [];

const passwordRules = (value: string) => {
  const trimmed = value.trim();
  const length = trimmed.length >= 12;
  const upper = /[A-Z]/.test(trimmed);
  const number = /\d/.test(trimmed);
  const special = /[^A-Za-z0-9]/.test(trimmed);
  return {
    length,
    upper,
    number,
    special,
    valid: length && upper && number && special,
  };
};

const formatActivityDate = (date: Date) => {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (date.toDateString() === today) {
    return `Hoy, ${time}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `Ayer, ${time}`;
  }
  return `${date.toLocaleDateString("es-ES")}, ${time}`;
};

export default function SecuritySettingsPage() {
  const router = useRouter();
  const hydrated = useSessionStore((s) => s.hydrated);
  const mode = useSessionStore((s) => s.mode);
  const admin = useSessionStore((s) => s.admin);
  const companyCode = useSessionStore((s) => s.companyCode);
  const activeUserId = useSessionStore((s) => s.activeUserId);
  const setAdmin = useSessionStore((s) => s.setAdmin);
  const users = useUsersStore((s) => s.users);
  const ensureSeed = useUsersStore((s) => s.ensureSeed);
  const updateUser = useUsersStore((s) => s.updateUser);
  const activeUser = users.find((user) => user.id === activeUserId) ?? null;

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const fallbackPreferences = useMemo(() => createDefaultPreferences(), []);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    () =>
      activeUser?.preferences?.twoFactorEnabled ??
      fallbackPreferences.twoFactorEnabled
  );
  const [twoFactorMode, setTwoFactorMode] = useState<
    "idle" | "setup" | "disable"
  >("idle");
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const activityItems = useMemo(
    () => activeUser?.securityActivity ?? BASE_ACTIVITY,
    [activeUser?.securityActivity]
  );

  useEffect(() => {
    if (!hydrated || mode !== "authenticated") return;
    ensureSeed(companyCode, admin);
  }, [hydrated, mode, companyCode, admin, ensureSeed]);

  useEffect(() => {
    setTwoFactorEnabled(
      activeUser?.preferences?.twoFactorEnabled ??
        fallbackPreferences.twoFactorEnabled
    );
    setTwoFactorMode("idle");
    setTwoFactorSecret(null);
    setTwoFactorCode("");
    setTwoFactorError(null);
  }, [
    activeUser?.id,
    activeUser?.preferences?.twoFactorEnabled,
    activeUser?.preferences?.twoFactorSecret,
    fallbackPreferences,
  ]);

  const passwordChecks = useMemo(
    () => passwordRules(form.newPassword),
    [form.newPassword]
  );
  const passwordsMatch =
    form.confirmPassword.length === 0 ||
    form.newPassword.trim() === form.confirmPassword.trim();
  const passwordAttempted = Boolean(
    form.currentPassword ||
      form.newPassword ||
      form.confirmPassword
  );
  const basePreferences = activeUser?.preferences ?? fallbackPreferences;
  const hasTwoFactorSecret = Boolean(basePreferences.twoFactorSecret);
  const isTwoFactorActive = twoFactorEnabled && hasTwoFactorSecret;
  const needsTwoFactorSetup =
    twoFactorMode === "setup" || (twoFactorEnabled && !hasTwoFactorSecret);
  const hasPasswordChange = passwordAttempted;
  const canSave =
    !saving &&
    hasPasswordChange &&
    form.currentPassword.trim().length > 0 &&
    form.newPassword.trim().length > 0 &&
    form.confirmPassword.trim().length > 0 &&
    passwordChecks.valid &&
    passwordsMatch;

  const resetForm = () => {
    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handleDiscard = () => {
    resetForm();
    setStatus(null);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!activeUser) {
      setStatus({
        type: "error",
        message: "No hay un usuario activo para actualizar.",
      });
      return;
    }

    const currentPassword = form.currentPassword.trim();
    const newPassword = form.newPassword.trim();
    const confirmPassword = form.confirmPassword.trim();

    if (hasPasswordChange) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setStatus({
          type: "error",
          message: "Completa la contraseña actual y la nueva contraseña.",
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        setStatus({
          type: "error",
          message: "La nueva contraseña y la confirmación no coinciden.",
        });
        return;
      }
      if (!passwordChecks.valid) {
        setStatus({
          type: "error",
          message:
            "La nueva contraseña no cumple los requisitos de seguridad.",
        });
        return;
      }
    }

    setSaving(true);
    setStatus(null);

    try {
      const updates: Partial<UserAccount> = {};
      const activityUpdates: SecurityActivityEntry[] = [];

      if (hasPasswordChange) {
        const digest = activeUser.passwordDigest ?? admin?.passwordDigest;
        const legacyPassword = activeUser.password ?? admin?.password;
        const isValid = digest
          ? await verifyPassword(currentPassword, digest)
          : legacyPassword === currentPassword;

        if (!isValid) {
          setStatus({
            type: "error",
            message: "La contraseña actual no es correcta.",
          });
          setSaving(false);
          return;
        }

        const passwordDigest = await createPasswordDigest(newPassword);
        updates.passwordDigest = passwordDigest;
        updates.password = undefined;
        activityUpdates.push(createActivityEntry("Cambio de contraseña"));

        if (activeUser.role === "Admin" && admin) {
          setAdmin({ ...admin, passwordDigest });
        }
      }

      if (activityUpdates.length > 0) {
        updates.securityActivity = [
          ...activityUpdates,
          ...(activeUser.securityActivity ?? []),
        ].slice(0, 12);
      }

      if (Object.keys(updates).length === 0) {
        setStatus({
          type: "error",
          message: "No hay cambios por guardar.",
        });
        setSaving(false);
        return;
      }

      updateUser(activeUser.id, updates);
      setStatus({
        type: "success",
        message: "Seguridad actualizada correctamente.",
      });
      resetForm();
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message:
          "No se pudo actualizar la seguridad. Inténtalo de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  };

  const otpAuthUrl = useMemo(() => {
    if (!twoFactorSecret) return "";
    const label =
      activeUser?.email ||
      activeUser?.name ||
      activeUser?.firstName ||
      "usuario";
    return buildOtpAuthUrl({
      secret: twoFactorSecret,
      issuer: "Kora",
      label,
    });
  }, [twoFactorSecret, activeUser?.email, activeUser?.name, activeUser?.firstName]);

  const qrCodeUrl = useMemo(() => {
    if (!otpAuthUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      otpAuthUrl
    )}`;
  }, [otpAuthUrl]);

  const formattedSecret = useMemo(() => {
    if (!twoFactorSecret) return "";
    const parts = twoFactorSecret.match(/.{1,4}/g);
    return parts ? parts.join(" ") : twoFactorSecret;
  }, [twoFactorSecret]);

  const startTwoFactorSetup = () => {
    try {
      const secret = generateTwoFactorSecret();
      setTwoFactorSecret(secret);
      setTwoFactorCode("");
      setTwoFactorError(null);
      setTwoFactorMode("setup");
      setStatus(null);
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: "No se pudo generar la clave de 2FA.",
      });
    }
  };

  const startTwoFactorDisable = () => {
    setTwoFactorCode("");
    setTwoFactorError(null);
    setTwoFactorMode("disable");
    setStatus(null);
  };

  const cancelTwoFactorFlow = () => {
    setTwoFactorMode("idle");
    setTwoFactorSecret(null);
    setTwoFactorCode("");
    setTwoFactorError(null);
    setStatus(null);
  };

  const handleEnableTwoFactor = async () => {
    if (!activeUser || !twoFactorSecret) return;
    if (!twoFactorCode.trim()) {
      setTwoFactorError("Introduce el código de verificación.");
      return;
    }
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      const valid = await verifyTotp({
        token: twoFactorCode,
        secret: twoFactorSecret,
      });
      if (!valid) {
        setTwoFactorError("El código es incorrecto. Inténtalo de nuevo.");
        return;
      }
      const preferences = {
        ...basePreferences,
        twoFactorEnabled: true,
        twoFactorSecret,
        twoFactorVerifiedAt: new Date().toISOString(),
      };
      const securityActivity = [
        createActivityEntry("2FA activado"),
        ...(activeUser.securityActivity ?? []),
      ].slice(0, 12);
      updateUser(activeUser.id, { preferences, securityActivity });
      setTwoFactorEnabled(true);
      setStatus({
        type: "success",
        message: "Autenticación en dos pasos activada correctamente.",
      });
      cancelTwoFactorFlow();
    } catch (error) {
      console.error(error);
      setTwoFactorError(
        "No se pudo validar el código. Inténtalo de nuevo."
      );
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!activeUser) return;
    const secret = basePreferences.twoFactorSecret;
    if (secret) {
      if (!twoFactorCode.trim()) {
        setTwoFactorError("Introduce el código de verificación.");
        return;
      }
      setTwoFactorLoading(true);
      setTwoFactorError(null);
      try {
        const valid = await verifyTotp({
          token: twoFactorCode,
          secret,
        });
        if (!valid) {
          setTwoFactorError("El código es incorrecto. Inténtalo de nuevo.");
          return;
        }
      } catch (error) {
        console.error(error);
        setTwoFactorError("No se pudo validar el código.");
        return;
      } finally {
        setTwoFactorLoading(false);
      }
    }

    const preferences = {
      ...basePreferences,
      twoFactorEnabled: false,
      twoFactorSecret: undefined,
      twoFactorVerifiedAt: undefined,
    };
    const securityActivity = [
      createActivityEntry("2FA desactivado"),
      ...(activeUser.securityActivity ?? []),
    ].slice(0, 12);
    updateUser(activeUser.id, { preferences, securityActivity });
    setTwoFactorEnabled(false);
    setStatus({
      type: "success",
      message: "Autenticación en dos pasos desactivada.",
    });
    cancelTwoFactorFlow();
  };

  if (!hydrated) {
    return <div className="min-h-screen bg-background-light" aria-busy="true" />;
  }

  if (mode === "guest") {
    return (
      <div className="space-y-8">
        <PageTopbar>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Configuracion &gt; Seguridad
              </p>
              <h1 className="text-2xl font-semibold text-gray-900">
                Seguridad
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
              Volver a configuracion
            </button>
          </div>
        </PageTopbar>

        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
            <span className="material-symbols-outlined text-[24px]">info</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            Seguridad no disponible en modo invitado
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Inicia sesion para gestionar contrasenas, 2FA y actividad de acceso.
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <PageTopbar>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Configuración &nbsp;›&nbsp; Seguridad
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">Seguridad</h1>
            <p className="text-sm text-gray-500">
              Gestiona el acceso a tu cuenta y protege la integridad de los datos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm"
          >
            ← Volver a configuración
          </button>
        </div>
      </PageTopbar>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Cambiar Contraseña
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Recomendamos usar una contraseña robusta que no utilices en otros
            servicios.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Contraseña Actual
            </label>
            <input
              type="password"
              value={form.currentPassword}
              onChange={(event) => {
                setForm((prev) => ({
                  ...prev,
                  currentPassword: event.target.value,
                }));
                setStatus(null);
              }}
              placeholder="Introduce tu contraseña actual"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={form.newPassword}
                onChange={(event) => {
                  setForm((prev) => ({
                    ...prev,
                    newPassword: event.target.value,
                  }));
                  setStatus(null);
                }}
                placeholder="Mínimo 12 caracteres"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => {
                  setForm((prev) => ({
                    ...prev,
                    confirmPassword: event.target.value,
                  }));
                  setStatus(null);
                }}
                placeholder="Repite la nueva contraseña"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
            La contraseña debe tener al menos 12 caracteres, incluir una
            mayúscula, un número y un carácter especial.
          </div>
          {!passwordsMatch ? (
            <p className="text-xs font-semibold text-rose-600">
              Las contraseñas no coinciden.
            </p>
          ) : null}
          {form.newPassword && !passwordChecks.valid ? (
            <p className="text-xs text-amber-600">
              Asegúrate de cumplir todos los requisitos de seguridad.
            </p>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Autenticación en dos pasos (2FA)
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Añade una capa extra de seguridad solicitando un código de tu
            móvil al iniciar sesión.
          </p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                isTwoFactorActive
                  ? "bg-emerald-100 text-emerald-600"
                  : needsTwoFactorSetup
                    ? "bg-amber-100 text-amber-600"
                    : "bg-gray-100 text-gray-500"
              }`}
            >
              <span className="text-sm font-semibold">
                {isTwoFactorActive ? "✓" : needsTwoFactorSetup ? "!" : "!"}
              </span>
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {isTwoFactorActive
                  ? "2FA está activado"
                  : needsTwoFactorSetup
                    ? "2FA pendiente de configuración"
                    : "2FA está desactivado"}
              </p>
              <p className="text-xs text-gray-500">
                {isTwoFactorActive
                  ? "Tu cuenta está protegida con verificación adicional."
                  : needsTwoFactorSetup
                    ? "Completa la configuración para proteger tu cuenta."
                    : "Activa el 2FA para proteger tu cuenta."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatus(null);
              if (isTwoFactorActive) {
                startTwoFactorDisable();
              } else {
                startTwoFactorSetup();
              }
            }}
            className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {isTwoFactorActive ? "Desactivar" : "Configurar"}
          </button>
        </div>
        {twoFactorMode === "setup" ? (
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 p-3">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Código QR para 2FA"
                    className="h-[200px] w-[200px]"
                  />
                ) : (
                  <div className="text-xs text-gray-400">Generando QR...</div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Escanea el código QR
                  </p>
                  <p className="text-xs text-gray-500">
                    Usa Google Authenticator, Authy o Microsoft Authenticator.
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-gray-700">
                      Clave secreta
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (twoFactorSecret) {
                          void navigator.clipboard?.writeText(twoFactorSecret);
                          setStatus({
                            type: "success",
                            message: "Clave secreta copiada al portapapeles.",
                          });
                        }
                      }}
                      className="text-xs font-semibold text-blue-600"
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="mt-2 font-mono text-sm text-gray-800">
                    {formattedSecret}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">
                  Código de verificación
                </label>
                <input
                  value={twoFactorCode}
                  onChange={(event) => {
                    const nextValue = event.target.value.replace(/\D/g, "");
                    setTwoFactorCode(nextValue);
                    setTwoFactorError(null);
                  }}
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelTwoFactorFlow}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEnableTwoFactor}
                  disabled={twoFactorLoading}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white ${
                    twoFactorLoading
                      ? "bg-primary/60"
                      : "bg-primary hover:bg-primary/90"
                  }`}
                >
                  {twoFactorLoading ? "Verificando..." : "Activar 2FA"}
                </button>
              </div>
            </div>
            {twoFactorError ? (
              <p className="mt-2 text-xs font-semibold text-rose-600">
                {twoFactorError}
              </p>
            ) : null}
          </div>
        ) : null}
        {twoFactorMode === "disable" ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-900">
                Desactivar 2FA
              </p>
              <p className="text-xs text-gray-500">
                Introduce el código de tu app para confirmar la desactivación.
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-semibold text-gray-500">
                  Código de verificación
                </label>
                <input
                  value={twoFactorCode}
                  onChange={(event) => {
                    const nextValue = event.target.value.replace(/\D/g, "");
                    setTwoFactorCode(nextValue);
                    setTwoFactorError(null);
                  }}
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancelTwoFactorFlow}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDisableTwoFactor}
                  disabled={twoFactorLoading}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white ${
                    twoFactorLoading
                      ? "bg-gray-500"
                      : "bg-gray-900 hover:bg-gray-800"
                  }`}
                >
                  {twoFactorLoading ? "Verificando..." : "Desactivar"}
                </button>
              </div>
            </div>
            {twoFactorError ? (
              <p className="mt-2 text-xs font-semibold text-rose-600">
                {twoFactorError}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Registro de Actividad
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Historial de los últimos inicios de sesión y acciones críticas
              realizadas.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <div className="grid grid-cols-4 gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              <span>Acción</span>
              <span>Dispositivo</span>
              <span>Ubicación / IP</span>
              <span>Fecha</span>
            </div>
            {activityItems.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-400">
                No hay actividad registrada todavía.
              </div>
            ) : (
              activityItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-4 gap-3 border-b border-gray-100 px-4 py-3 text-sm text-gray-600 last:border-none"
                >
                  <span>{item.action}</span>
                  <span>{item.device}</span>
                  <span>{item.location}</span>
                  <span>
                    {item.timestamp
                      ? formatActivityDate(new Date(item.timestamp))
                      : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {status ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {status.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-500">
          Protege tu cuenta con una configuración segura.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!hasPasswordChange}
            className={`rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold transition ${
              hasPasswordChange
                ? "text-gray-600 hover:bg-gray-50"
                : "cursor-not-allowed text-gray-300 opacity-60"
            }`}
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={`rounded-2xl px-5 py-2 text-sm font-semibold text-white shadow transition ${
              canSave
                ? "bg-primary hover:bg-primary/90"
                : "cursor-not-allowed bg-primary/50"
            }`}
          >
            {saving ? "Guardando..." : "Actualizar Seguridad"}
          </button>
        </div>
      </div>
    </div>
  );
}
