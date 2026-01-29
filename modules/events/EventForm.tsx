"use client";

import { useState } from "react";
import { Event } from "./event.types";

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
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );

  // Fecha y hora separadas (UX clara)
  const [date, setDate] = useState(
    initialData ? initialData.startDate.slice(0, 10) : ""
  );

  const [time, setTime] = useState(
    initialData ? initialData.startDate.slice(11, 16) : "12:00"
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) return;

    const startDateIso = new Date(
      `${date}T${time}`
    ).toISOString();

    const event: Event = {
      id: initialData?.id ?? crypto.randomUUID(),
      title,
      description: description || undefined,
      startDate: startDateIso,
      endDate: initialData?.endDate,
      location: initialData?.location,
      participantIds: initialData?.participantIds ?? [],
      organizerIds: initialData?.organizerIds ?? [],
      createdAt:
        initialData?.createdAt ?? new Date().toISOString(),
    };

    onSubmit(event);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl p-6 space-y-6"
    >
      <h2 className="text-xl font-bold">
        {initialData ? "Editar evento" : "Nuevo evento"}
      </h2>

      {/* Título */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Título *
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
          placeholder="Nombre del evento"
          required
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Descripción
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
          rows={3}
          placeholder="Información adicional del evento"
        />
      </div>

      {/* Fecha y hora */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Fecha *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Hora *
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
            required
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
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
