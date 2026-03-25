"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  AdminAccount,
  AssociationProfile,
} from "@/core/session/session.store";
import type { SessionBootstrapPayload } from "@/core/session/session-payload";
import { createPasswordDigest } from "@/core/security/passwords";
import {
  applySessionPayload,
  parseApiResponse,
} from "@/lib/client/session-client";

type Step = "admin" | "association" | "success";

const FEATURE_ITEMS = [
  {
    title: "Finanzas",
    description: "Ingresos, gastos, cuotas y tesorería.",
    icon: "payments",
  },
  {
    title: "Eventos",
    description: "Agenda, inscripciones y seguimiento.",
    icon: "event",
  },
  {
    title: "Recursos",
    description: "Inventario, archivos y préstamos.",
    icon: "inventory_2",
  },
  {
    title: "Mensajería",
    description: "Campañas, avisos y comunicación interna.",
    icon: "mail",
  },
  {
    title: "Panel de control",
    description: "Indicadores clave en tiempo real.",
    icon: "dashboard",
  },
] as const;

const STEP_LABELS: Record<Step, string> = {
  admin: "Administrador",
  association: "Asociación",
  success: "Código",
};


function EyeIcon({ open }: { open: boolean }) {
  return (
    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
      {open ? "visibility" : "visibility_off"}
    </span>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("admin");
  const [pendingAdmin, setPendingAdmin] = useState<AdminAccount | null>(null);
  const [companyCode, setCompanyCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [registering, setRegistering] = useState(false);

  const handleAdminSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setFormError(null);

    const data = new FormData(event.currentTarget);
    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();
    const dni = String(data.get("dni") ?? "").trim().toUpperCase();
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "").trim();
    const passwordRepeat = String(data.get("passwordRepeat") ?? "").trim();

    if (
      !firstName ||
      !lastName ||
      !dni ||
      !email ||
      !password ||
      !passwordRepeat
    ) {
      setFormError("Completa todos los datos del administrador para continuar.");
      return;
    }

    if (password !== passwordRepeat) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    try {
      const passwordDigest = await createPasswordDigest(password);
      setPendingAdmin({
        firstName,
        lastName,
        dni,
        email,
        passwordDigest,
      });
      setStep("association");
    } catch (error) {
      console.error(error);
      setFormError(
        "No se pudo proteger la contraseña en este navegador. Inténtalo de nuevo."
      );
    }
  };

  const handleAssociationSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setFormError(null);

    if (registering) {
      return;
    }

    if (!pendingAdmin) {
      setFormError("Completa los datos del administrador primero.");
      setStep("admin");
      return;
    }

    const data = new FormData(event.currentTarget);
    const name = String(data.get("associationName") ?? "").trim();
    const taxId = String(data.get("taxId") ?? "").trim();
    const contactEmail = String(data.get("contactEmail") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const location = String(data.get("location") ?? "").trim();

    if (!name) {
      setFormError("Indica el nombre de la asociación para continuar.");
      return;
    }

    const association: AssociationProfile = {
      name,
      taxId: taxId || undefined,
      contactEmail: contactEmail || undefined,
      phone: phone || undefined,
      location: location || undefined,
    };

    setRegistering(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          admin: pendingAdmin,
          association,
        }),
      });

      const payload = await parseApiResponse<SessionBootstrapPayload>(response);
      applySessionPayload(payload);
      setCompanyCode(payload.companyCode);
      setStep("success");
    } catch (error) {
      console.error(error);
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la asociación."
      );
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="kora-logo" aria-hidden="true">
              <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                <path
                  d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="text-lg font-semibold text-slate-900">Kora</span>
          </div>

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
                Gestiona finanzas, recursos, eventos y mensajería desde una
                sola plataforma profesional diseñada para el crecimiento.
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Todo en un solo lugar
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                {FEATURE_ITEMS.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                        <span className="material-symbols-outlined text-[18px]">
                          {item.icon}
                        </span>
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-600">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-slate-900">
                Registro del administrador
              </h2>
              <p className="text-sm text-slate-500">
                Crea la cuenta del administrador y registra la asociación para
                generar el código de empresa.
              </p>

              <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {(["admin", "association", "success"] as const).map(
                  (item, index) => (
                    <span
                      key={item}
                      className={`rounded-full px-3 py-1 ${
                        step === item
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {index + 1}. {STEP_LABELS[item]}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <p>
                El código de empresa se usará para iniciar sesión junto con el
                DNI o correo y la contraseña.
              </p>
            </div>

            {step === "admin" ? (
              <form className="space-y-4" onSubmit={handleAdminSubmit}>
                {formError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {formError}
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Nombre (admin)
                    </label>
                    <input
                      name="firstName"
                      type="text"
                      placeholder="Juan"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Apellidos (admin)
                    </label>
                    <input
                      name="lastName"
                      type="text"
                      placeholder="García"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      DNI (admin)
                    </label>
                    <input
                      name="dni"
                      type="text"
                      placeholder="12345678A"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Correo electrónico
                    </label>
                    <input
                      name="email"
                      type="email"
                      placeholder="nombre@ejemplo.com"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Contraseña
                    </label>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 8 caracteres"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
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
                    <p className="text-xs text-slate-400">
                      Usa al menos 8 caracteres.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Repetir contraseña
                    </label>
                    <div className="relative">
                      <input
                        name="passwordRepeat"
                        type={showRepeat ? "text" : "password"}
                        placeholder="Repite la contraseña"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRepeat((previous) => !previous)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={
                          showRepeat
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                      >
                        <EyeIcon open={showRepeat} />
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:bg-blue-700"
                >
                  Continuar
                </button>
              </form>
            ) : null}

            {step === "association" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Administrador
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {pendingAdmin?.firstName} {pendingAdmin?.lastName}
                  </p>
                  <p>{pendingAdmin?.email}</p>
                </div>

                <form className="space-y-4" onSubmit={handleAssociationSubmit}>
                  {formError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {formError}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Nombre de la asociación
                    </label>
                    <input
                      name="associationName"
                      type="text"
                      placeholder="Ej.: Asociación Cultural de Vecinos"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        NIF / CIF
                      </label>
                      <input
                        name="taxId"
                        type="text"
                        placeholder="G12345678"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Correo de contacto
                      </label>
                      <input
                        name="contactEmail"
                        type="email"
                        placeholder="hola@asociacion.org"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Teléfono
                      </label>
                      <input
                        name="phone"
                        type="tel"
                        placeholder="+34 600 000 000"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Ciudad / Provincia
                      </label>
                      <input
                        name="location"
                        type="text"
                        placeholder="Madrid"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setStep("admin")}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Volver
                    </button>
                    <button
                      type="submit"
                      disabled={registering}
                      className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                    >
                      {registering
                        ? "Registrando..."
                        : "Registrar asociación y generar código"}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}

            {step === "success" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Registro completado. Guarda el código de empresa para iniciar
                  sesión.
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Código de empresa
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {companyCode || "KORA-0000-0000"}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Necesitarás este código para iniciar sesión con tu DNI o
                    correo y contraseña.
                  </p>
                </div>

                <Link
                  href="/dashboard"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:bg-blue-700"
                >
                  Ir al panel
                </Link>
              </div>
            ) : null}

            <p className="text-center text-sm text-slate-500">
              ¿Ya tienes una cuenta?{" "}
              <Link
                href="/login"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Inicia sesión aquí
              </Link>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Kora Management Inc.
      </footer>
    </div>
  );
}
