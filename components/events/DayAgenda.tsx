"use client";

import { useLocale } from "@/core/i18n/use-locale";
import { Event } from "@/modules/events/event.types";

interface Props {
  date: Date;
  events: Event[];
  onSelectEvent: (event: Event) => void;
}

export default function DayAgenda({
  date,
  events,
  onSelectEvent,
}: Props) {
  const { formatLocale } = useLocale();
  const dayLabel = date.toLocaleDateString(formatLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const dayEvents = events.filter((e) => {
    const d = new Date(e.startDate);
    return (
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize text-gray-900">
          {dayLabel}
        </h2>
        <span className="text-sm text-gray-500">
          {dayEvents.length} eventos programados
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {dayEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
            No hay eventos para este día.
          </div>
        ) : (
          dayEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onSelectEvent(event)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:bg-gray-50"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {event.title}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(event.startDate).toLocaleTimeString(
                    formatLocale,
                    { hour: "2-digit", minute: "2-digit" }
                  )}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Ver detalles
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
