"use client";

import { Event } from "@/modules/events/event.types";
import { addDays, isSameDay } from "@/utils/date";

interface Props {
  weekStart: Date; // lunes
  events: Event[];
  selectedEventId?: string;
  onSelectEvent: (event: Event) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function WeeklyCalendar({
  weekStart,
  events,
  selectedEventId,
  onSelectEvent,
  onPrevWeek,
  onNextWeek,
}: Props) {
  const today = new Date();

  const days = Array.from({ length: 7 }, (_, i) =>
    addDays(weekStart, i)
  );

  const eventsForDay = (day: Date) =>
    events.filter((e) => {
      const d = new Date(e.startDate);
      return isSameDay(d, day);
    });

  const weekEnd = addDays(weekStart, 6);

  return (
    <div className="bg-white border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold">
          {weekStart.toLocaleDateString("es-ES")} –{" "}
          {weekEnd.toLocaleDateString("es-ES")}
        </h2>

        <div className="flex gap-2">
          <button
            onClick={onPrevWeek}
            className="px-2 py-1 border rounded"
          >
            ←
          </button>
          <button
            onClick={onNextWeek}
            className="px-2 py-1 border rounded"
          >
            →
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => {
          const isToday = isSameDay(day, today);

          return (
            <div
              key={idx}
              className={`border rounded-lg p-2 ${
                isToday ? "bg-primary/5 border-primary" : ""
              }`}
            >
              <div className="text-sm font-medium mb-2">
                {WEEK_DAYS[idx]} {day.getDate()}
              </div>

              <div className="space-y-1">
                {eventsForDay(day).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onSelectEvent(e)}
                    className={`block w-full text-left text-xs rounded px-2 py-1
                      ${
                        e.id === selectedEventId
                          ? "bg-primary text-white"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                  >
                    {e.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
