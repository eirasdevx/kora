"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ModuleTopbar, {
  moduleTopbarButtonStyles,
} from "@/components/shared/ModuleTopbar";
import { useSessionStore } from "@/core/session/session.store";
import {
  type EmailProvider,
  useMessagingSettingsStore,
} from "@/modules/messaging/messaging.settings.store";

const PROVIDER_LABELS: Record<EmailProvider, string> = {
  gmail: "Gmail",
  outlook: "Outlook / Office 365",
  yahoo: "Yahoo",
  custom: "SMTP personalizado",
};

const PROVIDER_SMTP: Record<
  Exclude<EmailProvider, "custom">,
  { host: string; port: number; secure: boolean; note: string }
> = {
  gmail: {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    note: "SSL/TLS",
  },
  outlook: {
    host: "smtp.office365.com",
    port: 587,
    secure: false,
    note: "STARTTLS",
  },
  yahoo: {
    host: "smtp.mail.yahoo.com",
    port: 465,
    secure: true,
    note: "SSL/TLS",
  },
};

const PROVIDER_STEPS: Record<EmailProvider, string[]> = {
  gmail: [
    "Activa la verificacion en dos pasos (2FA).",
    "Crea una App Password para Kora.",
    "Usa tu Gmail y la App Password en la app.",
  ],
  outlook: [
    "Activa la verificacion en dos pasos (MFA).",
    "Crea una contrasena de aplicacion o credencial SMTP.",
    "Usa tu correo y la contrasena SMTP en la app.",
  ],
  yahoo: [
    "Activa la verificacion en dos pasos.",
    "Genera una App Password para correo.",
    "Usa tu Yahoo y la App Password en la app.",
  ],
  custom: [
    "Solicita a tu proveedor el host, puerto y tipo de seguridad.",
    "Usa el usuario/correo y la contrasena SMTP.",
    "Completa los datos y guarda los cambios.",
  ],
};

const MESSAGING_MODULE_TITLE = "Mensajeria";
const MESSAGING_MODULE_DESCRIPTION =
  "Plantillas, campanas y comunicaciones personalizadas.";

