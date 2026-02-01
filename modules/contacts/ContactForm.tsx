"use client";

import { useRef, useState } from "react";
import { Contact, ContactType, ContactTypeLabels } from "./contact.types";

interface Props {
  initialData?: Contact;
  onSubmit: (contact: Contact) => Promise<void>;
  onCancel?: () => void;
}

const CONTACT_TYPES: ContactType[] = [
  "member",
  "provider",
  "collaborator",
];

const REGION_OPTIONS = [
  "Madrid",
  "Barcelona",
  "Valencia",
  "Sevilla",
  "Bilbao",
  "Zaragoza",
  "Málaga",
  "Otro",
];

function TypeIcon({ type }: { type: ContactType }) {
  if (type === "provider") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="7" width="18" height="12" rx="2" />
        <path d="M9 7V5a3 3 0 0 1 6 0v2" />
      </svg>
    );
  }

  if (type === "collaborator") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="8" cy="8" r="3" />
        <circle cx="16" cy="8" r="3" />
        <path d="M2 20c1.6-3 9.4-3 11 0" />
        <path d="M11 20c1.1-2 6.9-2 8 0" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c2.4-4 13.6-4 16 0" />
    </svg>
  );
}

export default function ContactForm({
  initialData,
  onSubmit,
  onCancel,
}: Props) {
  const isEditing = Boolean(initialData);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [firstName, setFirstName] = useState(
    initialData?.firstName ?? ""
  );
  const [lastName, setLastName] = useState(
    initialData?.lastName ?? ""
  );
  const [dni, setDni] = useState(initialData?.dni ?? "");
  const [types, setTypes] = useState<ContactType[]>(
    initialData?.types ?? []
  );
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [secondaryPhone, setSecondaryPhone] = useState(
    initialData?.secondaryPhone ?? ""
  );
  const [website, setWebsite] = useState(initialData?.website ?? "");
  const [socialLinks, setSocialLinks] = useState(
    initialData?.socialLinks ?? ""
  );
  const [postalCode, setPostalCode] = useState(
    initialData?.postalCode ?? ""
  );
  const [address, setAddress] = useState(
    initialData?.address ?? ""
  );
  const [city, setCity] = useState(initialData?.city ?? "");
  const [region, setRegion] = useState(
    initialData?.region ?? ""
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [photoUrl, setPhotoUrl] = useState(
    initialData?.photoUrl ?? ""
  );

  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    dni?: string;
    types?: string;
  }>({});

  const toggleType = (type: ContactType) => {
    setTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const handlePhotoChange = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedDni = dni.trim();
    const nextErrors: typeof errors = {};

    if (!trimmedFirst) nextErrors.firstName = "Requerido";
    if (!trimmedLast) nextErrors.lastName = "Requerido";
    if (!trimmedDni) nextErrors.dni = "Requerido";
    if (types.length === 0) {
      nextErrors.types = "Selecciona al menos un tipo.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const fullName = `${trimmedFirst} ${trimmedLast}`.trim();

    const contact: Contact = {
      id: initialData?.id ?? crypto.randomUUID(),
      firstName: trimmedFirst,
      lastName: trimmedLast,
      fullName,
      dni: trimmedDni,
      types,
      email: email || undefined,
      phone: phone || undefined,
      secondaryPhone: secondaryPhone || undefined,
      website: website || undefined,
      socialLinks: socialLinks || undefined,
      postalCode: postalCode || undefined,
      address: address || undefined,
      city: city || undefined,
      region: region || undefined,
      notes: notes || undefined,
      photoUrl: photoUrl || undefined,
      createdAt:
        initialData?.createdAt ?? new Date().toISOString(),
    };

    await onSubmit(contact);
  };

  const primaryLabel = isEditing
    ? "Guardar cambios"
    : "Guardar Contacto";
  const footerLabel = isEditing
    ? "Guardar cambios"
    : "Finalizar y Guardar";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50"
              aria-label="Volver"
            >
              &lt;
            </button>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {isEditing ? "Editar contacto" : "Crear Nuevo Contacto"}
            </h1>
            <p className="text-sm text-gray-500">
              Información detallada y notas internas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 21h14a2 2 0 0 0 2-2V7l-4-4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" />
              <path d="M17 21v-8H7v8" />
              <path d="M7 3v4h8" />
            </svg>
            {primaryLabel}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center gap-4 text-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative flex h-36 w-36 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400"
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Foto del contacto"
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-10 w-10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="7" width="18" height="12" rx="2" />
                    <path d="M7 7l2-3h6l2 3" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                )}
                <span className="absolute -right-2 -bottom-2 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-primary shadow-sm">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => handlePhotoChange(e.target.files?.[0])}
              />
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Foto del contacto
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Formatos recomendados: JPG o PNG
                </p>
                <p className="text-xs text-gray-400">Tamaño máximo recomendado: 2MB.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
              Tipo de contacto
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Selección múltiple permitida
            </p>
            <div className="mt-4 space-y-2">
              {CONTACT_TYPES.map((type) => {
                const isActive = types.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? "border-primary bg-primary text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <TypeIcon type={type} />
                      </span>
                      {ContactTypeLabels[type]}
                    </span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        isActive
                          ? "border-white text-white"
                          : "border-gray-300 text-gray-400"
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.types && (
              <p className="mt-3 text-xs font-semibold text-red-600">
                {errors.types}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                i
              </span>
              <p className="font-semibold">Privacidad de datos</p>
            </div>
            <p className="mt-2 text-blue-600/90">
              La información fiscal y de contacto se almacena de forma
              cifrada cumpliendo con la RGPD vigente.
            </p>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M8 9h8M8 13h8M8 17h4" />
                </svg>
              </span>
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">
                Datos personales y fiscales
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Nombre completo / Razón social
                </label>
                <div className="mt-2 grid gap-4 md:grid-cols-2">
                  <div>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      placeholder="Ej: Juan"
                      required
                    />
                    {errors.firstName && (
                      <p className="mt-2 text-xs font-semibold text-red-600">
                        {errors.firstName}
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      placeholder="Ej: Pérez García"
                      required
                    />
                    {errors.lastName && (
                      <p className="mt-2 text-xs font-semibold text-red-600">
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  NIF / CIF
                </label>
                <input
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  placeholder="00000000X"
                  required
                />
                {errors.dni && (
                  <p className="mt-2 text-xs font-semibold text-red-600">
                    {errors.dni}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Código postal
                </label>
                <input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  placeholder="28001"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Dirección postal
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  placeholder="Calle, número, piso, puerta"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Ciudad
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  placeholder="Ej: Madrid"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Provincia / Región
                </label>
                <div className="relative mt-2">
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="">Seleccionar...</option>
                    {REGION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16v12H4z" />
                  <path d="M22 7l-10 6L2 7" />
                </svg>
              </span>
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">
                Información de contacto
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Correo electrónico principal
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Teléfono principal
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  placeholder="+34 600 000 000"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Teléfono secundario
                </label>
                <input
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  placeholder="Otro número de contacto"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Sitio web / Portfolio
                </label>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  placeholder="https://www.ejemplo.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Redes sociales (LinkedIn, Twitter, etc.)
                </label>
                <input
                  value={socialLinks}
                  onChange={(e) => setSocialLinks(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  placeholder="Enlaces separados por comas"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16v14H7l-3 3Z" />
                  <path d="M8 9h8M8 13h6" />
                </svg>
              </span>
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">
                Notas y observaciones
              </h2>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase text-gray-400">
                Comentarios internos del administrador
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 min-h-[160px] w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="Añade cualquier detalle relevante sobre este contacto, historial de interacciones o acuerdos específicos..."
              />
              <p className="mt-3 text-xs text-gray-400">
                Estas notas son privadas y solo visibles para
                administradores de Kora.
              </p>
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-400 sm:flex-row sm:items-center sm:justify-between">
        <span>Última revisión del formulario: Hoy</span>
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
            >
              Descartar
            </button>
          )}
          <button
            type="submit"
            className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
          >
            {footerLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
