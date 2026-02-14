"use client";

import { useMemo, useState } from "react";
import { Event } from "@/modules/events/event.types";
import { useEventsStore } from "@/modules/events/events.store";

interface Props {
  event: Event;
  onClose: () => void;
  onEdit: (event: Event) => void;
}

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

export default function EventDetailsPanel({
  event,
  onClose,
  onEdit,
}: Props) {
  const deleteEvent = useEventsStore((s) => s.deleteEvent);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const formatted = useMemo(() => {
    const dateFormatter = new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeFormatter = new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const currencyFormatter = new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    });

    const start = new Date(event.startDate);
    const end = event.endDate ? new Date(event.endDate) : null;

    const dateLabel = isValidDate(start)
      ? dateFormatter.format(start)
      : "Fecha no definida";
    const startTimeLabel = isValidDate(start)
      ? timeFormatter.format(start)
      : "--:--";
    const endTimeLabel =
      end && isValidDate(end) ? timeFormatter.format(end) : "--:--";

    const priceLabel =
      event.ticketPrice == null || event.ticketPrice === 0
        ? "Gratis"
        : currencyFormatter.format(event.ticketPrice);
    const capacityLabel =
      event.capacity == null
        ? "Sin límite"
        : `${event.capacity} personas`;

    const deadlineDate = event.registrationDeadline
      ? new Date(event.registrationDeadline)
      : null;
    const deadlineLabel =
      deadlineDate && isValidDate(deadlineDate)
        ? dateFormatter.format(deadlineDate)
        : "No definido";

    return {
      dateLabel,
      startTimeLabel,
      endTimeLabel,
      priceLabel,
      capacityLabel,
      deadlineLabel,
    };
  }, [event]);

  const categoryLabel = event.category?.trim() || "Sin categoría";
  const locationLabel = event.location?.trim() || "Sin ubicación";
  const locationTypeLabel =
    event.locationType === "online"
      ? "En línea"
      : event.locationType === "onsite"
        ? "Presencial"
        : "Sin definir";

  return (
    <aside className="w-[360px] flex-shrink-0">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            {categoryLabel}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
              aria-label="Cerrar"
            >
              X
            </button>
          </div>
        </div>

        <h2 className="mt-4 text-2xl font-semibold text-gray-900">
          {event.title}
        </h2>

        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">
              calendar_month
            </span>
            {formatted.dateLabel}
          </span>
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">
              schedule
            </span>
            {formatted.startTimeLabel} - {formatted.endTimeLabel}
          </span>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
            Descripción
          </p>
          <p className="mt-2 text-sm text-gray-700">
            {event.description || "Sin descripción."}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
              Entradas y aforo
            </p>
            <div className="mt-3 grid gap-3 text-sm text-gray-600">
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2">
                <span className="font-semibold text-gray-700">Precio</span>
                <span>{formatted.priceLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2">
                <span className="font-semibold text-gray-700">Capacidad</span>
                <span>{formatted.capacityLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2">
                <span className="font-semibold text-gray-700">
                  Cierre de inscripciones
                </span>
                <span>{formatted.deadlineLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2">
                <span className="font-semibold text-gray-700">Lista espera</span>
                <span>
                  {event.waitlistEnabled ? "Activa" : "Desactivada"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
              Logística
            </p>
            <div className="mt-3 grid gap-3 text-sm text-gray-600">
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2">
                <span className="font-semibold text-gray-700">
                  Fecha del evento
                </span>
                <span>{formatted.dateLabel}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2">
                  <span className="font-semibold text-gray-700">Inicio</span>
                  <span>{formatted.startTimeLabel}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2">
                  <span className="font-semibold text-gray-700">Fin</span>
                  <span>{formatted.endTimeLabel}</span>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2">
                <span className="font-semibold text-gray-700">
                  Ubicación
                </span>
                <span className="text-right">{locationLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3 py-2">
                <span className="font-semibold text-gray-700">Modalidad</span>
                <span>{locationTypeLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => onEdit(event)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Editar
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            Eliminar
          </button>
        </div>

        {confirmDelete && (
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
            <p className="font-semibold">
              ¿Seguro? Esta acción no se puede deshacer.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  await deleteEvent(event.id);
                  onClose();
                }}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white"
              >
                Eliminar definitivamente
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
