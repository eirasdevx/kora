"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [showNotice, setShowNotice] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <span className="text-lg font-semibold">K</span>
            </span>
            <span className="text-lg font-semibold text-slate-900">Kora</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-500 md:flex">
            <button type="button" className="hover:text-slate-900">Módulos</button>
            <button type="button" className="hover:text-slate-900">Precios</button>
            <button type="button" className="hover:text-slate-900">Contacto</button>
          </nav>
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:bg-blue-700"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid gap-8 rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/60 lg:grid-cols-[1fr_1fr]">
          <section className="space-y-6 rounded-2xl bg-slate-50 p-8">
            <span className="inline-flex w-fit items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              ÚNETE A KORA
            </span>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-slate-900">
                Impulsa tu asociación hoy mismo
              </h1>
              <p className="text-sm text-slate-600">
                Gestiona contabilidad, eventos y comunidad desde una sola plataforma profesional
                diseñada para el crecimiento.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <span className="text-sm font-semibold">C</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Contabilidad Simplificada</h3>
                  <p className="text-sm text-slate-600">
                    Automatiza cuotas y reportes financieros sin complicaciones.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <span className="text-sm font-semibold">E</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Eventos y Redes</h3>
                  <p className="text-sm text-slate-600">
                    Organiza actividades y mantén conectada a tu comunidad.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-blue-200 via-blue-100 to-slate-100 p-8">
              <div className="h-32 w-32 rounded-2xl bg-white/80 shadow-lg" />
            </div>
          </section>

          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Registro (próximamente)
              </h2>
              <p className="text-sm text-slate-500">
                Completa los datos para comenzar la configuración.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p>
                El registro aún no está disponible. Por ahora, puedes{" "}
                <Link href="/login" className="font-semibold underline">
                  iniciar sesión como invitado
                </Link>
                .
              </p>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setShowNotice(true);
              }}
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nombre de la asociación</label>
                <input
                  type="text"
                  placeholder="Ej.: Asociación Cultural de Vecinos"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nombre (admin)</label>
                  <input
                    type="text"
                    placeholder="Juan"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Apellidos (admin)</label>
                  <input
                    type="text"
                    placeholder="García"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Correo electrónico</label>
                <input
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Contraseña</label>
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Enfoque de gestión</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="rounded-xl border-2 border-blue-600 bg-blue-50 px-4 py-4 text-sm font-semibold text-blue-700"
                  >
                    Online
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-600 hover:border-slate-300"
                  >
                    Presencial
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled
                className="w-full cursor-not-allowed rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white opacity-60 shadow-md shadow-blue-200"
              >
                Registro próximamente
              </button>
            </form>

            {showNotice ? (
              <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                El registro estará disponible pronto. Mientras tanto, puedes{" "}
                <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                  entrar como invitado
                </Link>
                .
              </p>
            ) : null}

            <p className="text-center text-sm text-slate-500">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                Inicia sesión aquí
              </Link>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        © 2024 Kora Management Inc.
      </footer>
    </div>
  );
}
