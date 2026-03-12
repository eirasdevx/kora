"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { EventsView } from "@/components/topbars/EventsTopbar";
import MonthlyCalendar from "@/components/events/MonthlyCalendar";
import WeeklyCalendar from "@/components/events/WeeklyCalendar";
import DayAgenda from "@/components/events/DayAgenda";
import EventDetailsPanel from "@/components/events/EventDetailsPanel";
import ModuleTopbar, {
  moduleTopbarButtonStyles,
} from "@/components/shared/ModuleTopbar";

import { useLocale } from "@/core/i18n/use-locale";
import { Event } from "@/modules/events/event.types";
import { useEventsStore } from "@/modules/events/events.store";
import { downloadPdf, downloadXlsx } from "@/lib/exporters";

const EVENTS_MODULE_TITLE = "Eventos";
const EVENTS_PAGE_TITLE = "Agenda de eventos";
const EVENTS_MODULE_DESCRIPTION =
  "Calendario, inscripciones y seguimiento de actividades.";

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

function toStartOfDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toEndOfDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  date.setHours(23, 59, 59, 999);
  return date;
}

function matchesDateRange(
  iso: string | undefined,
  from: string,
  to: string
) {
  if (!from && !to) return true;
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  if (from) {
    const start = toStartOfDay(from);
    if (date < start) return false;
  }
  if (to) {
    const end = toEndOfDay(to);
    if (date > end) return false;
  }
  return true;
}

