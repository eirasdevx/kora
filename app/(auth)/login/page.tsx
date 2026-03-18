"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionBootstrapPayload } from "@/core/session/session-payload";
import { useSessionStore } from "@/core/session/session.store";
import {
  applySessionPayload,
  parseApiResponse,
} from "@/lib/client/session-client";

export default function LoginPage() {
  const router = useRouter();
  const mode = useSessionStore((state) => state.mode);
  const hydrated = useSessionStore((state) => state.hydrated);
  const setGuest = useSessionStore((state) => state.setGuest);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pendingTwoFactor, setPendingTwoFactor] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || !mode) {
      return;
    }

    router.replace("/dashboard");
  }, [hydrated, mode, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
          companyCode,
          twoFactorCode: pendingTwoFactor ? twoFactorCode : undefined,
        }),
      });

      if (response.status === 409) {
        setPendingTwoFactor(true);
        setSubmitting(false);
        return;
      }

      const payload = await parseApiResponse<SessionBootstrapPayload>(response);
      applySessionPayload(payload);
      router.push("/dashboard");
    } catch (requestError) {
      console.error(requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo iniciar sesión."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-slate-950 px-12 py-16 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-lg font-semibold">Kora</p>
            <p className="mt-2 max-w-md text-sm text-slate-300">
              Gestiona una asociación compartida por varios usuarios con acceso
              por código de empresa, roles y permisos.
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">
              Acceso compartido
            </p>
            <h1 className="max-w-lg text-4xl font-semibold leading-tight">
              Cada miembro entra en la misma asociación con sus propias credenciales.
            </h1>
            <p className="max-w-md text-sm text-slate-300">
              El administrador crea la asociación y después da de alta al resto
              del equipo desde la gestión de usuarios.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Kora
          </p>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-slate-900">
                Iniciar sesión
              </h2>
              <p className="text-sm text-slate-500">
                Usa tu correo o DNI, tu contraseña y el código de empresa de tu
                asociación.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Correo o DNI
                </label>
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="correo@asociacion.org"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    Contraseña
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-blue-600"
                  >
                    Recuperar acceso
                  </Link>
                </div>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-16 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500"
                  >
                    {showPassword ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Código de empresa
                </label>
                <input
                  value={companyCode}
                  onChange={(event) => setCompanyCode(event.target.value)}
                  placeholder="KORA-0000-0000"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {pendingTwoFactor ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Código de verificación
                  </label>
                  <input
                    value={twoFactorCode}
                    onChange={(event) =>
                      setTwoFactorCode(event.target.value.replace(/\D/g, ""))
                    }
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <p className="text-xs text-slate-500">
                    Tu cuenta requiere validación en dos pasos.
                  </p>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-70"
              >
                {submitting
                  ? "Validando..."
                  : pendingTwoFactor
                    ? "Verificar y entrar"
                    : "Entrar"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setGuest();
                router.push("/dashboard");
              }}
              className="w-full rounded-2xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-600"
            >
              Continuar como invitado
            </button>

            <p className="text-center text-sm text-slate-500">
              ¿No tienes una asociación creada?{" "}
              <Link href="/register" className="font-semibold text-blue-600">
                Registrar administrador
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
