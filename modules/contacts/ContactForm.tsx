"use client";

import { useEffect, useRef, useState } from "react";
import {
  Contact,
  ContactKind,
  ContactType,
  ContactTypeLabels,
} from "./contact.types";

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
  "Álava",
  "Albacete",
  "Alicante",
  "Almería",
  "Asturias",
  "Ávila",
  "Badajoz",
  "Barcelona",
  "Burgos",
  "Cáceres",
  "Cádiz",
  "Cantabria",
  "Castellón",
  "Ciudad Real",
  "Córdoba",
  "Cuenca",
  "Girona",
  "Granada",
  "Guadalajara",
  "Guipúzcoa",
  "Huelva",
  "Huesca",
  "Illes Balears",
  "Jaén",
  "La Coruña",
  "La Rioja",
  "Las Palmas",
  "León",
  "Lleida",
  "Lugo",
  "Madrid",
  "Málaga",
  "Murcia",
  "Navarra",
  "Ourense",
  "Palencia",
  "Pontevedra",
  "Salamanca",
  "Santa Cruz de Tenerife",
  "Segovia",
  "Sevilla",
  "Soria",
  "Tarragona",
  "Teruel",
  "Toledo",
  "Valencia",
  "Valladolid",
  "Vizcaya",
  "Zamora",
  "Zaragoza",
  "Ceuta",
  "Melilla",
];

function toInputDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function fromInputDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function TypeIcon({ type }: { type: ContactType }) {
  const iconName =
    type === "provider"
      ? "storefront"
      : type === "collaborator"
        ? "groups"
        : "person";
  return (
    <span className="material-symbols-outlined text-[16px]">
      {iconName}
    </span>
  );
}

