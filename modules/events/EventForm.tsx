"use client";

import { useEffect, useState } from "react";
import { Event } from "./event.types";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { Contact } from "@/modules/contacts/contact.types";

interface Props {
  initialData?: Event;
  onSubmit: (event: Event) => void;
  onCancel: () => void;
}

export default function EventForm({
  initialData,
  onSubmit,
  onCancel,
}: Props) {
  const isEditing = Boolean(initialData);
  const { contacts, loadContacts } = useContactsStore();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [startDate, setStartDate] = useState(
    initialData ? initialData.startDate.slice(0, 16) : ""
  );
  const [participantIds, setParticipantIds] = useState<string[]>(
    initialData?.participantIds ?? []
  );

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const toggleParticipant = (contact: Contact) => {
    setParticipantIds((prev) =>
      prev.includes(contact.id)
        ? prev.filter((id) => id !== contact.id)
        : [...prev, contact.id]
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !startDate) return;

    const event: Event = {
      id: initialData?.id ?? crypto.randomUUID(),
      title,
      description: description || undefined,
      startDate: new Date(startDate).toISOString(),
      endDate: initialData?.endDate,
      location: initialData?.location,
      participantIds,
      organizerIds: initialData?.organizerIds ?? [],
      createdAt:
        initialData?.createdAt ?? new Date().toISOString(),
    };

    onSubmit(event);
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
            {isEditing ? "Editar evento" : "Nuevo evento"}
          </h2>
          <p className="text-sm text-gray-500">
            Planifica los detalles principales del evento.
          </p>
        </div>
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
      </div>

      {/* Body */}
      <div className="space-y-3 bg-white px-6 py-5">
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
            Información básica
          </p>
          <div className="mt-2.5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">
                Título del evento
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                placeholder="Ej. Asamblea General Ordinaria"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                rows={3}
                placeholder="Cuéntales a los miembros de qué trata el evento..."
              />
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
            Fecha y hora
          </p>
          <div className="mt-2.5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Fecha y hora del evento
              </label>
              <div className="relative mt-1.5">
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  required
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="17" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
            Participantes
          </p>
          <div className="mt-2.5 rounded-xl border border-gray-200">
            {contacts.length === 0 ? (
              <p className="px-4 py-2 text-sm text-gray-500">
                No hay contactos disponibles todavía.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-1 p-2 sm:grid-cols-2">
                {contacts.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={participantIds.includes(c.id)}
                      onChange={() => toggleParticipant(c)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
                    />
                    <span>{c.fullName}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-6 py-2 text-sm font-medium text-gray-600 transition hover:bg-white"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
        >
          {isEditing ? "Guardar cambios" : "Guardar evento"}
        </button>
      </div>
    </form>
  );
}
