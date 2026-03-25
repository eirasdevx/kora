"use client";

import { useLocale } from "@/core/i18n/use-locale";
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
  const { formatLocale } = useLocale();
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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {weekStart.toLocaleDateString(formatLocale)} –{" "}
          {weekEnd.toLocaleDateString(formatLocale)}
        </h2>

        <div className="flex gap-2">
          <button
            onClick={onPrevWeek}
            aria-label="Semana anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50"
          >
            <span className="material-symbols-outlined text-[18px] leading-none">
              chevron_left
            </span>
          </button>
          <button
            onClick={onNextWeek}
            aria-label="Semana siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50"
          >
            <span className="material-symbols-outlined text-[18px] leading-none">
              chevron_right
            </span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map((day, idx) => {
          const isToday = isSameDay(day, today);

          return (
            <div
              key={idx}
              className={`rounded-xl border border-gray-200 p-2 ${
                isToday ? "bg-primary/5 border-primary" : ""
              }`}
            >
              <div className="text-sm font-semibold text-gray-700 mb-2">
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
