"use client";

import { useState } from "react";
import { Event } from "@/modules/events/event.types";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useEventsStore } from "@/modules/events/events.store";
import { ContactTypeLabels } from "@/modules/contacts/contact.types";

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
  const contacts = useContactsStore((s) => s.contacts);
  const addOrUpdateEvent = useEventsStore((s) => s.addOrUpdateEvent);
  const deleteEvent = useEventsStore((s) => s.deleteEvent);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const start = new Date(event.startDate);

  const toggleParticipant = (contactId: string) => {
    const updated: Event = {
      ...event,
      participantIds: event.participantIds.includes(contactId)
        ? event.participantIds.filter((id) => id !== contactId)
        : [...event.participantIds, contactId],
    };
    addOrUpdateEvent(updated);
  };

  return (
    <aside className="w-96 border-l bg-white flex flex-col h-[calc(100vh-64px)] sticky top-6">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
            <h3 className="text-sm font-semibold mb-1">
              Descripción
            </h3>
            <p className="text-sm text-gray-700">
              {event.description}
            </p>
          </div>
        )}

        {/* Ubicación */}
        {event.location && (
          <div>
            <h3 className="text-sm font-semibold mb-1">
              Ubicación
            </h3>
            <p className="text-sm text-gray-700">
              {event.location}
            </p>
          </div>
        )}

        {/* Participantes */}
        <div>
          <h3 className="text-sm font-semibold mb-2">
            Asistentes ({event.participantIds.length})
          </h3>

          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {contacts.map((c) => {
              const active = event.participantIds.includes(c.id);

              return (
                <label
                  key={c.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleParticipant(c.id)}
                  />
                  <span className="flex-1">{c.fullName}</span>
                  <span className="text-xs text-gray-500">
                    {c.types.map((t) => ContactTypeLabels[t]).join(", ")}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

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
      </div>
    </aside>
  );
}
