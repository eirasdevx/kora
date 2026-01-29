"use client";

import { useState } from "react";
import { Event } from "@/modules/events/event.types";
import { useEventsStore } from "@/modules/events/events.store";

interface Props {
  event: Event;
  onClose: () => void;
  onEdit: (event: Event) => void;
}

export default function EventDetailsPanel({
  event,
  onClose,
  onEdit,
}: Props) {
  const deleteEvent = useEventsStore((s) => s.deleteEvent);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const start = new Date(event.startDate);

  return (
    <aside className="w-96 border-l bg-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{event.title}</h2>
          <p className="text-sm text-gray-500">
            {start.toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            ·{" "}
            {start.toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* Descripción */}
      {event.description && (
        <div>
          <h3 className="text-sm font-semibold mb-1">Descripción</h3>
          <p className="text-sm text-gray-700">
            {event.description}
          </p>
        </div>
      )}

      {/* Acciones */}
      <div className="pt-4 border-t space-y-2">
        <button
          onClick={() => onEdit(event)}
          className="w-full border rounded-lg px-4 py-2 font-medium hover:bg-gray-50"
        >
          Editar evento
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full border border-red-300 text-red-600 rounded-lg px-4 py-2 font-medium hover:bg-red-50"
          >
            Eliminar evento
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-red-600 font-medium">
              ¿Seguro? Esta acción no se puede deshacer.
            </p>
            <button
              onClick={() => {
                deleteEvent(event.id);
                onClose();
              }}
              className="w-full bg-red-600 text-white rounded-lg px-4 py-2 font-bold"
            >
              Sí, eliminar definitivamente
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="w-full border rounded-lg px-4 py-2"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
