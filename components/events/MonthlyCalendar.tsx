"use client";

import { useMemo } from "react";
import { Event } from "@/modules/events/event.types";

interface Props {
  year: number;
  month: number; // 0-11
  events: Event[];
  selectedEventId?: string;
  onSelectEvent: (event: Event) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function MonthlyCalendar({
  year,
  month,
  events,
  selectedEventId,
  onSelectEvent,
  onPrevMonth,
  onNextMonth,
}: Props) {
  const today = new Date();

  const { days, monthLabel, eventsByDay } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalDays = lastDay.getDate();

    const cells: Array<number | null> = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);

    const byDay: Record<number, Event[]> = {};
    for (const e of events) {
      const d = new Date(e.startDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        (byDay[d.getDate()] ??= []).push(e);
      }
    }

    return {
      days: cells,
      monthLabel: firstDay.toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
      }),
      eventsByDay: byDay,
    };
  }, [year, month, events]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold capitalize text-gray-900">
          {monthLabel}
        </h2>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {Object.values(eventsByDay).reduce(
              (acc, curr) => acc + curr.length,
              0
            )}{" "}
            eventos programados
          </span>
          <div className="flex gap-2">
            <button
              onClick={onPrevMonth}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                chevron_left
              </span>
            </button>
            <button
              onClick={onNextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Días */}
      <div className="mt-4 grid grid-cols-7 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-center py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px rounded-2xl bg-gray-200 overflow-hidden">
        {days.map((day, idx) => {
          const isToday =
            day &&
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;

          return (
            <div
              key={idx}
              className={`h-28 bg-white p-2 text-sm ${
                isToday ? "ring-2 ring-primary ring-inset" : ""
              }`}
            >
              {day && (
                <>
                  <div className="font-semibold text-gray-600 mb-1">
                    {day}
                  </div>
                  <div className="space-y-1">
                    {(eventsByDay[day] ?? []).map((e) => (
                      <button
                        key={e.id}
                        onClick={() => onSelectEvent(e)}
                        className={`block w-full truncate rounded px-2 py-1 text-left text-xs font-semibold ${
                          e.id === selectedEventId
                            ? "bg-primary text-white"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                        }`}
                        title={e.title}
                      >
                        {e.title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
