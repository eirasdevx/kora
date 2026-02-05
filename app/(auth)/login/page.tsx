"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/core/session/session.store";

export default function LoginPage() {
  const router = useRouter();
  const mode = useSessionStore((s) => s.mode);
  const hydrated = useSessionStore((s) => s.hydrated);
  const setGuest = useSessionStore((s) => s.setGuest);
  const setAuthenticated = useSessionStore((s) => s.setAuthenticated);
  const [guestOpen, setGuestOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (mode) router.replace("/dashboard");
  }, [hydrated, mode, router]);

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthenticated();
    router.push("/dashboard");
  };

  const handleGuestSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("associationName") ?? "").trim();
    const taxId = String(data.get("taxId") ?? "").trim();
    const contactEmail = String(data.get("contactEmail") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const location = String(data.get("location") ?? "").trim();

    setGuest({
      name: name || "Invitado",
      taxId: taxId || undefined,
      contactEmail: contactEmail || undefined,
      phone: phone || undefined,
      location: location || undefined,
    });
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
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <span className="text-lg font-semibold">K</span>
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
            <p className="text-xs text-white/60">© 2024 Kora Platform. Todos los derechos reservados.</p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold text-slate-900">Bienvenido a Kora</h2>
              <p className="text-sm text-slate-500">
                Ingresa tus credenciales para acceder a la plataforma de gestión.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Correo electrónico</label>
                <input
                  type="email"
                  placeholder="nombre@asociacion.com"
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
                <input
                  type="password"
                  placeholder="••••••••"
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

              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700"
              >
                Iniciar sesión
              </button>
            </form>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              O CONTINUA CON
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Google
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Microsoft
              </button>
            </div>

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
                Registro (próximamente)
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
                  Completa la información básica para iniciar como invitado.
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
