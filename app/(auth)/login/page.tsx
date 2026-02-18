"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/core/session/session.store";
import { useUsersStore } from "@/core/users/users.store";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useDocumentsStore } from "@/modules/documents/documents.store";
import { useEventsStore } from "@/modules/events/events.store";
import { useSocialPostsStore } from "@/modules/social/social.store";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import {
  createPasswordDigest,
  verifyPassword,
} from "@/core/security/passwords";
import { getSecureItem, setSecureItem } from "@/core/security/secure-storage";

const LAST_LOGIN_KEY = "kora-last-login";

export default function LoginPage() {
  const router = useRouter();
  const mode = useSessionStore((s) => s.mode);
  const hydrated = useSessionStore((s) => s.hydrated);
  const admin = useSessionStore((s) => s.admin);
  const companyCode = useSessionStore((s) => s.companyCode);
  const setGuest = useSessionStore((s) => s.setGuest);
  const setAuthenticated = useSessionStore((s) => s.setAuthenticated);
  const setAdmin = useSessionStore((s) => s.setAdmin);
  const ensureUsersSeed = useUsersStore((s) => s.ensureSeed);
  const resetContacts = useContactsStore((s) => s.resetContacts);
  const resetDocuments = useDocumentsStore((s) => s.resetDocuments);
  const resetEvents = useEventsStore((s) => s.resetEvents);
  const resetPosts = useSocialPostsStore((s) => s.resetPosts);
  const resetTransactions = useTransactionsStore((s) => s.resetTransactions);
  const [guestOpen, setGuestOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [identifierValue, setIdentifierValue] = useState("");
  const [companyCodeValue, setCompanyCodeValue] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (mode) router.replace("/dashboard");
  }, [hydrated, mode, router]);

  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    void (async () => {
      try {
        const saved = await getSecureItem<{
          identifier?: string;
          companyCode?: string;
        }>(LAST_LOGIN_KEY);
        if (!saved || !active) return;
        if (typeof saved.identifier === "string") {
          setIdentifierValue(saved.identifier);
        }
        if (typeof saved.companyCode === "string") {
          setCompanyCodeValue(saved.companyCode);
        }
      } catch {
        // ignore invalid storage
      }
    })();
    return () => {
      active = false;
    };
  }, [hydrated]);

  const persistLastLogin = async (
    identifier: string,
    companyCode: string
  ) => {
    try {
      await setSecureItem(LAST_LOGIN_KEY, { identifier, companyCode });
    } catch {
      // ignore storage failures
    }
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);

    if (!admin || !companyCode) {
      setLoginError(
        "No hay un administrador registrado. Completa el registro para generar el código de empresa."
      );
      return;
    }

    const data = new FormData(event.currentTarget);
    const identifier = String(data.get("identifier") ?? "").trim();
    const password = String(data.get("password") ?? "").trim();
    const code = String(data.get("companyCode") ?? "")
      .trim()
      .toUpperCase();

    if (!identifier || !password || !code) {
      setLoginError(
        "Completa DNI o correo, contraseña y código de empresa."
      );
      return;
    }

    const matchesCode = code === companyCode;
    if (!matchesCode) {
      setLoginError(
        "Credenciales incorrectas o código de empresa inválido."
      );
      return;
    }

    const identifierLower = identifier.toLowerCase();
    const identifierUpper = identifier.toUpperCase();
    const matchesAdminIdentifier =
      identifierLower === admin.email.toLowerCase() ||
      identifierUpper === admin.dni;
    let matchesAdminPassword = false;
    let resolvedAdmin = admin;

    if (matchesAdminIdentifier) {
      try {
        if (admin.passwordDigest) {
          matchesAdminPassword = await verifyPassword(
            password,
            admin.passwordDigest
          );
        } else if (admin.password) {
          matchesAdminPassword = password === admin.password;
        }
      } catch (error) {
        console.error(error);
        setLoginError(
          "No se pudo validar la contraseña. Actualiza el navegador e inténtalo de nuevo."
        );
        return;
      }

      if (matchesAdminPassword && !admin.passwordDigest) {
        try {
          const passwordDigest = await createPasswordDigest(password);
          resolvedAdmin = {
            ...admin,
            passwordDigest,
          };
          delete (resolvedAdmin as { password?: string }).password;
          setAdmin(resolvedAdmin);
        } catch (error) {
          console.error(error);
          setLoginError(
            "No se pudo proteger la contraseña. Inténtalo de nuevo."
          );
          return;
        }
      }
    }

    ensureUsersSeed(companyCode, resolvedAdmin);
    const { users, updateUser } = useUsersStore.getState();
    const candidate = users.find((user) => {
      const email = user.email.toLowerCase();
      const dni = (user.dni ?? "").toUpperCase();
      return email === identifierLower || dni === identifierUpper;
    });

    if (!candidate) {
      if (matchesAdminIdentifier && matchesAdminPassword) {
        const adminUser = users.find(
          (user) => user.email.toLowerCase() === admin.email.toLowerCase()
        );
        if (adminUser) {
          if (!adminUser.passwordDigest && resolvedAdmin.passwordDigest) {
            updateUser(adminUser.id, {
              passwordDigest: resolvedAdmin.passwordDigest,
            });
          }
          await persistLastLogin(identifier, code);
          setAuthenticated(adminUser.id);
          router.push("/dashboard");
          return;
        }
      }
      setLoginError(
        "Credenciales incorrectas o código de empresa inválido."
      );
      return;
    }

    let matchesCandidatePassword = false;
    try {
      if (candidate.passwordDigest) {
        matchesCandidatePassword = await verifyPassword(
          password,
          candidate.passwordDigest
        );
      } else if (candidate.password) {
        matchesCandidatePassword = candidate.password.trim() === password;
      }
    } catch (error) {
      console.error(error);
      setLoginError(
        "No se pudo validar la contraseña. Actualiza el navegador e inténtalo de nuevo."
      );
      return;
    }

    if (!matchesCandidatePassword) {
      if (
        candidate.role === "Admin" &&
        !candidate.passwordDigest &&
        matchesAdminIdentifier &&
        matchesAdminPassword
      ) {
        if (resolvedAdmin.passwordDigest) {
          updateUser(candidate.id, {
            passwordDigest: resolvedAdmin.passwordDigest,
          });
        }
      } else {
        setLoginError(
          "Credenciales incorrectas o código de empresa inválido."
        );
        return;
      }
    } else if (candidate.password && !candidate.passwordDigest) {
      try {
        const passwordDigest = await createPasswordDigest(password);
        updateUser(candidate.id, { passwordDigest });
      } catch (error) {
        console.error(error);
        setLoginError(
          "No se pudo proteger la contraseña. Inténtalo de nuevo."
        );
        return;
      }
    }

    setAuthenticated(candidate.id);
    await persistLastLogin(identifier, code);
    router.push("/dashboard");
  };

  const handleGuestSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetContacts();
    resetDocuments();
    resetEvents();
    resetPosts();
    resetTransactions();
    setGuest();
    setGuestOpen(false);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 text-white lg:block">
          <div className="absolute inset-0 opacity-25">
            <div className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-sky-200/20 blur-3xl" />
          </div>
          <div className="relative flex h-full flex-col justify-between p-12">
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
                Gestiona tu asociación con elegancia.
              </h1>
              <p className="text-base text-white/80">
                Centraliza contabilidad, eventos y redes sociales en una sola plataforma
                intuitiva diseñada para el crecimiento comunitario.
              </p>
            </div>
            <p className="text-xs text-white/60">
              © {new Date().getFullYear()} Kora Platform. Todos los derechos reservados.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-slate-900">Bienvenido a Kora</h2>
              <p className="text-sm text-slate-500">
                Ingresa tu DNI o correo, contraseña y el código de empresa.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {!admin || !companyCode ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  No hay un administrador registrado. Completa el registro para generar el
                  código de empresa.
                </div>
              ) : null}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  DNI o correo electrónico
                </label>
                <input
                  name="identifier"
                  type="text"
                  placeholder="DNI o correo"
                  value={identifierValue}
                  onChange={(event) => setIdentifierValue(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <label className="font-medium text-slate-700">Contraseña</label>
                  <button type="button" className="font-medium text-blue-600 hover:text-blue-700">
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Código de empresa</label>
                <input
                  name="companyCode"
                  type="text"
                  placeholder="KORA-0000-0000"
                  value={companyCodeValue}
                  onChange={(event) => setCompanyCodeValue(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                Mantener sesión iniciada
              </label>

              {loginError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {loginError}
                </div>
              ) : null}
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700"
              >
                Iniciar sesión
              </button>
            </form>

            <button
              type="button"
              onClick={() => setGuestOpen(true)}
              className="w-full rounded-xl border border-dashed border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:border-slate-300"
            >
              Iniciar sesión como invitado
            </button>

            <p className="text-center text-sm text-slate-500">
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                Registrar administrador
              </Link>
            </p>
          </div>
        </section>
      </div>

      {guestOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Datos de la asociación</h3>
                <p className="text-sm text-slate-500">
                  Completa la información básica para iniciar como invitado. Estos datos no se
                  guardarán.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGuestOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-500 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleGuestSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nombre de la asociación</label>
                  <input
                    name="associationName"
                    type="text"
                    placeholder="Asociación Cultural"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">NIF / CIF</label>
                  <input
                    name="taxId"
                    type="text"
                    placeholder="G12345678"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Correo de contacto</label>
                  <input
                    name="contactEmail"
                    type="email"
                    placeholder="hola@asociacion.org"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Teléfono</label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+34 600 000 000"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Ciudad / Provincia</label>
                <input
                  name="location"
                  type="text"
                  placeholder="Madrid"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setGuestOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:bg-blue-700"
                >
                  Continuar como invitado
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
