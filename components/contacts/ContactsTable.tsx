"use client";

import { useMemo, useState } from "react";
import SortableHeader from "@/components/shared/SortableHeader";
import {
  tableBodyStyles,
  tableHeadCellStyles,
  tableHeadStyles,
  tableRowStyles,
} from "@/components/shared/tableStyles";
import { useLocale } from "@/core/i18n/use-locale";
import {
  applySortDirection,
  compareDate,
  compareText,
  SortState,
  toggleSort,
} from "@/lib/table-sorting";
import { Contact } from "@/modules/contacts/contact.types";

interface Props {
  contacts: Contact[];
  selectedId?: string;
  onSelect: (contact: Contact) => void;
}

type ContactsSortKey =
  | "firstName"
  | "lastName"
  | "birthDate"
  | "dni"
  | "phone"
  | "email";

function getDisplayName(contact: Contact) {
  const composed = `${contact.firstName} ${contact.lastName}`.trim();
  if (composed) return composed;
  return contact.fullName ?? "Sin nombre";
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
  const [sortState, setSortState] = useState<SortState<ContactsSortKey>>({
    key: "firstName",
    direction: "asc",
  });

  const sortedContacts = useMemo(() => {
    return [...contacts].sort((left, right) => {
      const leftDisplayName = getDisplayName(left);
      const rightDisplayName = getDisplayName(right);
      const leftFallbackParts = leftDisplayName.split(" ").filter(Boolean);
      const rightFallbackParts = rightDisplayName.split(" ").filter(Boolean);
      const leftFirstName =
        left.firstName?.trim() || leftFallbackParts[0] || "Sin nombre";
      const rightFirstName =
        right.firstName?.trim() || rightFallbackParts[0] || "Sin nombre";
      const leftLastName =
        left.lastName?.trim() || leftFallbackParts.slice(1).join(" ") || "-";
      const rightLastName =
        right.lastName?.trim() || rightFallbackParts.slice(1).join(" ") || "-";
      const leftPhone = left.phone?.trim() || left.secondaryPhone?.trim() || "-";
      const rightPhone =
        right.phone?.trim() || right.secondaryPhone?.trim() || "-";

      switch (sortState.key) {
        case "lastName":
          return applySortDirection(
            compareText(leftLastName, rightLastName, formatLocale),
            sortState.direction
          );
        case "birthDate":
          return applySortDirection(
            compareDate(left.birthDate, right.birthDate),
            sortState.direction
          );
        case "dni":
          return applySortDirection(
            compareText(left.dni, right.dni, formatLocale),
            sortState.direction
          );
        case "phone":
          return applySortDirection(
            compareText(leftPhone, rightPhone, formatLocale),
            sortState.direction
          );
        case "email":
          return applySortDirection(
            compareText(left.email, right.email, formatLocale),
            sortState.direction
          );
        case "firstName":
        default:
          return applySortDirection(
            compareText(leftFirstName, rightFirstName, formatLocale),
            sortState.direction
          );
      }
    });
  }, [contacts, formatLocale, sortState]);

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
          <SortableHeader
            label="Nombre"
            active={sortState.key === "firstName"}
            direction={sortState.direction}
            onClick={() =>
              setSortState((current) => toggleSort(current, "firstName"))
            }
            className={tableHeadCellStyles}
          />
          <SortableHeader
            label="Apellidos"
            active={sortState.key === "lastName"}
            direction={sortState.direction}
            onClick={() =>
              setSortState((current) => toggleSort(current, "lastName"))
            }
            className={tableHeadCellStyles}
          />
          <SortableHeader
            label="Fecha nacimiento"
            active={sortState.key === "birthDate"}
            direction={sortState.direction}
            onClick={() =>
              setSortState((current) => toggleSort(current, "birthDate"))
            }
            className={tableHeadCellStyles}
          />
          <SortableHeader
            label="DNI"
            active={sortState.key === "dni"}
            direction={sortState.direction}
            onClick={() => setSortState((current) => toggleSort(current, "dni"))}
            className={tableHeadCellStyles}
          />
          <SortableHeader
            label="Teléfono"
            active={sortState.key === "phone"}
            direction={sortState.direction}
            onClick={() =>
              setSortState((current) => toggleSort(current, "phone"))
            }
            className={tableHeadCellStyles}
          />
          <SortableHeader
            label="Correo"
            active={sortState.key === "email"}
            direction={sortState.direction}
            onClick={() =>
              setSortState((current) => toggleSort(current, "email"))
            }
            className={tableHeadCellStyles}
          />
        </tr>
      </thead>

      <tbody className={tableBodyStyles}>
        {sortedContacts.map((contact) => {
          const displayName = getDisplayName(contact);
          const fallbackParts = displayName.split(" ").filter(Boolean);
          const firstName =
            contact.firstName?.trim() || fallbackParts[0] || "Sin nombre";
          const lastName =
            contact.lastName?.trim() || fallbackParts.slice(1).join(" ") || "-";
          const phone =
            contact.phone?.trim() || contact.secondaryPhone?.trim() || "-";
          const email = contact.email?.trim() || "-";

          return (
            <tr
              key={contact.id}
              onClick={() => onSelect(contact)}
              className={`cursor-pointer transition ${tableRowStyles} ${
                contact.id === selectedId ? "bg-primary/5" : ""
              }`}
            >
              <td className="px-6 py-4">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {contact.photoUrl ? (
                    <img
                      src={contact.photoUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(contact)
                  )}
                </div>
              </td>
              <td className="px-6 py-4 font-semibold text-gray-900">
                {firstName}
              </td>
              <td className="px-6 py-4 text-gray-700">{lastName}</td>
              <td className="px-6 py-4 text-gray-600">
                {formatBirthDate(contact, formatLocale)}
              </td>
              <td className="px-6 py-4 text-gray-600">{contact.dni || "-"}</td>
              <td className="px-6 py-4 text-gray-600">{phone}</td>
              <td className="px-6 py-4 text-gray-600">{email}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
