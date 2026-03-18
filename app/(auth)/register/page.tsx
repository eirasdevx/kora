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

const STEP_LABELS: Record<Step, string> = {
  admin: "Administrador",
  association: "Asociación",
  success: "Código",
};

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("admin");
  const [pendingAdmin, setPendingAdmin] = useState<AdminAccount | null>(null);
  const [companyCode, setCompanyCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);

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
      setFormError("Completa todos los datos del administrador.");
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
      setFormError("No se pudo proteger la contraseña.");
    }
  };

  const handleAssociationSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setFormError(null);

    if (!pendingAdmin) {
      setFormError("Primero debes completar el administrador.");
      setStep("admin");
      return;
    }

    const data = new FormData(event.currentTarget);
    const name = String(data.get("associationName") ?? "").trim();
    const taxId = String(data.get("taxId") ?? "").trim();
    const contactEmail = String(data.get("contactEmail") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const location = String(data.get("location") ?? "").trim();
    const address = String(data.get("address") ?? "").trim();

    if (!name) {
      setFormError("Indica el nombre de la asociación.");
      return;
    }

    const association: AssociationProfile = {
      name,
      taxId: taxId || undefined,
      contactEmail: contactEmail || undefined,
      phone: phone || undefined,
      location: location || undefined,
      address: address || undefined,
    };

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
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">Kora</p>
            <p className="text-sm text-slate-500">
              Registro de nueva asociación
            </p>
          </div>
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
              MULTIUSUARIO
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight">
              Crea tu asociación y empieza a invitar miembros reales.
            </h1>
            <p className="mt-4 text-sm text-slate-300">
              El administrador registra la asociación, obtiene el código de
              empresa y después puede dar de alta al resto de personas desde la
              configuración de usuarios.
            </p>
            <div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              {(["admin", "association", "success"] as const).map((item) => (
                <span
                  key={item}
                  className={`rounded-full px-3 py-1 ${
                    step === item
                      ? "bg-blue-500 text-white"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {STEP_LABELS[item]}
                </span>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-900">
                {step === "admin"
                  ? "Paso 1: Administrador"
                  : step === "association"
                    ? "Paso 2: Asociación"
                    : "Registro completado"}
              </h2>
              <p className="text-sm text-slate-500">
                {step === "success"
                  ? "Guarda el código de empresa para el acceso de los miembros."
                  : "Completa los datos y Kora creará la asociación compartida en la base de datos."}
              </p>
            </div>

            {formError ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {formError}
              </div>
            ) : null}

            {step === "admin" ? (
              <form className="mt-6 space-y-4" onSubmit={handleAdminSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    name="firstName"
                    placeholder="Nombre"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <input
                    name="lastName"
                    placeholder="Apellidos"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    name="dni"
                    placeholder="DNI"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <input
                    name="email"
                    type="email"
                    placeholder="correo@asociacion.org"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Contraseña"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      name="passwordRepeat"
                      type={showRepeat ? "text" : "password"}
                      placeholder="Repetir contraseña"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRepeat((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showRepeat ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white"
                >
                  Continuar
                </button>
              </form>
            ) : null}

            {step === "association" ? (
              <form
                className="mt-6 space-y-4"
                onSubmit={handleAssociationSubmit}
              >
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Administrador:{" "}
                  <strong>
                    {pendingAdmin?.firstName} {pendingAdmin?.lastName}
                  </strong>{" "}
                  ({pendingAdmin?.email})
                </div>
                <input
                  name="associationName"
                  placeholder="Nombre de la asociación"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    name="taxId"
                    placeholder="NIF / CIF"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <input
                    name="contactEmail"
                    type="email"
                    placeholder="Correo de contacto"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    name="phone"
                    placeholder="Teléfono"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <input
                    name="location"
                    placeholder="Ciudad / Provincia"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <textarea
                  name="address"
                  placeholder="Dirección social"
                  className="min-h-[96px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("admin")}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Registrar asociación
                  </button>
                </div>
              </form>
            ) : null}

            {step === "success" ? (
              <div className="mt-6 space-y-5">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Asociación creada correctamente.
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Código de empresa
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {companyCode}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Los miembros que dé de alta el administrador iniciarán
                    sesión con este código, su correo o DNI y su contraseña.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
                >
                  Ir al panel
                </Link>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
