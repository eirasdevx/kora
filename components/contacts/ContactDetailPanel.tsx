"use client";

import { Contact, ContactTypeLabels } from "@/modules/contacts/contact.types";

interface Props {
  contact: Contact | null;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}

export default function ContactDetailPanel({
  contact,
  onEdit,
  onDelete,
}: Props) {
  if (!contact) {
    return (
      <div className="bg-white rounded-xl border p-6 h-full flex items-center justify-center text-gray-500">
        Selecciona un contacto
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-6 h-full flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold">{contact.fullName}</h2>
        <div className="flex gap-2 mt-2 flex-wrap">
          {contact.types.map((t) => (
            <span
              key={t}
              className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
            >
              {ContactTypeLabels[t]}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <p className="text-gray-500">Email</p>
          <p>{contact.email || "—"}</p>
        </div>
        <div>
          <p className="text-gray-500">Teléfono</p>
          <p>{contact.phone || "—"}</p>
        </div>
        <div>
          <p className="text-gray-500">Fecha de alta</p>
          <p>
            {new Date(contact.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-auto flex gap-2">
        <button
          onClick={() => onEdit(contact)}
          className="flex-1 px-4 py-2 rounded-lg border hover:bg-gray-50"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(contact)}
          className="flex-1 px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
