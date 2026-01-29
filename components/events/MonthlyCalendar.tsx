"use client";

import { useMemo } from "react";
import { Event } from "@/modules/events/event.types";

interface Props {
    year: number;
    month: number;
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
                const day = d.getDate();
                (byDay[day] ??= []).push(e);
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
            <div className="flex justify-between mb-4">
                <h2 className="font-bold capitalize">{monthLabel}</h2>
                <div className="flex gap-2">
                    <button onClick={onPrevMonth} className="border px-2">←</button>
                    <button onClick={onNextMonth} className="border px-2">→</button>
                </div>
            </div>

            <div className="grid grid-cols-7 text-sm text-gray-500 mb-2">
                {WEEK_DAYS.map((d) => (
                    <div key={d} className="text-center">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-gray-200">
                {days.map((day, i) => (
                    <div key={i} className="bg-white h-28 p-2">
                        {day && (
                            <>
                                <div className="text-sm font-medium">{day}</div>
                                {(eventsByDay[day] ?? []).map((e) => (
                                    <button
                                        key={e.id}
                                        onClick={() => onSelectEvent(e)}
                                        className={`block w-full text-left text-xs rounded px-2 py-1 mt-1 truncate
                                        ${e.id === selectedEventId
                                                ? "bg-primary text-white"
                                                : "bg-primary/10 text-primary hover:bg-primary/20"
                                            }`}
                                        title={e.title}
                                    >
                                        {e.title}
                                    </button>

                                ))}
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
