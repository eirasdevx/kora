"use client";

import { useState } from "react";
import {
  Contact,
  ContactType,
  ContactTypeLabels,
} from "./contact.types";

interface Props {
  initialData?: Contact;
  onSubmit: (contact: Contact) => Promise<void>;
  onCancel?: () => void;
}

const CONTACT_TYPE_ORDER: ContactType[] = [
  "member",
  "provider",
  "collaborator",
  "other",
];

export default function ContactForm({
  initialData,
  onSubmit,
  onCancel,
}: Props) {
  const [fullName, setFullName] = useState(initialData?.fullName ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [types, setTypes] = useState<ContactType[]>(
    initialData?.types ?? []
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const toggleType = (type: ContactType) => {
    setTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const contact: Contact = {
      id: initialData?.id ?? crypto.randomUUID(),
      fullName,
      email: email || undefined,
      phone: phone || undefined,
      types,
      notes,
      createdAt: initialData?.createdAt ?? new Date().toISOString(),
    };

    await onSubmit(contact);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nombre */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Nombre completo *
        </label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
          required
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
        />
      </div>

      {/* Teléfono */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Teléfono
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
        />
      </div>

      {/* Tipos */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Tipo de contacto
        </label>
        <div className="flex flex-wrap gap-2">
          {CONTACT_TYPE_ORDER.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border
                ${
                  types.includes(type)
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
            >
              {ContactTypeLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Notas
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
          rows={3}
        />
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 rounded-lg border text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          className="bg-primary text-white px-6 py-2 rounded-lg font-bold"
        >
          Guardar contacto
        </button>
      </div>
    </form>
  );
}
