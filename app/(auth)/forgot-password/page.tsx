"use client";

import { useState } from "react";
import Link from "next/link";
import {
  parseApiResponse,
  shouldLogClientApiError,
} from "@/lib/client/session-client";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

type ForgotPasswordResponse = {
  success: boolean;
  message: string;
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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

    setSending(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      });

      const payload = await parseApiResponse<ForgotPasswordResponse>(response);
      setInfo(payload.message);
      setEmail("");
    } catch (requestError) {
      if (shouldLogClientApiError(requestError)) {
        console.error(requestError);
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Ocurrió un error al generar la clave temporal. Inténtalo de nuevo."
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
                Enviaremos una clave temporal a tu correo para que puedas entrar
                de nuevo en tu asociación.
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
                Introduce tu correo y te enviaremos una clave temporal para
                iniciar sesión.
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