function formatDate(value: string | undefined, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string | undefined, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPrice(value: number | undefined, locale: string) {
  if (value === null || value === undefined) return "-";
  if (value === 0) return "Gratis";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(value);
}
function formatYesNo(value?: boolean) {
  if (value === undefined) return "-";
  return value ? "Si" : "No";
}

function buildEventExportData(event: Event, locale: string) {
  const meetingType =
    event.locationType === "online" ? "En linea" : "Presencial";
  const location =
    event.locationType === "online"
      ? "En linea"
      : event.location || "-";

  return {
    title: event.title,
    category: event.category ?? "-",
    description: event.description ?? "-",
    status: event.status ?? "-",
    startDate: formatDate(event.startDate, locale),
    startTime: formatTime(event.startDate, locale),
    endDate: formatDate(event.endDate, locale),
    endTime: formatTime(event.endDate, locale),
    meetingType,
    location,
    price: formatPrice(event.ticketPrice, locale),
    capacity: event.capacity?.toString() ?? "-",
    registrationDeadline: formatDate(event.registrationDeadline, locale),
    waitlist: formatYesNo(event.waitlistEnabled),
    participants:
      event.participantIds && event.participantIds.length > 0
        ? event.participantIds.join(", ")
        : "-",
    organizers:
      event.organizerIds && event.organizerIds.length > 0
        ? event.organizerIds.join(", ")
        : "-",
    createdAt: formatDate(event.createdAt, locale),
  };
}

/* =======================
   Página
======================= */

export default function EventsPage() {
  const { formatLocale } = useLocale();
  /* -------- stores -------- */
  const { events, loadEvents } = useEventsStore();

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  /* -------- vista -------- */
  const [view, setView] = useState<EventsView>("month");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const VIEW_OPTIONS: { label: string; value: EventsView }[] = [
    { label: "Mes", value: "month" },
    { label: "Semana", value: "week" },
    { label: "Día", value: "day" },
  ];

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
  const categoryOptions = useMemo(() => {
    const unique = new Set<string>();
    events.forEach((event) => {
      if (event.category) unique.add(event.category);
    });
    return Array.from(unique);
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (categoryFilter !== "all" && e.category !== categoryFilter) {
        return false;
      }
      if (!matchesDateRange(e.startDate, dateFrom, dateTo)) {
        return false;
      }
      if (!q) return true;
      const title = e.title.toLowerCase();
      const description = e.description?.toLowerCase() ?? "";
      return title.includes(q) || description.includes(q);
    });
  }, [events, search, categoryFilter, dateFrom, dateTo]);

  const exportRowsXlsx = useMemo(
    () =>
      filteredEvents.map((event) => {
        const data = buildEventExportData(event, formatLocale);
        return [
          data.title,
          data.category,
          data.description,
          data.status,
          data.startDate,
          data.startTime,
          data.endDate,
          data.endTime,
          data.meetingType,
          data.location,
          data.price,
          data.capacity,
          data.registrationDeadline,
          data.waitlist,
          data.participants,
          data.organizers,
          data.createdAt,
        ];
      }),
    [filteredEvents]
  );

  const exportRowsPdf = useMemo(
    () =>
      filteredEvents.flatMap((event) => {
        const data = buildEventExportData(event, formatLocale);
          return [
            ["Evento", data.title],
            ["Categoría", data.category],
            ["Descripción", data.description],
            ["Estado", data.status],
            ["Fecha inicio", data.startDate],
            ["Hora inicio", data.startTime],
            ["Fecha fin", data.endDate],
          ["Hora fin", data.endTime],
          ["Tipo de reunion", data.meetingType],
          ["Lugar", data.location],
          ["Precio de entrada", data.price],
          ["Capacidad maxima", data.capacity],
          ["Fecha cierre inscripcion", data.registrationDeadline],
          ["Lista de espera", data.waitlist],
          ["Participantes", data.participants],
          ["Organizadores", data.organizers],
          ["Creado", data.createdAt],
          ["", ""],
        ];
      }),
    [filteredEvents]
  );

  const handleExportXlsx = () => {
    const rows = [
        [
          "Título",
          "Categoría",
          "Descripción",
          "Estado",
          "Fecha inicio",
          "Hora inicio",
          "Fecha fin",
        "Hora fin",
        "Tipo de reunion",
        "Lugar",
        "Precio de entrada",
        "Capacidad maxima",
        "Fecha cierre inscripcion",
        "Lista de espera",
        "Participantes",
        "Organizadores",
        "Creado",
      ],
      ...exportRowsXlsx,
    ];
    downloadXlsx("eventos.xlsx", "Eventos", rows);
  };

  const handleExportPdf = () => {
    const columns = [
      { label: "Campo", width: 20 },
      { label: "Valor", width: 60 },
    ];
    downloadPdf(
      "eventos.pdf",
      "Listado de eventos",
      columns,
      exportRowsPdf
    );
  };

  /* =======================
     Render
  ======================= */

  return (
    <div className="flex gap-6">
      {/* Columna principal */}
      <div className="flex-1 space-y-6">
        <ModuleTopbar
          module={EVENTS_MODULE_TITLE}
          title={EVENTS_PAGE_TITLE}
          description={EVENTS_MODULE_DESCRIPTION}
          actions={
            <Link
              href="/events/new"
              className={`${moduleTopbarButtonStyles.primary} inline-flex items-center gap-2`}
            >
              <span className="material-symbols-outlined text-[18px]">
                add
              </span>
              Crear nuevo evento
            </Link>
          }
        />

        <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
                {VIEW_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setView(opt.value)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      view === opt.value
                        ? "bg-primary text-white shadow"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  tune
                </span>
                Filtros
              </button>

              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                  <span className="material-symbols-outlined text-[16px] leading-none">
                    search
                  </span>
                </span>
                <input
                  type="text"
                  placeholder="Buscar eventos..."
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportXlsx}
                aria-label="Exportar XLSX"
                title="Exportar XLSX"
                className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  grid_on
                </span>
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                aria-label="Exportar PDF"
                title="Exportar PDF"
                className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  picture_as_pdf
                </span>
              </button>
            </div>
          </div>
        </div>


        {filtersOpen && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                  <label className="text-xs font-semibold uppercase text-gray-400">
                    Categoría
                  </label>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                >
                  <option value="all">Todas</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Fecha desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Fecha hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

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





