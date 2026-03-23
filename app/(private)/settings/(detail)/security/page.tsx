"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import type { SessionBootstrapPayload } from "@/core/session/session-payload";
import { useSessionStore } from "@/core/session/session.store";
import { useUsersStore } from "@/core/users/users.store";
import { createPasswordDigest } from "@/core/security/passwords";
import {
  buildOtpAuthUrl,
  generateTwoFactorSecret,
  verifyTotp,
} from "@/core/security/totp";
import {
  applySessionPayload,
  parseApiResponse,
} from "@/lib/client/session-client";

const passwordRules = (value: string) => {
  const trimmed = value.trim();
  return {
    length: trimmed.length >= 12,
    upper: /[A-Z]/.test(trimmed),
    number: /\d/.test(trimmed),
    special: /[^A-Za-z0-9]/.test(trimmed),
    valid:
      trimmed.length >= 12 &&
      /[A-Z]/.test(trimmed) &&
      /\d/.test(trimmed) &&
      /[^A-Za-z0-9]/.test(trimmed),
  };
};

const formatActivityDate = (value?: string | null) => {
  if (!value) return "";
  return new Date(value).toLocaleString("es-ES");
};

export default function SecuritySettingsPage() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const mode = useSessionStore((state) => state.mode);
  const activeUserId = useSessionStore((state) => state.activeUserId);
  const users = useUsersStore((state) => state.users);
  const activeUser = users.find((user) => user.id === activeUserId) ? null;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [twoFactorMode, setTwoFactorMode] = useState<"idle" | "setup" | "disable">(
    "idle"
  );
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorSaving, setTwoFactorSaving] = useState(false);

  useEffect(() => {
    setTwoFactorMode("idle");
    setTwoFactorSecret(null);
    setTwoFactorCode("");
  }, [activeUser?.id, activeUser?.preferences?.twoFactorEnabled]);

  const passwordCheck = useMemo(
    () => passwordRules(newPassword),
    [newPassword]
  );
  const passwordsMatch =
    confirmPassword.length === 0 || newPassword.trim() === confirmPassword.trim();
  const canChangePassword =
    currentPassword.trim().length > 0 &&
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    passwordCheck.valid &&
    passwordsMatch;

  const otpAuthUrl = useMemo(() => {
    if (!twoFactorSecret || !activeUser) {
      return "";
    }

    return buildOtpAuthUrl({
      secret: twoFactorSecret,
      issuer: "Kora",
      label: activeUser.email,
    });
  }, [activeUser, twoFactorSecret]);

  const qrCodeUrl = useMemo(() => {
    if (!otpAuthUrl) {
      return "";
    }

    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      otpAuthUrl
    )}`;
  }, [otpAuthUrl]);

  if (!hydrated) {
    return <div className="min-h-screen bg-background-light" aria-busy="true" />;
  }

  if (mode === "guest" || !activeUser) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Seguridad"
          subtitle="Esta sección solo está disponible en cuentas autenticadas."
          backHref="/settings"
          backLabel="Volver a configuración"
        />
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Seguridad no disponible
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Inicia sesión con una cuenta real para gestionar contraseña y 2FA.
          </p>
        </div>
      </div>
    );
  }

  const submitPasswordChange = async () => {
    if (!canChangePassword || savingPassword) {
      return;
    }

    setSavingPassword(true);
    setStatus(null);

    try {
      const newPasswordDigest = await createPasswordDigest(newPassword.trim());
      const response = await fetch("/api/account/security", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPasswordDigest,
        }),
      });

      const session = await parseApiResponse<SessionBootstrapPayload>(response);
      applySessionPayload(session);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatus({
        type: "success",
        message: "Contraseña actualizada correctamente.",
      });
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la contraseña.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const startTwoFactorSetup = () => {
    try {
      setTwoFactorSecret(generateTwoFactorSecret());
      setTwoFactorCode("");
      setTwoFactorMode("setup");
      setStatus(null);
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: "No se pudo iniciar la configuración de 2FA.",
      });
    }
  };

  const enableTwoFactor = async () => {
    if (!twoFactorSecret || !currentPassword.trim()) {
      setStatus({
        type: "error",
        message: "Introduce tu contraseña actual para activar 2FA.",
      });
      return;
    }

    if (!twoFactorCode.trim()) {
      setStatus({
        type: "error",
        message: "Introduce el código de verificación.",
      });
      return;
    }

    setTwoFactorSaving(true);
    setStatus(null);

    try {
      const valid = await verifyTotp({
        token: twoFactorCode,
        secret: twoFactorSecret,
      });

      if (!valid) {
        setStatus({
          type: "error",
          message: "El código de verificación no es válido.",
        });
        return;
      }

      const response = await fetch("/api/account/security", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          twoFactor: {
            enabled: true,
            secret: twoFactorSecret,
          },
        }),
      });

      const session = await parseApiResponse<SessionBootstrapPayload>(response);
      applySessionPayload(session);
      setTwoFactorMode("idle");
      setTwoFactorSecret(null);
      setTwoFactorCode("");
      setStatus({
        type: "success",
        message: "Autenticación en dos pasos activada.",
      });
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo activar 2FA.",
      });
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const disableTwoFactor = async () => {
    const existingSecret = activeUser.preferences?.twoFactorSecret;
    if (!currentPassword.trim()) {
      setStatus({
        type: "error",
        message: "Introduce tu contraseña actual para desactivar 2FA.",
      });
      return;
    }

    if (existingSecret) {
      const valid = await verifyTotp({
        token: twoFactorCode,
        secret: existingSecret,
      });

      if (!valid) {
        setStatus({
          type: "error",
          message: "El código de verificación no es válido.",
        });
        return;
      }
    }

    setTwoFactorSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/account/security", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          twoFactor: {
            enabled: false,
          },
        }),
      });

      const session = await parseApiResponse<SessionBootstrapPayload>(response);
      applySessionPayload(session);
      setTwoFactorMode("idle");
      setTwoFactorSecret(null);
      setTwoFactorCode("");
      setStatus({
        type: "success",
        message: "Autenticación en dos pasos desactivada.",
      });
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo desactivar 2FA.",
      });
    } finally {
      setTwoFactorSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Seguridad"
        subtitle="Actualiza tu contraseña y sincroniza la autenticación en dos pasos con el backend."
        backHref="/settings"
        backLabel="Volver a configuración"
      />

      <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Cambiar contraseña
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            La nueva contraseña se guardará en la base de datos y quedará
            disponible desde cualquier dispositivo.
          </p>
        </div>
        <div className="space-y-4">
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Contraseña actual"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Nueva contraseña"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repetir nueva contraseña"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            La contraseña debe tener 12 caracteres o más, una mayúscula, un
            número y un carácter especial.
          </div>
          {!passwordsMatch ? (
            <p className="text-xs font-semibold text-rose-600">
              Las contraseñas no coinciden.
            </p>
          ) : null}
          <button
            type="button"
            onClick={submitPasswordChange}
            disabled={!canChangePassword || savingPassword}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {savingPassword ? "Guardando..." : "Actualizar contraseña"}
          </button>
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">2FA</h2>
          <p className="mt-2 text-sm text-slate-500">
            Estado actual:{" "}
            <strong>
              {activeUser.preferences?.twoFactorEnabled ? "Activo" : "Inactivo"}
            </strong>
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Para activar o desactivar 2FA introduce tu contraseña actual.
          </p>
        </div>
        <div className="space-y-4">
          {twoFactorMode === "idle" ? (
            <div className="flex gap-3">
              {activeUser.preferences?.twoFactorEnabled ? (
                <>
                  <input
                    value={twoFactorCode}
                    onChange={(event) =>
                      setTwoFactorCode(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Código de verificación"
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={disableTwoFactor}
                    disabled={twoFactorSaving}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    {twoFactorSaving ? "Procesando..." : "Desactivar"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startTwoFactorSetup}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                >
                  Configurar 2FA
                </button>
              )}
            </div>
          ) : null}

          {twoFactorMode === "setup" ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="flex items-center justify-center rounded-2xl bg-white p-3">
                  {qrCodeUrl ? (
                    <img
                      src={qrCodeUrl}
                      alt="QR de configuración 2FA"
                      className="h-[200px] w-[200px]"
                    />
                  ) : (
                    <span className="text-sm text-slate-400">Generando QR...</span>
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Escanea el código con tu aplicación de autenticación.
                  </p>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Clave secreta
                    </p>
                    <p className="mt-2 break-all font-mono text-sm text-slate-800">
                      {twoFactorSecret}
                    </p>
                  </div>
                  <input
                    value={twoFactorCode}
                    onChange={(event) =>
                      setTwoFactorCode(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Código de verificación"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTwoFactorMode("idle");
                        setTwoFactorSecret(null);
                        setTwoFactorCode("");
                      }}
                      className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={enableTwoFactor}
                      disabled={twoFactorSaving}
                      className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {twoFactorSaving ? "Activando..." : "Activar 2FA"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Actividad</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid grid-cols-4 gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            <span>Acción</span>
            <span>Dispositivo</span>
            <span>Ubicación</span>
            <span>Fecha</span>
          </div>
          {(activeUser.securityActivity ? []).length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">
              Todavía no hay actividad registrada.
            </div>
          ) : (
            activeUser.securityActivity?.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-4 gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600"
              >
                <span>{item.action}</span>
                <span>{item.device}</span>
                <span>{item.location}</span>
                <span>{formatActivityDate(item.timestamp)}</span>
              </div>
            ))
          )}
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
    </div>
  );
}
