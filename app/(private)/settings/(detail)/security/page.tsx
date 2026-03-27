"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import {
  ASSOCIATION_BACKUP_SETTINGS_RECORD_ID,
  getAssociationBackupEmailSettings,
  type AssociationBackupEmailSettings,
  type BackupEmailFrequency,
} from "@/core/security/association-backup-settings";
import { createPasswordDigest } from "@/core/security/passwords";
import {
  buildOtpAuthUrl,
  generateTwoFactorSecret,
  verifyTotp,
} from "@/core/security/totp";
import type { SessionBootstrapPayload } from "@/core/session/session-payload";
import { useSessionStore } from "@/core/session/session.store";
import type { SecurityActivityEntry } from "@/core/users/users.store";
import { useUsersStore } from "@/core/users/users.store";
import {
  listAssociationModuleRecords,
  upsertAssociationModuleRecord,
} from "@/lib/client/association-data-client";
import {
  applySessionPayload,
  parseApiResponse,
} from "@/lib/client/session-client";

type FeedbackState = {
  type: "success" | "error";
  message: string;
};

type SecurityActivityResponse = {
  activity: SecurityActivityEntry[];
};

type BackupDispatchResponse = {
  sent: boolean;
  skipped: boolean;
  error?: string;
  sentAt?: string;
  settings: AssociationBackupEmailSettings;
};

const BACKUP_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const BACKUP_PAGE_SIZE = 10;

const BACKUP_FREQUENCY_OPTIONS: Array<{
  value: BackupEmailFrequency;
  label: string;
}> = [
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-ES");
};

