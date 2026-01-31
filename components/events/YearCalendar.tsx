"use client";

import { Event } from "@/modules/events/event.types";

interface Props {
  year: number;
  events: Event[];
  onSelectEvent: (event: Event) => void;
}

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

export default function YearCalendar({
  year,
  events,
  onSelectEvent,
}: Props) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {MONTHS.map((label, month) => {
        const monthEvents = events.filter((e) => {
          const d = new Date(e.startDate);
          return d.getFullYear() === year && d.getMonth() === month;
        });

        const isCurrent =
          year === currentYear && month === currentMonth;

        return (
          <div
            key={month}
            className={`border rounded-xl p-4 bg-white
              ${isCurrent ? "ring-2 ring-primary" : ""}
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">{label}</h3>
              <span className="text-xs text-gray-500">
                {monthEvents.length} evento
                {monthEvents.length !== 1 && "s"}
              </span>
            </div>

            {monthEvents.length === 0 ? (
              <p className="text-sm text-gray-500">
                Sin eventos
              </p>
            ) : (
              <ul className="space-y-1">
                {monthEvents.map((e) => (
                  <li key={e.id}>
                    <button
                      onClick={() => onSelectEvent(e)}
                      className="text-sm text-primary hover:underline"
                    >
                      {new Date(e.startDate).getDate()} ·{" "}
                      {e.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
