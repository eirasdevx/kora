"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageTopbar from "@/components/PageTopbar";
import { useSessionStore } from "@/core/session/session.store";

type ProfileFormState = {
  name: string;
  logoUrl: string;
  taxId: string;
  phone: string;
  contactEmail: string;
  location: string;
  address: string;
};

function normalize(value: string) {
  return value.trim();
}

function getAssociationFormState(
  association: ReturnType<typeof useSessionStore.getState>["association"]
): ProfileFormState {
  return {
    name: association?.name ?? "",
    logoUrl: association?.logoUrl ?? "",
    taxId: association?.taxId ?? "",
    phone: association?.phone ?? "",
    contactEmail: association?.contactEmail ?? "",
    location: association?.location ?? "",
    address: association?.address ?? "",
  };
}

type ProfileSettingsFormProps = {
  initialForm: ProfileFormState;
  lastSavedAt: number | null;
  onBack: () => void;
  onSave: (form: ProfileFormState) => void;
};

function ProfileSettingsForm({
  initialForm,
  lastSavedAt,
  onBack,
  onSave,
}: ProfileSettingsFormProps) {
  const [form, setForm] = useState<ProfileFormState>(initialForm);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasChanges = useMemo(() => {
    return (
      normalize(form.name) !== normalize(initialForm.name) ||
      normalize(form.logoUrl) !== normalize(initialForm.logoUrl) ||
      normalize(form.taxId) !== normalize(initialForm.taxId) ||
      normalize(form.phone) !== normalize(initialForm.phone) ||
      normalize(form.contactEmail) !== normalize(initialForm.contactEmail) ||
      normalize(form.location) !== normalize(initialForm.location) ||
      normalize(form.address) !== normalize(initialForm.address)
    );
  }, [form, initialForm]);

  const canSave = normalize(form.name).length > 0 && hasChanges;

  const handleLogoChange = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, logoUrl: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8">
      <PageTopbar>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Configuración &nbsp;›&nbsp; Perfil de asociación
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">
              Perfil de asociación
            </h1>
            <p className="text-sm text-gray-500">
              Configura la información pública y legal que identifica a tu
              organización.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm"
          >
            ← Volver al panel
          </button>
        </div>
      </PageTopbar>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Identidad visual</h2>
          <p className="mt-2 text-sm text-gray-500">
            Carga el logotipo oficial de tu asociación. Este se utilizará en
            facturas, documentos PDF y en el portal de socios.
          </p>
        </div>
        <label className="group flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500 transition hover:border-primary/40">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="sr-only"
            onChange={(e) => handleLogoChange(e.target.files?.[0])}
          />
          {form.logoUrl ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <img
                  src={form.logoUrl}
                  alt={form.name || "Logo asociacion"}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="text-xs text-gray-500">
                Haz clic para reemplazar el logo
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  setForm((prev) => ({ ...prev, logoUrl: "" }));
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500 shadow-sm hover:bg-gray-50"
              >
                Quitar logo
              </button>
            </div>
          ) : (
            <div>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 5h18v14H3z" />
                  <path d="M8 10l4 4 4-4" />
                </svg>
              </div>
              <p className="mt-4 font-semibold text-primary">
                Haz clic para subir un logo
              </p>
              <p className="text-xs text-gray-400">
                Formatos recomendados: SVG, PNG de alta calidad (Max. 5MB)
              </p>
            </div>
          )}
        </label>
      </section>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Información general
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Estos datos se sincronizan con la información introducida al iniciar
            sesión como invitado.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Nombre de la asociación
            </label>
            <input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Asociación Cultural"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                NIF / CIF
              </label>
              <input
                value={form.taxId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, taxId: e.target.value }))
                }
                placeholder="G12345678"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Teléfono
              </label>
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+34 600 000 000"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Correo electrónico de contacto
            </label>
            <input
              value={form.contactEmail}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, contactEmail: e.target.value }))
              }
              placeholder="contacto@asociacion.org"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Ciudad / Provincia
            </label>
            <input
              value={form.location}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, location: e.target.value }))
              }
              placeholder="Madrid"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Dirección social (opcional)
            </label>
            <textarea
              value={form.address}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="Calle de la Innovación 42, 28014 Madrid, España"
              className="mt-2 min-h-[110px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Preferencias locales
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Configura la moneda predeterminada para tus recibos y el huso
            horario para las notificaciones.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Moneda base
            </label>
            <select className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
              <option>Euro (€)</option>
              <option>Dólar (USD)</option>
              <option>Libra (GBP)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Huso horario
            </label>
            <select className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
              <option>(GMT+01:00) Madrid</option>
              <option>(GMT+00:00) Lisboa</option>
              <option>(GMT+02:00) Atenas</option>
            </select>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span
            className={`h-2 w-2 rounded-full ${
              hasChanges ? "bg-amber-400" : "bg-emerald-400"
            }`}
          />
          {hasChanges
            ? "Hay cambios pendientes de guardar"
            : lastSavedAt
              ? "Cambios guardados"
              : "Sin cambios pendientes"}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm(initialForm)}
            disabled={!hasChanges}
            className={`rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition ${
              hasChanges
                ? "text-gray-600 hover:bg-gray-50"
                : "cursor-not-allowed text-gray-300 opacity-60"
            }`}
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={!canSave}
            className={`rounded-2xl px-5 py-2 text-sm font-semibold text-white shadow transition ${
              canSave
                ? "bg-primary hover:bg-primary/90"
                : "cursor-not-allowed bg-primary/50"
            }`}
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const hydrated = useSessionStore((s) => s.hydrated);
  const association = useSessionStore((s) => s.association);
  const setAssociation = useSessionStore((s) => s.setAssociation);

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const initialForm = useMemo(
    () => getAssociationFormState(association),
    [association]
  );
  const associationKey = useMemo(() => JSON.stringify(initialForm), [initialForm]);

  if (!hydrated) {
    return <div className="min-h-screen bg-background-light" aria-busy="true" />;
  }

  return (
    <ProfileSettingsForm
      key={associationKey}
      initialForm={initialForm}
      lastSavedAt={lastSavedAt}
      onBack={() => router.push("/settings")}
      onSave={(form) => {
        const name = normalize(form.name);
        if (!name) return;

        setAssociation({
          name,
          logoUrl: form.logoUrl || undefined,
          taxId: normalize(form.taxId) || undefined,
          phone: normalize(form.phone) || undefined,
          contactEmail: normalize(form.contactEmail) || undefined,
          location: normalize(form.location) || undefined,
          address: normalize(form.address) || undefined,
        });
        setLastSavedAt(Date.now());
      }}
    />
  );
}