const buildPageNumbers = (currentPage: number, totalPages: number) => {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, start + 2);

  if (end - start < 2) {
    start = Math.max(1, end - 2);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

export default function SecuritySettingsPage() {
  const hydrated = useSessionStore((state) => state.hydrated);
  const mode = useSessionStore((state) => state.mode);
  const activeAssociationId = useSessionStore((state) => state.activeAssociationId);
  const association = useSessionStore((state) => state.association);
  const activeUserId = useSessionStore((state) => state.activeUserId);
  const users = useUsersStore((state) => state.users);
  const activeUser = users.find((user) => user.id === activeUserId) ?? null;
  const isAdmin = activeUser?.role === "Admin";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [status, setStatus] = useState<FeedbackState | null>(null);

  const [twoFactorMode, setTwoFactorMode] = useState<"idle" | "setup" | "disable">(
    "idle"
  );
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorSaving, setTwoFactorSaving] = useState(false);

  const defaultBackupRecipient =
    association?.contactEmail ?? activeUser?.email ?? "";
  const [backupSettings, setBackupSettings] =
    useState<AssociationBackupEmailSettings>(() =>
      getAssociationBackupEmailSettings(undefined, {
        recipientEmail: defaultBackupRecipient,
      })
    );
  const [backupLoaded, setBackupLoaded] = useState(false);
  const [backupSaving, setBackupSaving] = useState(false);
  const [backupSending, setBackupSending] = useState(false);
  const [backupStatus, setBackupStatus] = useState<FeedbackState | null>(null);

  const [securityActivity, setSecurityActivity] = useState<
    SecurityActivityEntry[]
  >(activeUser?.securityActivity ?? []);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);

  useEffect(() => {
    setTwoFactorMode("idle");
    setTwoFactorSecret(null);
    setTwoFactorCode("");
  }, [activeUser?.id, activeUser?.preferences?.twoFactorEnabled]);

  useEffect(() => {
    setSecurityActivity(activeUser?.securityActivity ?? []);
    setActivityPage(1);
  }, [activeUser?.id, activeUser?.securityActivity]);

  useEffect(() => {
    if (!hydrated || mode !== "authenticated" || !activeUser) {
      return;
    }

    let cancelled = false;
    setActivityLoading(true);

    void fetch("/api/account/security/activity", {
      cache: "no-store",
    })
      .then((response) => parseApiResponse<SecurityActivityResponse>(response))
      .then((payload) => {
        if (cancelled) return;
        setSecurityActivity(payload.activity);
        setActivityPage(1);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        if (!cancelled) {
          setActivityLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUser, hydrated, mode]);

  useEffect(() => {
    if (!hydrated || mode !== "authenticated" || !activeAssociationId) {
      setBackupSettings(
        getAssociationBackupEmailSettings(undefined, {
          recipientEmail: defaultBackupRecipient,
        })
      );
      setBackupLoaded(true);
      return;
    }

    let cancelled = false;
    setBackupLoaded(false);

    void listAssociationModuleRecords<AssociationBackupEmailSettings>(
      "securitySettings"
    )
      .then((records) => {
        if (cancelled) return;
        const record = records.find(
          (item) => item.id === ASSOCIATION_BACKUP_SETTINGS_RECORD_ID
        );
        setBackupSettings(
          getAssociationBackupEmailSettings(record, {
            recipientEmail: defaultBackupRecipient,
          })
        );
      })
      .catch((error) => {
        console.error(error);
        if (cancelled) return;
        setBackupSettings(
          getAssociationBackupEmailSettings(undefined, {
            recipientEmail: defaultBackupRecipient,
          })
        );
      })
      .finally(() => {
        if (!cancelled) {
          setBackupLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeAssociationId, defaultBackupRecipient, hydrated, mode]);

  const passwordCheck = useMemo(() => passwordRules(newPassword), [newPassword]);
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

  const totalActivityPages = useMemo(
    () => Math.max(1, Math.ceil(securityActivity.length / BACKUP_PAGE_SIZE)),
    [securityActivity.length]
  );
  const currentActivityPage = Math.min(activityPage, totalActivityPages);
  const pagedActivity = useMemo(() => {
    const start = (currentActivityPage - 1) * BACKUP_PAGE_SIZE;
    return securityActivity.slice(start, start + BACKUP_PAGE_SIZE);
  }, [currentActivityPage, securityActivity]);
  const activityPageNumbers = useMemo(
    () => buildPageNumbers(currentActivityPage, totalActivityPages),
    [currentActivityPage, totalActivityPages]
  );
  const canPrevActivity = currentActivityPage > 1;
  const canNextActivity = currentActivityPage < totalActivityPages;

  const persistBackupSettings = async () => {
    const normalizedRecipient = backupSettings.recipientEmail.trim().toLowerCase();

    if (!normalizedRecipient) {
      throw new Error("Indica un correo de destino para la copia de seguridad.");
    }

    if (!BACKUP_EMAIL_REGEX.test(normalizedRecipient)) {
      throw new Error("Introduce un correo de destino válido.");
    }

    const nextSettings = getAssociationBackupEmailSettings(
      {
        ...backupSettings,
        recipientEmail: normalizedRecipient,
      },
      {
        recipientEmail: defaultBackupRecipient,
      }
    );

    await upsertAssociationModuleRecord("securitySettings", nextSettings);
    setBackupSettings(nextSettings);
    return nextSettings;
  };

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
            Inicia sesión con una cuenta real para gestionar contraseña, 2FA y
            copias de seguridad.
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
        message: "No se pudo iniciar la configuraciñn de 2FA.",
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
        message: error instanceof Error ? error.message : "No se pudo activar 2FA.",
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
          error instanceof Error ? error.message : "No se pudo desactivar 2FA.",
      });
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const saveBackupConfiguration = async () => {
    if (!isAdmin) {
      setBackupStatus({
        type: "error",
        message: "Solo un administrador puede configurar la copia de seguridad.",
      });
      return;
    }

    setBackupSaving(true);
    setBackupStatus(null);

    try {
      await persistBackupSettings();
      setBackupStatus({
        type: "success",
        message: "Configuración de copia de seguridad guardada.",
      });
    } catch (error) {
      console.error(error);
      setBackupStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la configuración de backup.",
      });
    } finally {
      setBackupSaving(false);
    }
  };

  const sendBackupNow = async () => {
    if (!isAdmin) {
      setBackupStatus({
        type: "error",
        message: "Solo un administrador puede enviar la copia de seguridad.",
      });
      return;
    }

    setBackupSending(true);
    setBackupStatus(null);

    try {
      await persistBackupSettings();

      const response = await fetch("/api/account/security/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ force: true }),
      });

      const result = await parseApiResponse<BackupDispatchResponse>(response);
      setBackupSettings(
        getAssociationBackupEmailSettings(result.settings, {
          recipientEmail: defaultBackupRecipient,
        })
      );
      setBackupStatus({
        type: "success",
        message: result.sentAt
          ? `Copia enviada correctamente el ${formatActivityDate(result.sentAt)}.`
          : "Copia enviada correctamente.",
      });
    } catch (error) {
      console.error(error);
      setBackupStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo enviar la copia de seguridad.",
      });
    } finally {
      setBackupSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Seguridad"
        subtitle="Actualiza tu contraseña, sincroniza 2FA y programa el backup JSON de la asociación."
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

      <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.1fr]">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Backup por correo
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Kora genera un JSON completo de la asociación, listo para importar,
            y revisa el periodo configurado al entrar en la aplicación.
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Solo los administradores pueden programar y lanzar esta copia.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Activar envío automático
              </p>
              <p className="text-xs text-slate-500">
                El adjunto se envía al correo configurado cuando toque el periodo.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={backupSettings.enabled}
                onChange={(event) =>
                  setBackupSettings((prev) => ({
                    ...prev,
                    enabled: event.target.checked,
                  }))
                }
                disabled={!isAdmin || !backupLoaded}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Correo de destino
              </label>
              <input
                type="email"
                value={backupSettings.recipientEmail}
                onChange={(event) =>
                  setBackupSettings((prev) => ({
                    ...prev,
                    recipientEmail: event.target.value,
                  }))
                }
                placeholder="backup@empresa.org"
                disabled={!isAdmin || !backupLoaded}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Periodo
              </label>
              <select
                value={backupSettings.frequency}
                onChange={(event) =>
                  setBackupSettings((prev) => ({
                    ...prev,
                    frequency: event.target.value as BackupEmailFrequency,
                  }))
                }
                disabled={!isAdmin || !backupLoaded}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                {BACKUP_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <p className="text-sm font-semibold text-slate-900">
              Resumen del backup
            </p>
            <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Periodo actual
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {
                    BACKUP_FREQUENCY_OPTIONS.find(
                      (option) => option.value === backupSettings.frequency
                    )?.label
                  }
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Último envío
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {backupSettings.lastSentAt
                    ? formatActivityDate(backupSettings.lastSentAt)
                    : "Aún no enviado"}
                </p>
              </div>
            </div>
            {backupSettings.lastStatus === "error" && backupSettings.lastError ? (
              <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                Último error: {backupSettings.lastError}
              </p>
            ) : null}
          </div>

          {!isAdmin ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Necesitas un rol de administrador para guardar o enviar esta copia.
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={saveBackupConfiguration}
              disabled={!isAdmin || !backupLoaded || backupSaving || backupSending}
              className={cx(
                "rounded-2xl px-5 py-3 text-sm font-semibold text-white",
                !isAdmin || !backupLoaded || backupSaving || backupSending
                  ? "cursor-not-allowed bg-slate-300"
                  : "bg-slate-900"
              )}
            >
              {backupSaving ? "Guardando..." : "Guardar configuración"}
            </button>
            <button
              type="button"
              onClick={sendBackupNow}
              disabled={!isAdmin || !backupLoaded || backupSaving || backupSending}
              className={cx(
                "rounded-2xl px-5 py-3 text-sm font-semibold text-white",
                !isAdmin || !backupLoaded || backupSaving || backupSending
                  ? "cursor-not-allowed bg-blue-300"
                  : "bg-blue-600"
              )}
            >
              {backupSending ? "Enviando..." : "Enviar copia ahora"}
            </button>
          </div>

          {backupStatus ? (
            <div
              className={cx(
                "rounded-2xl border px-4 py-3 text-sm",
                backupStatus.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              )}
            >
              {backupStatus.message}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Actividad</h2>
            <p className="mt-1 text-sm text-slate-500">
              Historial de cambios de seguridad de la cuenta actual.
            </p>
          </div>
          <p className="text-sm text-slate-500">
            Mostrando {pagedActivity.length} de {securityActivity.length} registros
          </p>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid grid-cols-4 gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            <span>Acción</span>
            <span>Dispositivo</span>
            <span>Ubicación</span>
            <span>Fecha</span>
          </div>
          {!activityLoading && securityActivity.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">
              Todavía no hay actividad registrada.
            </div>
          ) : null}
          {pagedActivity.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-4 gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600"
            >
              <span>{item.action}</span>
              <span>{item.device}</span>
              <span>{item.location}</span>
              <span>{formatActivityDate(item.timestamp)}</span>
            </div>
          ))}
          {activityLoading ? (
            <div className="border-t border-slate-100 px-4 py-4 text-sm text-slate-500">
              Cargando actividad...
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Página {currentActivityPage} de {totalActivityPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => canPrevActivity && setActivityPage(currentActivityPage - 1)}
              disabled={!canPrevActivity}
              className={cx(
                "rounded-lg border px-3 py-1.5 text-sm",
                canPrevActivity
                  ? "border-slate-200 text-slate-600 hover:bg-slate-50"
                  : "cursor-not-allowed border-slate-100 text-slate-300"
              )}
            >
              Anterior
            </button>
            {activityPageNumbers.map((page) => {
              const isActive = page === currentActivityPage;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setActivityPage(page)}
                  className={cx(
                    "rounded-lg border px-3 py-1.5 text-sm",
                    isActive
                      ? "border-blue-600 bg-blue-50 font-semibold text-blue-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {page}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => canNextActivity && setActivityPage(currentActivityPage + 1)}
              disabled={!canNextActivity}
              className={cx(
                "rounded-lg border px-3 py-1.5 text-sm",
                canNextActivity
                  ? "border-slate-200 text-slate-600 hover:bg-slate-50"
                  : "cursor-not-allowed border-slate-100 text-slate-300"
              )}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>

      {status ? (
        <div
          className={cx(
            "rounded-2xl border px-4 py-3 text-sm",
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          )}
        >
          {status.message}
        </div>
      ) : null}
    </div>
  );
}
