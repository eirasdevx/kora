"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import EventsTopbar, { EventsView } from "@/components/topbars/EventsTopbar";
import MonthlyCalendar from "@/components/events/MonthlyCalendar";
import WeeklyCalendar from "@/components/events/WeeklyCalendar";
import DayAgenda from "@/components/events/DayAgenda";
import EventDetailsPanel from "@/components/events/EventDetailsPanel";
import PageTopbar from "@/components/PageTopbar";

import { Event } from "@/modules/events/event.types";
import { useEventsStore } from "@/modules/events/events.store";

/* =======================
   Helpers de fechas
======================= */

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/* =======================
   Página
======================= */

export default function EventsPage() {
  /* -------- stores -------- */
  const { events, loadEvents } = useEventsStore();

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  /* -------- vista -------- */
  const [view, setView] = useState<EventsView>("month");
  const [search, setSearch] = useState("");

  /* -------- selección -------- */
  const [selectedEventId, setSelectedEventId] =
    useState<string | null>(null);

  const selectedEvent = useMemo<Event | null>(() => {
    if (!selectedEventId) return null;
    return (
      events.find((e) => e.id === selectedEventId) ?? null
    );
  }, [events, selectedEventId]);

  const router = useRouter();

  /* -------- fechas -------- */
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [weekStart, setWeekStart] = useState(() =>
    getMonday(new Date())
  );
  const [dayDate] = useState(() => new Date());

  /* -------- filtros -------- */
  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) =>
      e.title.toLowerCase().includes(q)
    );
  }, [events, search]);

  /* =======================
     Render
  ======================= */

  return (
    <div className="flex gap-6">
      {/* Columna principal */}
      <div className="flex-1 space-y-6">
        <PageTopbar>
          <EventsTopbar
            view={view}
            onChangeView={setView}
            onSearch={setSearch}
            onCreate={() => {
              router.push("/events/new");
            }}
          />
        </PageTopbar>

        {/* MES */}
        {view === "month" && (
          <MonthlyCalendar
            year={monthDate.year}
            month={monthDate.month}
            events={filteredEvents}
            selectedEventId={selectedEventId ?? undefined}
            onSelectEvent={(e) => setSelectedEventId(e.id)}
            onPrevMonth={() =>
              setMonthDate((d) =>
                d.month === 0
                  ? { year: d.year - 1, month: 11 }
                  : { ...d, month: d.month - 1 }
              )
            }
            onNextMonth={() =>
              setMonthDate((d) =>
                d.month === 11
                  ? { year: d.year + 1, month: 0 }
                  : { ...d, month: d.month + 1 }
              )
            }
          />
        )}

        {/* SEMANA */}
        {view === "week" && (
          <WeeklyCalendar
            weekStart={weekStart}
            events={filteredEvents}
            selectedEventId={selectedEventId ?? undefined}
            onSelectEvent={(e) => setSelectedEventId(e.id)}
            onPrevWeek={() =>
              setWeekStart((d) => addDays(d, -7))
            }
            onNextWeek={() =>
              setWeekStart((d) => addDays(d, 7))
            }
          />
        )}

        {/* DÍA */}
        {view === "day" && (
          <DayAgenda
            date={dayDate}
            events={filteredEvents}
            onSelectEvent={(e) => setSelectedEventId(e.id)}
          />
        )}
      </div>

      {/* Panel derecho */}
      {selectedEvent && (
        <EventDetailsPanel
          key={selectedEvent.id}
          event={selectedEvent}
          onClose={() => setSelectedEventId(null)}
          onEdit={(e) => {
            router.push(`/events/${e.id}/edit`);
          }}
        />
      )}
    </div>
  );
}
