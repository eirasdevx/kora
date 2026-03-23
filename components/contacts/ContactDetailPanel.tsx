"use client";

import { useLocale } from "@/core/i18n/use-locale";
import {
  Contact,
  ContactKindLabels,
  ContactTypeLabels,
} from "@/modules/contacts/contact.types";

interface Props {
  contact: Contact | null;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onClose?: () => void;
}

function getDisplayName(contact: Contact) {
  const composed = `${contact.firstName} ${contact.lastName}`.trim();
  if (composed) return composed;
  return contact.fullName ? "Sin nombre";
}

function getInitials(contact: Contact) {
  return getDisplayName(contact)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value: string | undefined, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale);
}

export default function ContactDetailPanel({
  contact,
  onEdit,
  onDelete,
  onClose,
}: Props) {
  const { formatLocale } = useLocale();
  if (!contact) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-500">
        Selecciona un contacto para ver sus detalles.
      </div>
    );
  }

  const displayName = getDisplayName(contact);
  const addressLine = [
    contact.address,
    contact.postalCode,
    contact.city,
    contact.region,
  ]
    .filter(Boolean)
    .join(", ");
  const representativeName = `${contact.representativeFirstName ? ""} ${
    contact.representativeLastName ? ""
  }`.trim();

  return (
    <div className="flex h-full flex-col gap-6 rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {contact.photoUrl ? (
            <img
              src={contact.photoUrl}
              alt={displayName}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {getInitials(contact)}
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {displayName}
            </h2>
            <p className="text-sm text-gray-500">Detalle del contacto</p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
            aria-label="Cerrar panel"
          >
            <span className="material-symbols-outlined text-[16px]">
              close
            </span>
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {contact.types.map((t) => (
          <span
            key={t}
            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
          >
            {ContactTypeLabels[t]}
          </span>
        ))}
      </div>

      <div className="grid gap-4 text-sm text-gray-700">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Perfil
          </p>
          <p className="mt-1">{ContactKindLabels[contact.kind]}</p>
        </div>
        {contact.kind === "entity" && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Representante
            </p>
            <p className="mt-1">{representativeName || "—"}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {contact.kind === "entity" ? "NIF / CIF" : "DNI"}
          </p>
          <p className="mt-1">{contact.dni || "—"}</p>
        </div>
        {contact.kind === "person" && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Fecha de nacimiento
            </p>
            <p className="mt-1">
              {formatDate(contact.birthDate, formatLocale)}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Email
          </p>
          <p className="mt-1">{contact.email || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Teléfono principal
          </p>
          <p className="mt-1">{contact.phone || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Dirección
          </p>
          <p className="mt-1">{addressLine || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Notas
          </p>
          <p className="mt-1">{contact.notes || "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Fecha de registro
          </p>
          <p className="mt-1">
            {formatDate(contact.createdAt, formatLocale)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Fecha de baja
          </p>
          <p className="mt-1">
            {formatDate(contact.deactivatedAt, formatLocale)}
          </p>
        </div>
      </div>

      <div className="mt-auto flex gap-2">
        <button
          onClick={() => onEdit(contact)}
          className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(contact)}
          className="flex-1 rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
