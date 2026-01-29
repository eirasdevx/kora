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
  "other",
];

export default function ContactsTable({
  contacts,
  selectedId,
  onSelect,
}: Props) {
  if (contacts.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-6 text-gray-500">
        No hay contactos
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="p-4">Contacto</th>
            <th className="p-4">Tipo</th>
            <th className="p-4">Email</th>
          </tr>
        </thead>

        <tbody>
          {contacts.map((c) => {
            // 🔑 ORDENAMOS SOLO PARA MOSTRAR
            const orderedTypes = CONTACT_TYPE_ORDER.filter((t) =>
              c.types.includes(t)
            );

            return (
              <tr
                key={c.id}
                onClick={() => onSelect(c)}
                className={`cursor-pointer border-b last:border-0
                  ${
                    c.id === selectedId
                      ? "bg-primary/5"
                      : "hover:bg-gray-50"
                  }`}
              >
                <td className="p-4 font-medium">{c.fullName}</td>

                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {orderedTypes.map((t) => (
                      <span
                        key={t}
                        className="inline-block text-xs bg-gray-100 px-2 py-1 rounded mr-1"
                      >
                        {ContactTypeLabels[t]}
                      </span>
                    ))}
                  </div>
                </td>

                <td className="p-4 text-gray-600">
                  {c.email || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