export default function MessagingSettingsPage() {
  const mode = useSessionStore((s) => s.mode);
  const association = useSessionStore((s) => s.association);
  const { settings, hydrated, loadSettings, updateSettings, saveSettings } =
    useMessagingSettingsStore();

  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!association) return;
    if (!hydrated) return;
    if (!settings.senderName && association.name) {
      updateSettings({ senderName: association.name });
    }
    if (!settings.emailAddress && association.contactEmail) {
      updateSettings({ emailAddress: association.contactEmail });
    }
  }, [
    association,
    hydrated,
    settings.senderName,
    settings.emailAddress,
    updateSettings,
  ]);

  const handleSave = async () => {
    setStatus("saving");
    const ok = await saveSettings();
    setStatus(ok ? "saved" : "error");
    if (ok) {
      setTimeout(() => setStatus("idle"), 2200);
    }
  };

  if (mode === "guest") {
    return (
      <div className="space-y-8">
        <ModuleTopbar
          module={MESSAGING_MODULE_TITLE}
          title="Credenciales de mensajeria"
          description={MESSAGING_MODULE_DESCRIPTION}
          actions={
            <Link
              href="/settings"
              className={moduleTopbarButtonStyles.secondary}
            >
              Volver a configuracion
            </Link>
          }
        />

        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
            <span className="material-symbols-outlined text-[24px]">info</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            Mensajeria no disponible en modo invitado
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Inicia sesion para configurar remitentes y credenciales de envio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ModuleTopbar
        module={MESSAGING_MODULE_TITLE}
        title="Credenciales de mensajeria"
        description={MESSAGING_MODULE_DESCRIPTION}
        actions={
          <Link
            href="/settings"
            className={moduleTopbarButtonStyles.secondary}
          >
            Volver a configuracion
          </Link>
        }
      />

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Credenciales de correo
          </h2>
          <p className="text-sm text-gray-500">
            Configura el proveedor SMTP para enviar correos masivos.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Proveedor de correo
            </label>
            <select
              value={settings.emailProvider}
              onChange={(event) =>
                updateSettings({
                  emailProvider: event.target.value as EmailProvider,
                })
              }
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
            >
              {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Nombre del remitente
            </label>
            <input
              value={settings.senderName}
              onChange={(event) =>
                updateSettings({ senderName: event.target.value })
              }
              placeholder="Asociacion Cultural"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Correo (usuario SMTP)
            </label>
            <input
              value={settings.emailAddress}
              onChange={(event) =>
                updateSettings({ emailAddress: event.target.value })
              }
              type="email"
              placeholder="correo@gmail.com"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Contrasena SMTP / App Password
            </label>
            <input
              value={settings.emailAppPassword}
              onChange={(event) =>
                updateSettings({ emailAppPassword: event.target.value })
              }
              type="password"
              placeholder="App Password"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
            />
            <p className="mt-2 text-xs text-gray-400">
              Se guarda cifrada en el navegador y no se expone en la interfaz.
            </p>
          </div>
          {settings.emailProvider === "custom" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Host SMTP
                </label>
                <input
                  value={settings.smtpHost}
                  onChange={(event) =>
                    updateSettings({ smtpHost: event.target.value })
                  }
                  placeholder="smtp.midominio.com"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Puerto SMTP
                </label>
                <input
                  value={settings.smtpPort}
                  onChange={(event) =>
                    updateSettings({
                      smtpPort: Number(event.target.value || 0),
                    })
                  }
                  type="number"
                  min={1}
                  max={65535}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={settings.smtpSecure}
                    onChange={(event) =>
                      updateSettings({ smtpSecure: event.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Usar conexion segura (SSL/TLS)
                </label>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
              <p className="font-semibold text-gray-700">
                Servidor sugerido:
              </p>
              <p>
                Host:{" "}
                <span className="font-semibold text-gray-800">
                  {PROVIDER_SMTP[settings.emailProvider as Exclude<
                    EmailProvider,
                    "custom"
                  >]?.host}
                </span>
              </p>
              <p>
                Puerto:{" "}
                <span className="font-semibold text-gray-800">
                  {PROVIDER_SMTP[settings.emailProvider as Exclude<
                    EmailProvider,
                    "custom"
                  >]?.port}
                </span>{" "}
                ({PROVIDER_SMTP[settings.emailProvider as Exclude<
                  EmailProvider,
                  "custom"
                >]?.note})
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Guia de conexion
            </h2>
            <p className="text-sm text-gray-500">
              Pasos recomendados para conectar cualquier cuenta de correo.
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            {PROVIDER_LABELS[settings.emailProvider]}
          </span>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
              Pasos
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              {PROVIDER_STEPS[settings.emailProvider].map((step, index) => (
                <li key={step} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
              Recomendaciones
            </p>
            <ul className="mt-3 space-y-2">
              <li>El correo debe coincidir con el usuario SMTP.</li>
              <li>
                Si el proveedor lo permite, usa App Password o credencial SMTP.
              </li>
              <li>Guarda los cambios antes de enviar.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Numeros de contacto
          </h2>
          <p className="text-sm text-gray-500">
            Guardamos la informacion para futuras integraciones.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Numero de WhatsApp
            </label>
            <input
              value={settings.whatsappNumber}
              onChange={(event) =>
                updateSettings({ whatsappNumber: event.target.value })
              }
              placeholder="+34 600 000 000"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Numero SMS
            </label>
            <input
              value={settings.smsNumber}
              onChange={(event) =>
                updateSettings({ smsNumber: event.target.value })
              }
              placeholder="+34 600 000 000"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-500">
          Guarda las credenciales para reutilizarlas en los envios.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving"}
            className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "saving" ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {status === "saved" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Credenciales guardadas correctamente.
        </div>
      ) : null}
      {status === "error" ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          No se pudieron guardar los cambios.
        </div>
      ) : null}
    </div>
  );
}
