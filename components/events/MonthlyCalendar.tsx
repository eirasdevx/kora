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
    <div className="bg-white border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold capitalize">
          {monthLabel}
        </h2>

        <div className="flex gap-2">
          <button
            onClick={onPrevMonth}
            className="px-2 py-1 border rounded hover:bg-gray-50"
          >
            ←
          </button>
          <button
            onClick={onNextMonth}
            className="px-2 py-1 border rounded hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>

      {/* Días */}
      <div className="grid grid-cols-7 text-sm font-medium text-gray-500 mb-2">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded overflow-hidden">
        {days.map((day, idx) => {
          const isToday =
            day &&
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;

          return (
            <div
              key={idx}
              className={`h-28 bg-white p-2 text-sm
                ${isToday ? "ring-2 ring-primary ring-inset" : ""}
              `}
            >
              {day && (
                <>
                  <div className="font-medium mb-1">{day}</div>
                  <div className="space-y-1">
                    {(eventsByDay[day] ?? []).map((e) => (
                      <button
                        key={e.id}
                        onClick={() => onSelectEvent(e)}
                        className={`block w-full text-left text-xs rounded px-2 py-1 truncate
                          ${
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
