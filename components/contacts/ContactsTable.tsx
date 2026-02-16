"use client";

import {
  Contact,
  ContactType,
  ContactTypeLabels,
  ContactKindLabels,
} from "@/modules/contacts/contact.types";

interface Props {
  contacts: Contact[];
  selectedId?: string;
  onSelect: (contact: Contact) => void;
}

// ORDEN VISUAL CANONICO (regla de negocio)
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

function getTypesLabel(types: ContactType[]) {
  if (!types.length) return "Sin tipo";
  const ordered = CONTACT_TYPE_ORDER.filter((t) => types.includes(t));
  return ordered.map((t) => ContactTypeLabels[t]).join(", ");
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
    <table className="min-w-[1400px] w-full text-left text-sm">
      <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
        <tr>
          <th className="px-6 py-4">Perfil del contacto</th>
          <th className="px-6 py-4">Todos los datos de los contactos</th>
          <th className="px-6 py-4">Información de contacto</th>
          <th className="px-6 py-4">Notas</th>
        </tr>
      </thead>

      <tbody className="text-gray-700">
        {contacts.map((c) => {
          const orderedTypes = CONTACT_TYPE_ORDER.filter((t) =>
            c.types.includes(t)
          );
          const displayName = getDisplayName(c);
          const addressLine = [
            c.address,
            c.postalCode,
            c.city,
            c.region,
          ]
            .filter(Boolean)
            .join(", ");
          const representativeName = `${c.representativeFirstName ?? ""} ${
            c.representativeLastName ?? ""
          }`.trim();
          const typesLabel = getTypesLabel(c.types);

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
              <td className="px-6 py-4 align-top">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(c)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {displayName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {ContactKindLabels[c.kind]}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
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

              <td className="px-6 py-4 align-top text-sm text-gray-600">
                <div className="space-y-1">
                  <p>
                    <span className="text-gray-400">DNI:</span>{" "}
                    {c.dni || "?"}
                  </p>
                  <p>
                    <span className="text-gray-400">Tipo:</span>{" "}
                    {ContactKindLabels[c.kind]}
                  </p>
                  <p>
                    <span className="text-gray-400">Roles:</span>{" "}
                    {typesLabel}
                  </p>
                  <p>
                    <span className="text-gray-400">Dirección:</span>{" "}
                    {addressLine || "?"}
                  </p>
                  {c.kind === "entity" && (
                    <p>
                      <span className="text-gray-400">Representante:</span>{" "}
                      {representativeName || "?"}
                    </p>
                  )}
                  {c.tags && c.tags.length > 0 && (
                    <p>
                      <span className="text-gray-400">Tags:</span>{" "}
                      {c.tags.join(", ")}
                    </p>
                  )}
                </div>
              </td>

              <td className="px-6 py-4 align-top text-sm text-gray-600">
                <div className="space-y-1">
                  <p>
                    <span className="text-gray-400">Email:</span>{" "}
                    {c.email || "?"}
                  </p>
                  <p>
                    <span className="text-gray-400">Tel:</span>{" "}
                    {c.phone || "?"}
                  </p>
                  <p>
                    <span className="text-gray-400">Tel 2:</span>{" "}
                    {c.secondaryPhone || "?"}
                  </p>
                  <p>
                    <span className="text-gray-400">Web:</span>{" "}
                    {c.website || "?"}
                  </p>
                  <p>
                    <span className="text-gray-400">Redes:</span>{" "}
                    {c.socialLinks || "?"}
                  </p>
                </div>
              </td>

              <td className="px-6 py-4 align-top text-sm text-gray-600">
                {c.notes || "?"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
