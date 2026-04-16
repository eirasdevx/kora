"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LOCALE_HTML_LANG,
  type LocaleCode,
  resolveLocale,
} from "@/core/i18n/locale";
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

type LoginCopy = {
  languageLabel: string;
  heroTitle: string;
  heroDescription: string;
  legalNotice: string;
  loginTitle: string;
  loginDescription: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  hidePassword: string;
  showPassword: string;
  forgotPassword: string;
  companyCodeLabel: string;
  companyCodePlaceholder: string;
  rememberCodes: string;
  rememberSession: string;
  requiredFieldsError: string;
  loginFallbackError: string;
  submitIdle: string;
  submitPending: string;
  guestLogin: string;
  registerPrompt: string;
  registerLink: string;
  twoFactorTitle: string;
  twoFactorDescription: string;
  twoFactorLabel: string;
  twoFactorPlaceholder: string;
  twoFactorRequiredError: string;
  twoFactorCancel: string;
  twoFactorSubmitIdle: string;
  twoFactorSubmitPending: string;
};

const PUBLIC_LANGUAGE_STORAGE_KEY = "kora-public-language";

const LANGUAGE_OPTIONS: Array<{ value: LocaleCode; label: string }> = [
  { value: "es", label: "Español (España)" },
  { value: "es-419", label: "Español (Latam)" },
  { value: "gl", label: "Galego" },
  { value: "eu", label: "Euskara" },
  { value: "ca", label: "Català" },
  { value: "va", label: "Valencià" },
  { value: "en", label: "English (US)" },
];

