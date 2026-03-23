"use client";

import { useLocale } from "@/core/i18n/use-locale";
import { Contact } from "@/modules/contacts/contact.types";
import {
  tableBodyStyles,
  tableHeadCellStyles,
  tableHeadStyles,
  tableRowStyles,
} from "@/components/shared/tableStyles";

interface Props {
  contacts: Contact[];
  selectedId?: string;
  onSelect: (contact: Contact) => void;
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

function formatBirthDate(contact: Contact, locale: string) {
  if (contact.kind !== "person") return "-";
  if (!contact.birthDate) return "-";
  const date = new Date(contact.birthDate);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function ContactsTable({
  contacts,
  selectedId,
  onSelect,
}: Props) {
  const { formatLocale } = useLocale();
  if (contacts.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500">
        No hay contactos
      </div>
    );
  }

  return (
    <table className="min-w-[1100px] w-full text-left text-sm">
      <thead className={tableHeadStyles}>
        <tr>
          <th className={tableHeadCellStyles}>Perfil</th>
          <th className={tableHeadCellStyles}>Nombre</th>
          <th className={tableHeadCellStyles}>Apellidos</th>
          <th className={tableHeadCellStyles}>Fecha nacimiento</th>
          <th className={tableHeadCellStyles}>DNI</th>
          <th className={tableHeadCellStyles}>Teléfono</th>
          <th className={tableHeadCellStyles}>Correo</th>
        </tr>
      </thead>

      <tbody className={tableBodyStyles}>
        {contacts.map((c) => {
          const displayName = getDisplayName(c);
          const fallbackParts = displayName.split(" ").filter(Boolean);
          const firstName =
            c.firstName?.trim() || fallbackParts[0] || "Sin nombre";
          const lastName =
            c.lastName?.trim() || fallbackParts.slice(1).join(" ") || "-";
          const phone =
            c.phone?.trim() || c.secondaryPhone?.trim() || "-";
          const email = c.email?.trim() || "-";

          return (
            <tr
              key={c.id}
              onClick={() => onSelect(c)}
              className={`cursor-pointer transition ${tableRowStyles} ${
                c.id === selectedId
                  ? "bg-primary/5"
                  : ""
              }`}
            >
              <td className="px-6 py-4">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {c.photoUrl ? (
                    <img
                      src={c.photoUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(c)
                  )}
                </div>
              </td>
              <td className="px-6 py-4 font-semibold text-gray-900">
                {firstName}
              </td>
              <td className="px-6 py-4 text-gray-700">{lastName}</td>
              <td className="px-6 py-4 text-gray-600">
                {formatBirthDate(c, formatLocale)}
              </td>
              <td className="px-6 py-4 text-gray-600">{c.dni || "-"}</td>
              <td className="px-6 py-4 text-gray-600">{phone}</td>
              <td className="px-6 py-4 text-gray-600">{email}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
