"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SessionBootstrapPayload } from "@/core/session/session-payload";
import { useSessionStore } from "@/core/session/session.store";
import {
  applySessionPayload,
  parseApiResponse,
  shouldLogClientApiError,
} from "@/lib/client/session-client";

type LoginCredentials = {
  identifier: string;
  password: string;
  companyCode: string;
};

const normalizeLoginCredentials = (
  credentials: Partial<LoginCredentials>
): LoginCredentials => ({
  identifier: credentials.identifier?.trim() ?? "",
  password: credentials.password ?? "",
  companyCode: credentials.companyCode?.trim().toUpperCase() ?? "",
});


function EyeIcon({ open }: { open: boolean }) {
  return (
    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
      {open ? "visibility" : "visibility_off"}
    </span>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = useSessionStore((state) => state.mode);
  const hydrated = useSessionStore((state) => state.hydrated);
  const setGuest = useSessionStore((state) => state.setGuest);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(false);
  const [pendingTwoFactor, setPendingTwoFactor] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || !mode) {
      return;
    }

    router.replace("/dashboard");
  }, [hydrated, mode, router]);

  useEffect(() => {
    const rememberedIdentifier = searchParams.get("identifier")?.trim();
    const rememberedCompanyCode = searchParams.get("companyCode")?.trim();

    if (rememberedIdentifier) {
      setIdentifier((previous) => previous || rememberedIdentifier);
    }

    if (rememberedCompanyCode) {
      setCompanyCode((previous) => previous || rememberedCompanyCode);
    }
  }, [searchParams]);

  const submitLogin = async (
    credentials: LoginCredentials,
    verificationCode?: string
  ) => {
    if (submitting) {
      return;
    }

    if (
      !credentials.identifier ||
      !credentials.password ||
      !credentials.companyCode
    ) {
      setError("Completa usuario, contraseña y código de empresa.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setTwoFactorError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: credentials.identifier,
          password: credentials.password,
          companyCode: credentials.companyCode,
          twoFactorCode: verificationCode,
        }),
      });

      if (response.status === 409) {
        setPendingTwoFactor(true);
        return;
      }

      const payload = await parseApiResponse<SessionBootstrapPayload>(response);
      applySessionPayload(payload);
      router.push("/dashboard");
    } catch (requestError) {
      if (shouldLogClientApiError(requestError)) {
        console.error(requestError);
      }
      const message =
        requestError instanceof Error
          ? requestError.message
          : "No se pudo iniciar sesión.";

      if (pendingTwoFactor || verificationCode) {
        setTwoFactorError(message);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const credentials = normalizeLoginCredentials({
      identifier: String(formData.get("identifier") ?? ""),
      password: String(formData.get("password") ?? ""),
      companyCode: String(formData.get("companyCode") ?? ""),
    });

    setIdentifier(credentials.identifier);
    setPassword(credentials.password);
    setCompanyCode(credentials.companyCode);

    await submitLogin(credentials);
  };

  const handleTwoFactorSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!twoFactorCode.trim()) {
      setTwoFactorError("Introduce el código de verificación.");
      return;
    }

    await submitLogin(
      normalizeLoginCredentials({
        identifier,
        password,
        companyCode,
      }),
      twoFactorCode
    );
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
                Gestiona tu asociación con facilidad.
              </h1>
              <p className="text-base text-white/80">
                Centraliza finanzas, recursos, eventos y mensajería en una sola
                plataforma intuitiva diseñada para el crecimiento comunitario.
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
                Bienvenido a Kora
              </h2>
              <p className="text-sm text-slate-500">
                Ingresa tu DNI o correo, contraseña y el código de empresa.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  DNI o correo electrónico
                </label>
                <input
                  name="identifier"
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="DNI o correo"
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Contraseña
                </label>

                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="********"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={
                      showPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>

                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Código de empresa
                </label>
                <input
                  name="companyCode"
                  type="text"
                  value={companyCode}
                  onChange={(event) =>
                    setCompanyCode(event.target.value.toUpperCase())
                  }
                  placeholder="KORA-0000-0000"
                  autoCapitalize="characters"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

                <div className="flex justify-end">
                  <Link
                    href="/remember-company-code"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Recordar códigos
                  </Link>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(event) => setRememberSession(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                Mantener sesión iniciada
              </label>

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {submitting ? "Validando..." : "Iniciar sesión"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setGuest();
                router.push("/dashboard");
              }}
              className="w-full rounded-xl border border-dashed border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:border-slate-300"
            >
              Iniciar sesión como invitado
            </button>

            <p className="text-center text-sm text-slate-500">
              ¿No tienes una cuenta?{" "}
              <Link
                href="/register"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Registrar administrador
              </Link>
            </p>
          </div>
        </section>
      </div>

      {pendingTwoFactor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-900">
                Verificación en dos pasos
              </h3>
              <p className="text-sm text-slate-500">
                Introduce el código de tu app para continuar.
              </p>
            </div>

            <form onSubmit={handleTwoFactorSubmit} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Código de verificación
                </label>
                <input
                  value={twoFactorCode}
                  onChange={(event) => {
                    setTwoFactorCode(event.target.value.replace(/\D/g, ""));
                    setTwoFactorError(null);
                  }}
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {twoFactorError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {twoFactorError}
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingTwoFactor(false);
                    setTwoFactorCode("");
                    setTwoFactorError(null);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {submitting ? "Verificando..." : "Verificar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LoginPageContent />
    </Suspense>
  );
}