const LOGIN_COPY: Record<LocaleCode, LoginCopy> = {
  es: {
    languageLabel: "Idioma",
    heroTitle: "Gestiona tu asociación con facilidad.",
    heroDescription:
      "Centraliza finanzas, recursos, eventos y mensajería en una sola plataforma intuitiva diseñada para el crecimiento comunitario.",
    legalNotice: "Todos los derechos reservados.",
    loginTitle: "Bienvenido a Kora",
    loginDescription:
      "Ingresa tu DNI o correo, contraseña y el código de empresa.",
    identifierLabel: "DNI o correo electrónico",
    identifierPlaceholder: "DNI o correo",
    passwordLabel: "Contraseña",
    passwordPlaceholder: "********",
    hidePassword: "Ocultar contraseña",
    showPassword: "Mostrar contraseña",
    forgotPassword: "¿Olvidaste tu contraseña?",
    companyCodeLabel: "Código de empresa",
    companyCodePlaceholder: "KORA-0000-0000",
    rememberCodes: "Recordar códigos",
    rememberSession: "Mantener sesión iniciada",
    requiredFieldsError: "Completa usuario, contraseña y código de empresa.",
    loginFallbackError: "No se pudo iniciar sesión.",
    submitIdle: "Iniciar sesión",
    submitPending: "Validando...",
    guestLogin: "Iniciar sesión como invitado",
    registerPrompt: "¿No tienes una cuenta?",
    registerLink: "Registrar administrador",
    twoFactorTitle: "Verificación en dos pasos",
    twoFactorDescription: "Introduce el código de tu app para continuar.",
    twoFactorLabel: "Código de verificación",
    twoFactorPlaceholder: "123456",
    twoFactorRequiredError: "Introduce el código de verificación.",
    twoFactorCancel: "Cancelar",
    twoFactorSubmitIdle: "Verificar",
    twoFactorSubmitPending: "Verificando...",
  },
  "es-419": {
    languageLabel: "Idioma",
    heroTitle: "Gestiona tu asociación con facilidad.",
    heroDescription:
      "Centraliza finanzas, recursos, eventos y mensajería en una sola plataforma intuitiva diseñada para el crecimiento comunitario.",
    legalNotice: "Todos los derechos reservados.",
    loginTitle: "Bienvenido a Kora",
    loginDescription:
      "Ingresa tu DNI o correo, contraseña y el código de empresa.",
    identifierLabel: "DNI o correo electrónico",
    identifierPlaceholder: "DNI o correo",
    passwordLabel: "Contraseña",
    passwordPlaceholder: "********",
    hidePassword: "Ocultar contraseña",
    showPassword: "Mostrar contraseña",
    forgotPassword: "¿Olvidaste tu contraseña?",
    companyCodeLabel: "Código de empresa",
    companyCodePlaceholder: "KORA-0000-0000",
    rememberCodes: "Recordar códigos",
    rememberSession: "Mantener sesión iniciada",
    requiredFieldsError: "Completa usuario, contraseña y código de empresa.",
    loginFallbackError: "No se pudo iniciar sesión.",
    submitIdle: "Iniciar sesión",
    submitPending: "Validando...",
    guestLogin: "Iniciar sesión como invitado",
    registerPrompt: "¿No tienes una cuenta?",
    registerLink: "Registrar administrador",
    twoFactorTitle: "Verificación en dos pasos",
    twoFactorDescription: "Ingresa el código de tu app para continuar.",
    twoFactorLabel: "Código de verificación",
    twoFactorPlaceholder: "123456",
    twoFactorRequiredError: "Ingresa el código de verificación.",
    twoFactorCancel: "Cancelar",
    twoFactorSubmitIdle: "Verificar",
    twoFactorSubmitPending: "Verificando...",
  },
  gl: {
    languageLabel: "Idioma",
    heroTitle: "Xestiona a túa asociación con facilidade.",
    heroDescription:
      "Centraliza finanzas, recursos, eventos e mensaxería nunha soa plataforma intuitiva deseñada para o crecemento comunitario.",
    legalNotice: "Todos os dereitos reservados.",
    loginTitle: "Benvido a Kora",
    loginDescription:
      "Introduce o teu DNI ou correo, contrasinal e o código da entidade.",
    identifierLabel: "DNI ou correo electrónico",
    identifierPlaceholder: "DNI ou correo",
    passwordLabel: "Contrasinal",
    passwordPlaceholder: "********",
    hidePassword: "Agochar contrasinal",
    showPassword: "Mostrar contrasinal",
    forgotPassword: "Esqueciches o contrasinal?",
    companyCodeLabel: "Código da entidade",
    companyCodePlaceholder: "KORA-0000-0000",
    rememberCodes: "Lembrar códigos",
    rememberSession: "Manter a sesión iniciada",
    requiredFieldsError:
      "Completa usuario, contrasinal e código da entidade.",
    loginFallbackError: "Non se puido iniciar sesión.",
    submitIdle: "Iniciar sesión",
    submitPending: "Validando...",
    guestLogin: "Entrar como convidado",
    registerPrompt: "Non tes conta?",
    registerLink: "Rexistrar administrador",
    twoFactorTitle: "Verificación en dous pasos",
    twoFactorDescription: "Introduce o código da túa app para continuar.",
    twoFactorLabel: "Código de verificación",
    twoFactorPlaceholder: "123456",
    twoFactorRequiredError: "Introduce o código de verificación.",
    twoFactorCancel: "Cancelar",
    twoFactorSubmitIdle: "Verificar",
    twoFactorSubmitPending: "Verificando...",
  },
  eu: {
    languageLabel: "Hizkuntza",
    heroTitle: "Kudeatu zure elkartea erraztasunez.",
    heroDescription:
      "Finantzak, baliabideak, ekitaldiak eta mezularitza plataforma intuitibo bakar batean zentralizatu, komunitatearen hazkunderako diseinatuta.",
    legalNotice: "Eskubide guztiak erreserbatuta.",
    loginTitle: "Ongi etorri Korara",
    loginDescription:
      "Sartu zure NANa edo posta elektronikoa, pasahitza eta enpresaren kodea.",
    identifierLabel: "NANa edo posta elektronikoa",
    identifierPlaceholder: "NANa edo posta",
    passwordLabel: "Pasahitza",
    passwordPlaceholder: "********",
    hidePassword: "Ezkutatu pasahitza",
    showPassword: "Erakutsi pasahitza",
    forgotPassword: "Pasahitza ahaztu duzu?",
    companyCodeLabel: "Enpresaren kodea",
    companyCodePlaceholder: "KORA-0000-0000",
    rememberCodes: "Gogoratu kodeak",
    rememberSession: "Mantendu saioa hasita",
    requiredFieldsError:
      "Bete erabiltzailea, pasahitza eta enpresaren kodea.",
    loginFallbackError: "Ezin izan da saioa hasi.",
    submitIdle: "Hasi saioa",
    submitPending: "Balidatzen...",
    guestLogin: "Hasi saioa gonbidatu gisa",
    registerPrompt: "Ez duzu konturik?",
    registerLink: "Erregistratu administratzailea",
    twoFactorTitle: "Bi urratseko egiaztapena",
    twoFactorDescription: "Sartu zure aplikazioko kodea jarraitzeko.",
    twoFactorLabel: "Egiaztapen kodea",
    twoFactorPlaceholder: "123456",
    twoFactorRequiredError: "Sartu egiaztapen kodea.",
    twoFactorCancel: "Utzi",
    twoFactorSubmitIdle: "Egiaztatu",
    twoFactorSubmitPending: "Egiaztatzen...",
  },
  ca: {
    languageLabel: "Idioma",
    heroTitle: "Gestiona la teva associació amb facilitat.",
    heroDescription:
      "Centralitza finances, recursos, esdeveniments i missatgeria en una sola plataforma intuïtiva pensada per al creixement comunitari.",
    legalNotice: "Tots els drets reservats.",
    loginTitle: "Benvingut a Kora",
    loginDescription:
      "Introdueix el teu DNI o correu, la contrasenya i el codi d'empresa.",
    identifierLabel: "DNI o correu electrònic",
    identifierPlaceholder: "DNI o correu",
    passwordLabel: "Contrasenya",
    passwordPlaceholder: "********",
    hidePassword: "Amaga la contrasenya",
    showPassword: "Mostra la contrasenya",
    forgotPassword: "Has oblidat la contrasenya?",
    companyCodeLabel: "Codi d'empresa",
    companyCodePlaceholder: "KORA-0000-0000",
    rememberCodes: "Recorda codis",
    rememberSession: "Mantén la sessió iniciada",
    requiredFieldsError:
      "Completa l'usuari, la contrasenya i el codi d'empresa.",
    loginFallbackError: "No s'ha pogut iniciar la sessió.",
    submitIdle: "Inicia sessió",
    submitPending: "Validant...",
    guestLogin: "Inicia sessió com a convidat",
    registerPrompt: "No tens un compte?",
    registerLink: "Registrar administrador",
    twoFactorTitle: "Verificació en dos passos",
    twoFactorDescription: "Introdueix el codi de l'app per continuar.",
    twoFactorLabel: "Codi de verificació",
    twoFactorPlaceholder: "123456",
    twoFactorRequiredError: "Introdueix el codi de verificació.",
    twoFactorCancel: "Cancel·la",
    twoFactorSubmitIdle: "Verifica",
    twoFactorSubmitPending: "Verificant...",
  },
  va: {
    languageLabel: "Idioma",
    heroTitle: "Gestiona la teua associació amb facilitat.",
    heroDescription:
      "Centralitza finances, recursos, esdeveniments i missatgeria en una sola plataforma intuïtiva pensada per al creixement comunitari.",
    legalNotice: "Tots els drets reservats.",
    loginTitle: "Benvingut a Kora",
    loginDescription:
      "Introdueix el teu DNI o correu, la contrasenya i el codi d'empresa.",
    identifierLabel: "DNI o correu electrònic",
    identifierPlaceholder: "DNI o correu",
    passwordLabel: "Contrasenya",
    passwordPlaceholder: "********",
    hidePassword: "Amaga la contrasenya",
    showPassword: "Mostra la contrasenya",
    forgotPassword: "Has oblidat la contrasenya?",
    companyCodeLabel: "Codi d'empresa",
    companyCodePlaceholder: "KORA-0000-0000",
    rememberCodes: "Recorda codis",
    rememberSession: "Mantín la sessió iniciada",
    requiredFieldsError:
      "Completa l'usuari, la contrasenya i el codi d'empresa.",
    loginFallbackError: "No s'ha pogut iniciar la sessió.",
    submitIdle: "Inicia sessió",
    submitPending: "Validant...",
    guestLogin: "Inicia sessió com a convidat",
    registerPrompt: "No tens un compte?",
    registerLink: "Registrar administrador",
    twoFactorTitle: "Verificació en dos passos",
    twoFactorDescription: "Introdueix el codi de l'app per continuar.",
    twoFactorLabel: "Codi de verificació",
    twoFactorPlaceholder: "123456",
    twoFactorRequiredError: "Introdueix el codi de verificació.",
    twoFactorCancel: "Cancel·la",
    twoFactorSubmitIdle: "Verifica",
    twoFactorSubmitPending: "Verificant...",
  },
  en: {
    languageLabel: "Language",
    heroTitle: "Manage your association with ease.",
    heroDescription:
      "Centralize finances, resources, events, and messaging in one intuitive platform built for community growth.",
    legalNotice: "All rights reserved.",
    loginTitle: "Welcome to Kora",
    loginDescription:
      "Enter your ID or email, password, and company code.",
    identifierLabel: "ID or email address",
    identifierPlaceholder: "ID or email",
    passwordLabel: "Password",
    passwordPlaceholder: "********",
    hidePassword: "Hide password",
    showPassword: "Show password",
    forgotPassword: "Forgot your password?",
    companyCodeLabel: "Company code",
    companyCodePlaceholder: "KORA-0000-0000",
    rememberCodes: "Remember codes",
    rememberSession: "Keep me signed in",
    requiredFieldsError: "Complete username, password, and company code.",
    loginFallbackError: "Could not sign in.",
    submitIdle: "Sign in",
    submitPending: "Validating...",
    guestLogin: "Continue as guest",
    registerPrompt: "Don't have an account?",
    registerLink: "Register administrator",
    twoFactorTitle: "Two-step verification",
    twoFactorDescription: "Enter the code from your app to continue.",
    twoFactorLabel: "Verification code",
    twoFactorPlaceholder: "123456",
    twoFactorRequiredError: "Enter the verification code.",
    twoFactorCancel: "Cancel",
    twoFactorSubmitIdle: "Verify",
    twoFactorSubmitPending: "Verifying...",
  },
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
  const [locale, setLocale] = useState<LocaleCode>("es");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(false);
  const [pendingTwoFactor, setPendingTwoFactor] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  const copy = LOGIN_COPY[locale];

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedLocale = window.localStorage.getItem(PUBLIC_LANGUAGE_STORAGE_KEY);
    if (storedLocale) {
      setLocale(resolveLocale(storedLocale));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(PUBLIC_LANGUAGE_STORAGE_KEY, locale);
    document.documentElement.lang = LOCALE_HTML_LANG[locale];
  }, [locale]);

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
      setError(copy.requiredFieldsError);
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
          : copy.loginFallbackError;

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
      setTwoFactorError(copy.twoFactorRequiredError);
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
                {copy.heroTitle}
              </h1>
              <p className="text-base text-white/80">{copy.heroDescription}</p>
            </div>

            <p className="text-xs text-white/60">
              © {new Date().getFullYear()} Kora Platform. {copy.legalNotice}
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-8">
            <div className="flex justify-end">
              <div className="relative w-full max-w-[220px]">
                <label htmlFor="login-language" className="sr-only">
                  {copy.languageLabel}
                </label>
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <span className="material-symbols-outlined text-[18px]">
                    translate
                  </span>
                </span>
                <select
                  id="login-language"
                  value={locale}
                  onChange={(event) => {
                    setLocale(resolveLocale(event.target.value));
                    setError(null);
                    setTwoFactorError(null);
                  }}
                  className="w-full appearance-none rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <span className="material-symbols-outlined text-[18px]">
                    expand_more
                  </span>
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-slate-900">
                {copy.loginTitle}
              </h2>
              <p className="text-sm text-slate-500">{copy.loginDescription}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {copy.identifierLabel}
                </label>
                <input
                  name="identifier"
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder={copy.identifierPlaceholder}
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {copy.passwordLabel}
                </label>

                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={copy.passwordPlaceholder}
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={
                      showPassword ? copy.hidePassword : copy.showPassword
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
                    {copy.forgotPassword}
                  </Link>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {copy.companyCodeLabel}
                </label>
                <input
                  name="companyCode"
                  type="text"
                  value={companyCode}
                  onChange={(event) =>
                    setCompanyCode(event.target.value.toUpperCase())
                  }
                  placeholder={copy.companyCodePlaceholder}
                  autoCapitalize="characters"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />

                <div className="flex justify-end">
                  <Link
                    href="/remember-company-code"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    {copy.rememberCodes}
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
                {copy.rememberSession}
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
                {submitting ? copy.submitPending : copy.submitIdle}
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
              {copy.guestLogin}
            </button>

            <p className="text-center text-sm text-slate-500">
              {copy.registerPrompt}{" "}
              <Link
                href="/register"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                {copy.registerLink}
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
                {copy.twoFactorTitle}
              </h3>
              <p className="text-sm text-slate-500">
                {copy.twoFactorDescription}
              </p>
            </div>

            <form onSubmit={handleTwoFactorSubmit} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  {copy.twoFactorLabel}
                </label>
                <input
                  value={twoFactorCode}
                  onChange={(event) => {
                    setTwoFactorCode(event.target.value.replace(/\D/g, ""));
                    setTwoFactorError(null);
                  }}
                  placeholder={copy.twoFactorPlaceholder}
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
                  {copy.twoFactorCancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {submitting
                    ? copy.twoFactorSubmitPending
                    : copy.twoFactorSubmitIdle}
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
