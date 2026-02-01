"use client";

import {
  Contact,
  ContactType,
  ContactTypeLabels,
} from "@/modules/contacts/contact.types";

interface Props {
  contacts: Contact[];
  selectedId?: string;
  onSelect: (contact: Contact) => void;
}

// ORDEN VISUAL CANÓNICO (regla de negocio)
const CONTACT_TYPE_ORDER: ContactType[] = [
  "member",
  "provider",
  "collaborator",
];

const TYPE_BADGE_STYLES: Record<ContactType, string> = {
  member: "bg-blue-50 text-blue-700",
  provider: "bg-amber-50 text-amber-700",
  collaborator: "bg-purple-50 text-purple-700",
};

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

export default function ContactsTable({
  contacts,
  selectedId,
  onSelect,
}: Props) {
  if (contacts.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500">
        No hay contactos
      </div>
    );
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
        <tr>
          <th className="px-6 py-4">Contacto</th>
          <th className="px-6 py-4">Tipo</th>
          <th className="px-6 py-4">Teléfono</th>
        </tr>
      </thead>

      <tbody className="text-gray-700">
        {contacts.map((c) => {
          const orderedTypes = CONTACT_TYPE_ORDER.filter((t) =>
            c.types.includes(t)
          );
          const displayName = getDisplayName(c);

          return (
            <tr
              key={c.id}
              onClick={() => onSelect(c)}
              className={`cursor-pointer border-b border-gray-100 transition last:border-0 ${
                c.id === selectedId
                  ? "bg-primary/5"
                  : "hover:bg-gray-50"
              }`}
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(c)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {displayName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {c.email || "—"}
                    </div>
                  </div>
                </div>
              </td>

              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  {orderedTypes.length === 0 && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">
                      Sin tipo
                    </span>
                  )}
                  {orderedTypes.map((t) => (
                    <span
                      key={t}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_BADGE_STYLES[t]}`}
                    >
                      {ContactTypeLabels[t]}
                    </span>
                  ))}
                </div>
              </td>

              <td className="px-6 py-4 text-sm text-gray-600">
                {c.phone || "—"}
              </td>

            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
