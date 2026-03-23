"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSessionStore } from "@/core/session/session.store";
import { useUsersStore } from "@/core/users/users.store";
import { createPasswordDigest } from "@/core/security/passwords";
import { useMessagingSettingsStore } from "@/modules/messaging/messaging.settings.store";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const createTemporaryPassword = (length = 10) => {
  const values = new Uint32Array(length);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < length; index += 1) {
      values[index] = Math.floor(Math.random() * CODE_CHARS.length);
    }
  }
  return Array.from(values)
    .map((value) => CODE_CHARS[value % CODE_CHARS.length])
    .join("");
};

export default function ForgotPasswordPage() {
  const admin = useSessionStore((s) => s.admin);
  const companyCode = useSessionStore((s) => s.companyCode);
  const association = useSessionStore((s) => s.association);
  const setAdmin = useSessionStore((s) => s.setAdmin);
  const ensureUsersSeed = useUsersStore((s) => s.ensureSeed);
  const updateUser = useUsersStore((s) => s.updateUser);
  const { settings, hydrated, loadSettings } = useMessagingSettingsStore();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const senderReady = useMemo(
    () =>
      Boolean(
        settings.emailAddress &&
          (association
            ? settings.hasEmailAppPassword || settings.emailAppPassword
            : settings.emailAppPassword)
      ),
    [
      association,
      settings.emailAddress,
      settings.hasEmailAppPassword,
      settings.emailAppPassword,
    ]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    setError(null);
    setInfo(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError("Introduce un correo válido.");
      return;
    }

    if (!senderReady) {
      setError(
        "No hay remitente configurado. Inicia sesión y configura el envío en Configuración > Mensajería."
      );
      return;
    }

    if (admin && companyCode) {
      ensureUsersSeed(companyCode, admin);
    }

    const currentUsers = useUsersStore.getState().users;
    const targetUser = currentUsers.find(
      (user) => user.email.toLowerCase() === normalizedEmail
    );
    const matchesAdmin =
      admin?.email?.toLowerCase() === normalizedEmail;

    if (!targetUser && !matchesAdmin) {
      setInfo(
        "Si el correo está registrado, recibirás una clave temporal en unos minutos."
      );
      return;
    }

    setSending(true);

    try {
      const tempPassword = createTemporaryPassword();
      const digest = await createPasswordDigest(tempPassword);

      const senderName =
        (settings.senderName ? "").trim() ||
        (association?.name ? "").trim() ||
        "Kora";

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(association
            ? {
                useCurrentAssociation: true,
              }
            : {
                associationName: senderName,
                associationEmail: settings.emailAddress,
                associationAppPassword: settings.emailAppPassword,
                emailProvider: settings.emailProvider,
                smtpHost: settings.smtpHost,
                smtpPort: settings.smtpPort,
                smtpSecure: settings.smtpSecure,
              }),
          recipients: [normalizedEmail],
          subject: "Clave temporal para acceder a Kora",
          htmlMessage: `
            <div style="font-family: Arial, sans-serif; color: #0f172a;">
              <h2>Clave temporal de acceso</h2>
              <p>Has solicitado recuperar tu acceso a Kora.</p>
              <p>Tu clave temporal es:</p>
              <p style="font-size: 20px; font-weight: bold; letter-spacing: 2px;">${tempPassword}</p>
              <p>Inicia sesión con tu correo y esta clave, y luego cambia la contraseña en la app.</p>
              <p style="margin-top: 12px;">Si no solicitaste este cambio, ignora este correo.</p>
            </div>
          `,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        setError(
          "No se pudo enviar el correo. Revisa la configuración del remitente e inténtalo de nuevo."
        );
        return;
      }

      if (targetUser) {
        updateUser(targetUser.id, { passwordDigest: digest });
      }

      if (matchesAdmin && admin) {
        setAdmin({ ...admin, passwordDigest: digest });
        const adminUser = currentUsers.find(
          (user) => user.email.toLowerCase() === admin.email.toLowerCase()
        );
        if (adminUser) {
          updateUser(adminUser.id, { passwordDigest: digest });
        }
      }

      setInfo(
        "Te enviamos una clave temporal. Inicia sesión y cambia tu contraseña en la app."
      );
      setEmail("");
    } catch (err) {
      console.error(err);
      setError(
        "Ocurrió un error al generar la clave temporal. Inténtalo de nuevo."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        <section className="relative hidden overflow-hidden text-white lg:block">
          <div className="absolute inset-0">
            <div className="h-full w-full bg-[url('/auth-hero.png')] bg-cover bg-center" />
            <div className="absolute inset-0 bg-[#1e5ad8]/85" />
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 via-blue-600/35 to-blue-900/70" />
          </div>
          <div className="relative flex h-full flex-col justify-between px-12 py-14">
            <div className="flex items-center gap-3 text-white">
              <span className="kora-logo kora-logo--inverse" aria-hidden="true">
                <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                  <path
                    d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span className="text-lg font-semibold">Kora</span>
            </div>
            <div className="max-w-md space-y-6">
              <h1 className="text-4xl font-semibold leading-tight">
                Recupera el acceso sin perder tu progreso.
              </h1>
              <p className="text-base text-white/80">
                Enviaremos una clave temporal para que puedas entrar y cambiar tu
                contraseña.
              </p>
            </div>
            <p className="text-xs text-white/60">
              © {new Date().getFullYear()} Kora Platform. Todos los derechos
              reservados.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-slate-900">
                ¿Olvidaste tu contraseña?
              </h2>
              <p className="text-sm text-slate-500">
                Ingresa tu correo y te enviaremos una clave temporal para iniciar
                sesión.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Correo electrónico
                </label>
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="correo@dominio.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {!hydrated ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Preparando configuración de envío...
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              {info ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {info}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {sending ? "Enviando clave..." : "Enviar clave temporal"}
              </button>
            </form>

            <div className="text-center text-sm text-slate-500">
              ¿Ya tienes una clave?{" "}
              <Link
                href="/login"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Volver a iniciar sesión
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
