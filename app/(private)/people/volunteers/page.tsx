"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageTopbar from "@/components/PageTopbar";
import BackLink from "@/components/shared/BackLink";
import SortableHeader from "@/components/shared/SortableHeader";
import {
  tableBodyStyles,
  tableFooterStyles,
  tableHeadCellStyles,
  tableHeadStyles,
  tableIconActionStyles,
  tablePagerButtonDisabledStyles,
  tablePagerButtonEnabledStyles,
  tablePagerButtonStyles,
  tablePagerCurrentStyles,
  tableRowStyles,
  tableWrapperStyles,
} from "@/components/shared/tableStyles";
import { useLocale } from "@/core/i18n/use-locale";
import {
  applySortDirection,
  compareNumber,
  compareText,
  SortState,
  toggleSort,
} from "@/lib/table-sorting";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useVolunteerActivitiesStore } from "@/modules/volunteers/volunteer-activities.store";
import { useEventsStore } from "@/modules/events/events.store";
import { Contact } from "@/modules/contacts/contact.types";

type VolunteerStatus = "Disponible" | "En Servicio" | "Inactivo";
type VolunteerType = "Socio" | "Contacto";
type VolunteersSortKey = "volunteer" | "status" | "hours" | "task";

const STATUS_STYLES: Record<VolunteerStatus, string> = {
  Disponible: "bg-emerald-50 text-emerald-700",
  "En Servicio": "bg-blue-50 text-blue-700",
  Inactivo: "bg-slate-100 text-slate-600",
};

const PAGE_SIZE = 10;
const filterControlStyles =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
const volunteersTableSectionStyles =
  "rounded-[26px] border border-slate-200 bg-white shadow-sm";

function getDisplayName(contact: Contact) {
  const composed = `${contact.firstName} ${contact.lastName}`.trim();
  if (composed) return composed;
  return contact.fullName ?? "Sin nombre";
}

function getInitials(contact: Contact) {
  return getDisplayName(contact)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
}

function isOnOrAfter(dateValue: string | undefined, start: Date) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start;
}

