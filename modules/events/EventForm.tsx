"use client";

import { useState } from "react";
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
  const { contacts } = useContactsStore();

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
      className="bg-white border rounded-xl p-6 space-y-6"
    >
      <h2 className="text-xl font-bold">
        {initialData ? "Editar evento" : "Nuevo evento"}
      </h2>

      <div>
        <label className="block text-sm font-medium mb-1">
          Título *
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Descripción
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Fecha y hora *
        </label>
        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border rounded-lg px-4 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Participantes
        </label>

        <div className="border rounded-lg max-h-48 overflow-y-auto">
          {contacts.length === 0 ? (
            <p className="p-3 text-sm text-gray-500">
              No hay contactos disponibles
            </p>
          ) : (
            contacts.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={participantIds.includes(c.id)}
                  onChange={() => toggleParticipant(c)}
                />
                <span>{c.fullName}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="bg-primary text-white px-6 py-2 rounded-lg font-bold"
        >
          Guardar evento
        </button>
      </div>
    </form>
  );
}
