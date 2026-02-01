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
  const isEditing = Boolean(initialData);

  const [fullName, setFullName] = useState(
    initialData?.fullName ?? ""
  );
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
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-4xl mx-auto overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50 px-6 py-5">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {isEditing ? "Editar contacto" : "Nuevo contacto"}
          </h2>
          <p className="text-sm text-gray-500">
            Registra y organiza la información del contacto.
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100"
            aria-label="Cerrar"
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
              <path d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Body */}
      <div className="space-y-3 bg-white px-6 py-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">
              Nombre completo
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Teléfono
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              placeholder="+34 600 000 000"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            Tipo de contacto
          </label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {CONTACT_TYPE_ORDER.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  types.includes(type)
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {ContactTypeLabels[type]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            Notas
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            rows={3}
            placeholder="Añade información relevante sobre este contacto..."
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-6 py-2 text-sm font-medium text-gray-600 transition hover:bg-white"
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
        >
          {isEditing ? "Guardar cambios" : "Guardar contacto"}
        </button>
      </div>
    </form>
  );
}