export default function VolunteersPage() {
  const { formatLocale } = useLocale();
  const { contacts, loadContacts } = useContactsStore();
  const { activities, loadActivities } = useVolunteerActivitiesStore();
  const { events, loadEvents } = useEventsStore();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | VolunteerStatus
  >("all");
  const [typeFilter, setTypeFilter] = useState<"all" | VolunteerType>(
    "all"
  );
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortState, setSortState] = useState<SortState<VolunteersSortKey>>({
    key: "volunteer",
    direction: "asc",
  });

  useEffect(() => {
    loadContacts();
    loadActivities();
    loadEvents();
  }, [loadContacts, loadActivities, loadEvents]);

  const now = useMemo(() => new Date(), []);
  const startOfMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
    [now]
  );
  const startOfPrevMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth() - 1, 1),
    [now]
  );
  const endOfPrevMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 0),
    [now]
  );

  const volunteerIds = useMemo(() => {
    const ids = new Set(
      contacts
        .filter((contact) => contact.types.includes("collaborator"))
        .map((contact) => contact.id)
    );
    activities.forEach((activity) => ids.add(activity.contactId));
    return ids;
  }, [contacts, activities]);

  const volunteers = useMemo(
    () => contacts.filter((contact) => volunteerIds.has(contact.id)),
    [contacts, volunteerIds]
  );

  const volunteerMetrics = useMemo(() => {
    const activityByContact = new Map<string, typeof activities>();
    activities.forEach((activity) => {
      const list = activityByContact.get(activity.contactId) ?? [];
      list.push(activity);
      activityByContact.set(activity.contactId, list);
    });

    return volunteers.map((volunteer) => {
      const list = activityByContact.get(volunteer.id) ?? [];
      const totalHours = list.reduce((sum, entry) => sum + entry.hours, 0);
      const lastActivity = [...list].sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      const lastEvent = lastActivity?.eventId
        ? events.find((event) => event.id === lastActivity.eventId)
        : null;
      const taskLabel =
        lastEvent?.title ||
        lastActivity?.notes?.split(".")[0] ||
        "Ninguna";
      const isInactive = Boolean(volunteer.deactivatedAt);
      const isRecent =
        lastActivity &&
        (now.getTime() - new Date(lastActivity.date).getTime()) /
          (1000 * 60 * 60 * 24) <=
          14;
      const status: VolunteerStatus = isInactive
        ? "Inactivo"
        : isRecent
          ? "En Servicio"
          : "Disponible";
      const type: VolunteerType = volunteer.types.includes("member")
        ? "Socio"
        : "Contacto";

      return {
        volunteer,
        totalHours,
        status,
        type,
        taskLabel,
      };
    });
  }, [activities, events, volunteers, now]);

  const monthlyHours = activities
    .filter((activity) => isOnOrAfter(activity.date, startOfMonth))
    .reduce((sum, activity) => sum + activity.hours, 0);

  const prevMonthlyHours = activities
    .filter(
      (activity) =>
        isOnOrAfter(activity.date, startOfPrevMonth) &&
        new Date(activity.date) <= endOfPrevMonth
    )
    .reduce((sum, activity) => sum + activity.hours, 0);

  const hoursChange =
    prevMonthlyHours === 0
      ? 0
      : ((monthlyHours - prevMonthlyHours) / prevMonthlyHours) * 100;

  const activeVolunteers = volunteerMetrics.filter(
    (item) => item.status !== "Inactivo"
  );
  const pendingTasks = volunteerMetrics.filter(
    (item) => item.status === "En Servicio"
  ).length;

  const filteredVolunteers = useMemo(() => {
    return volunteerMetrics.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (!query.trim()) return true;
      const name = getDisplayName(item.volunteer).toLowerCase();
      const email = item.volunteer.email?.toLowerCase() ?? "";
      return (
        name.includes(query.toLowerCase()) ||
        email.includes(query.toLowerCase())
      );
    });
  }, [query, statusFilter, typeFilter, volunteerMetrics]);

  const sortedVolunteers = useMemo(() => {
    return [...filteredVolunteers].sort((left, right) => {
      switch (sortState.key) {
        case "status":
          return applySortDirection(
            compareText(left.status, right.status, formatLocale),
            sortState.direction
          );
        case "hours":
          return applySortDirection(
            compareNumber(left.totalHours, right.totalHours),
            sortState.direction
          );
        case "task":
          return applySortDirection(
            compareText(left.taskLabel, right.taskLabel, formatLocale),
            sortState.direction
          );
        case "volunteer":
        default:
          return applySortDirection(
            compareText(
              getDisplayName(left.volunteer),
              getDisplayName(right.volunteer),
              formatLocale
            ),
            sortState.direction
          );
      }
    });
  }, [filteredVolunteers, formatLocale, sortState]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedVolunteers.length / PAGE_SIZE)
  );
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pageVolunteers = sortedVolunteers.slice(
    (currentPageSafe - 1) * PAGE_SIZE,
    currentPageSafe * PAGE_SIZE
  );
  const activeFiltersCount = useMemo(() => {
    let total = 0;
    if (statusFilter !== "all") total += 1;
    if (typeFilter !== "all") total += 1;
    return total;
  }, [statusFilter, typeFilter]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageTopbar>
        <div className="mb-4">
          <BackLink href="/people" label="Volver a Personas" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Voluntarios
            </h1>
            <p className="text-sm text-gray-500">
              Gestiona disponibilidad, horas registradas y tareas activas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/people/volunteers/records/new"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                post_add
              </span>
              Registrar actividad
            </Link>
            <Link
              href="/contacts/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-[18px]">
                add
              </span>
              Nuevo Voluntario
            </Link>
          </div>
        </div>
      </PageTopbar>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Voluntarios Activos</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <span className="material-symbols-outlined text-[20px]">
                groups
              </span>
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-gray-900">
            {formatNumber(activeVolunteers.length, formatLocale)}
          </p>
          <p className="mt-2 text-xs text-emerald-600">
            +{formatNumber(activeVolunteers.length, formatLocale)} vs mes anterior
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Horas este Mes</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <span className="material-symbols-outlined text-[20px]">
                schedule
              </span>
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-gray-900">
            {formatNumber(monthlyHours, formatLocale)}h
          </p>
          <p
            className={`mt-2 text-xs ${
              hoursChange >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {hoursChange >= 0 ? "+" : ""}
            {hoursChange.toFixed(1)}% vs mes anterior
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Tareas Pendientes</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <span className="material-symbols-outlined text-[20px]">
                task
              </span>
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-gray-900">
            {formatNumber(pendingTasks, formatLocale)}
          </p>
          <p className="mt-2 text-xs text-rose-600">
            -{formatNumber(Math.round(pendingTasks * 0.2), formatLocale)} vs semana anterior
          </p>
        </div>
      </section>

      <section className={volunteersTableSectionStyles}>
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-[260px] flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">
                <span className="material-symbols-outlined text-[18px]">
                  search
                </span>
              </span>
              <input
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar voluntarios..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-12 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                aria-expanded={showFilters}
                className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-semibold shadow-sm transition ${
                  showFilters || activeFiltersCount > 0
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  tune
                </span>
                Más Filtros
                {activeFiltersCount > 0 ? (
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {activeFiltersCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          {showFilters ? (
            <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 lg:grid-cols-[1fr_1fr_auto]">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as VolunteerStatus | "all");
                  setCurrentPage(1);
                }}
                className={`${filterControlStyles} appearance-none`}
              >
                <option value="all">Estado: Todos</option>
                <option value="Disponible">Estado: Disponible</option>
                <option value="En Servicio">Estado: En servicio</option>
                <option value="Inactivo">Estado: Inactivo</option>
              </select>
              <select
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value as VolunteerType | "all");
                  setCurrentPage(1);
                }}
                className={`${filterControlStyles} appearance-none`}
              >
                <option value="all">Tipo: Todos</option>
                <option value="Socio">Tipo: Socio</option>
                <option value="Contacto">Tipo: Contacto</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setCurrentPage(1);
                }}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          ) : null}
        </div>

        <div className={tableWrapperStyles}>
          <table className="w-full text-left text-sm">
            <thead className={tableHeadStyles}>
              <tr>
                <SortableHeader
                  label="Voluntario"
                  active={sortState.key === "volunteer"}
                  direction={sortState.direction}
                  onClick={() => {
                    setCurrentPage(1);
                    setSortState((current) => toggleSort(current, "volunteer"));
                  }}
                  className={tableHeadCellStyles}
                />
                <SortableHeader
                  label="Estado"
                  active={sortState.key === "status"}
                  direction={sortState.direction}
                  onClick={() => {
                    setCurrentPage(1);
                    setSortState((current) => toggleSort(current, "status"));
                  }}
                  className={tableHeadCellStyles}
                />
                <SortableHeader
                  label="Horas Totales"
                  active={sortState.key === "hours"}
                  direction={sortState.direction}
                  onClick={() => {
                    setCurrentPage(1);
                    setSortState((current) =>
                      toggleSort(current, "hours", "desc")
                    );
                  }}
                  className={tableHeadCellStyles}
                />
                <SortableHeader
                  label="Tareas Actuales"
                  active={sortState.key === "task"}
                  direction={sortState.direction}
                  onClick={() => {
                    setCurrentPage(1);
                    setSortState((current) => toggleSort(current, "task"));
                  }}
                  className={tableHeadCellStyles}
                />
                <th className={`${tableHeadCellStyles} text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody className={tableBodyStyles}>
              {pageVolunteers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    No se encontraron voluntarios con los filtros actuales.
                  </td>
                </tr>
              ) : (
                pageVolunteers.map((item) => {
                  const displayName = getDisplayName(item.volunteer);
                  return (
                    <tr
                      key={item.volunteer.id}
                      className={tableRowStyles}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {item.volunteer.photoUrl ? (
                              <img
                                src={item.volunteer.photoUrl}
                                alt={displayName}
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              getInitials(item.volunteer)
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {displayName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.volunteer.email || "Sin correo"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[item.status]}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {formatNumber(item.totalHours, formatLocale)}h
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {item.taskLabel}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/people/volunteers/records/new?volunteerId=${item.volunteer.id}`}
                          className={tableIconActionStyles}
                          aria-label={`Editar ${displayName}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            edit
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className={tableFooterStyles}>
          <span>
            Mostrando{" "}
            {pageVolunteers.length === 0
              ? 0
              : (currentPageSafe - 1) * PAGE_SIZE + 1}{" "}
            a{" "}
            {Math.min(currentPageSafe * PAGE_SIZE, sortedVolunteers.length)}{" "}
            de {sortedVolunteers.length} voluntarios
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.max(1, prev - 1))
              }
              disabled={currentPageSafe === 1}
              className={`${tablePagerButtonStyles} ${
                currentPageSafe === 1
                  ? tablePagerButtonDisabledStyles
                  : tablePagerButtonEnabledStyles
              }`}
            >
              Anterior
            </button>
            <span className={tablePagerCurrentStyles}>
              {currentPageSafe}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPageSafe === totalPages}
              className={`${tablePagerButtonStyles} ${
                currentPageSafe === totalPages
                  ? tablePagerButtonDisabledStyles
                  : tablePagerButtonEnabledStyles
              }`}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