export default function ContactForm({
  initialData,
  onSubmit,
  onCancel,
}: Props) {
  const isEditing = Boolean(initialData);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [contactKind, setContactKind] = useState<ContactKind>(
    initialData?.kind ?? "person"
  );
  const [firstName, setFirstName] = useState(
    initialData?.firstName ?? ""
  );
  const [lastName, setLastName] = useState(
    initialData?.lastName ?? ""
  );
  const [representativeFirstName, setRepresentativeFirstName] = useState(
    initialData?.representativeFirstName ?? ""
  );
  const [representativeLastName, setRepresentativeLastName] = useState(
    initialData?.representativeLastName ?? ""
  );
  const [dni, setDni] = useState(initialData?.dni ?? "");
  const [birthDate, setBirthDate] = useState(
    toInputDate(initialData?.birthDate)
  );
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
  const [registeredDate, setRegisteredDate] = useState(
    toInputDate(initialData?.createdAt) ||
      toInputDate(new Date().toISOString())
  );
  const [deactivatedDate, setDeactivatedDate] = useState(
    toInputDate(initialData?.deactivatedAt)
  );
  const isEntity = contactKind === "entity";
  const allowedTypes = isEntity
    ? (["provider", "collaborator"] as ContactType[])
    : CONTACT_TYPES;

  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    dni?: string;
    types?: string;
    representativeFirstName?: string;
    representativeLastName?: string;
  }>({});

  useEffect(() => {
    if (!isEntity) return;
    setTypes((prev) => prev.filter((t) => t !== "member"));
  }, [isEntity]);

  const toggleType = (type: ContactType) => {
    if (isEntity && type === "member") return;
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

  const handleRemovePhoto = () => {
    setPhotoUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedDni = dni.trim();
    const trimmedRepFirst = representativeFirstName.trim();
    const trimmedRepLast = representativeLastName.trim();
    const nextErrors: typeof errors = {};

    if (!trimmedFirst) nextErrors.firstName = "Requerido";
    if (!isEntity && !trimmedLast) nextErrors.lastName = "Requerido";
    if (!trimmedDni) nextErrors.dni = "Requerido";
    if (isEntity && !trimmedRepFirst) {
      nextErrors.representativeFirstName = "Requerido";
    }
    if (isEntity && !trimmedRepLast) {
      nextErrors.representativeLastName = "Requerido";
    }

    const normalizedTypes = types.filter((t) =>
      allowedTypes.includes(t)
    );
    if (normalizedTypes.length === 0) {
      nextErrors.types = "Selecciona al menos un tipo.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const fullName = `${trimmedFirst} ${trimmedLast}`.trim();
    const createdAt =
      fromInputDate(registeredDate) ??
      initialData?.createdAt ??
      new Date().toISOString();
    const deactivatedAt = fromInputDate(deactivatedDate);

    const contact: Contact = {
      id: initialData?.id ?? crypto.randomUUID(),
      kind: contactKind,
      firstName: trimmedFirst,
      lastName: trimmedLast,
      fullName,
      dni: trimmedDni,
      birthDate: isEntity ? undefined : fromInputDate(birthDate),
      representativeFirstName: isEntity
        ? trimmedRepFirst || undefined
        : undefined,
      representativeLastName: isEntity
        ? trimmedRepLast || undefined
        : undefined,
      types: normalizedTypes,
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
      createdAt,
      deactivatedAt,
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
            <span className="material-symbols-outlined text-[16px]">
              save
            </span>
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
                  <span className="material-symbols-outlined text-[40px]">
                    photo_camera
                  </span>
                )}
                <span className="absolute -right-2 -bottom-2 flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-primary shadow-sm">
                  <span className="material-symbols-outlined text-[16px]">
                    edit
                  </span>
                </span>
              </button>
              {photoUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500 shadow-sm transition hover:bg-gray-50"
                >
                  Quitar foto
                </button>
              )}
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
              {isEntity ? ". Socio solo disponible para personas." : "."}
            </p>
            <div className="mt-4 space-y-2">
              {CONTACT_TYPES.map((type) => {
                const isActive = types.includes(type);
                const isDisabled = isEntity && type === "member";
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    disabled={isDisabled}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      isDisabled
                        ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
                        : isActive
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full ${
                          isActive
                            ? "bg-white/20 text-white"
                            : isDisabled
                              ? "bg-gray-100 text-gray-300"
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
                          : isDisabled
                            ? "border-gray-200 text-gray-300"
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
            <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                Perfil del contacto
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {([
                  { value: "person", label: "Persona" },
                  { value: "entity", label: "Entidad" },
                ] as const).map((option) => {
                  const isActive = contactKind === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setContactKind(option.value)}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Persona mantiene el formulario actual. Entidad solo
                proveedor o colaborador y requiere representante.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[16px]">
                  badge
                </span>
              </span>
              <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">
                Datos personales y fiscales
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold uppercase text-gray-400">
                  {isEntity ? "Razón social" : "Nombre completo"}
                </label>
                <div className="mt-2 grid gap-4 md:grid-cols-2">
                  <div>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                      placeholder={isEntity ? "Ej: Bar La Plaza" : "Ej: Juan"}
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
                      placeholder={
                        isEntity ? "Ej: La Plaza" : "Ej: Pérez García"
                      }
                      required={!isEntity}
                    />
                    {errors.lastName && (
                      <p className="mt-2 text-xs font-semibold text-red-600">
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>
                {isEntity && (
                  <p className="mt-2 text-xs text-gray-400">
                    Segundo campo opcional para nombre comercial.
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  NIF / CIF
                </label>
                <input
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  placeholder={isEntity ? "B12345678" : "00000000X"}
                  required
                />
                {errors.dni && (
                  <p className="mt-2 text-xs font-semibold text-red-600">
                    {errors.dni}
                  </p>
                )}
              </div>
              {!isEntity && (
                <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Fecha de nacimiento
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              )}
              {isEntity && (
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Representante legal
                  </label>
                  <div className="mt-2 grid gap-4 md:grid-cols-2">
                    <div>
                      <input
                        value={representativeFirstName}
                        onChange={(e) =>
                          setRepresentativeFirstName(e.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                        placeholder="Nombre del representante"
                        required={isEntity}
                      />
                      {errors.representativeFirstName && (
                        <p className="mt-2 text-xs font-semibold text-red-600">
                          {errors.representativeFirstName}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        value={representativeLastName}
                        onChange={(e) =>
                          setRepresentativeLastName(e.target.value)
                        }
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                        placeholder="Apellidos del representante"
                        required={isEntity}
                      />
                      {errors.representativeLastName && (
                        <p className="mt-2 text-xs font-semibold text-red-600">
                          {errors.representativeLastName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                    <span className="material-symbols-outlined text-[16px]">
                      expand_more
                    </span>
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Fecha de registro
                </label>
                <input
                  type="date"
                  value={registeredDate}
                  onChange={(e) => setRegisteredDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Fecha de baja
                </label>
                <input
                  type="date"
                  value={deactivatedDate}
                  onChange={(e) => setDeactivatedDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[16px]">
                  mail
                </span>
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
                <span className="material-symbols-outlined text-[16px]">
                  comment
                </span>
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
