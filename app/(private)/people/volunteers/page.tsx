"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageTopbar from "@/components/PageTopbar";
import BackLink from "@/components/shared/BackLink";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useVolunteerActivitiesStore } from "@/modules/volunteers/volunteer-activities.store";
import { useEventsStore } from "@/modules/events/events.store";
import { Contact } from "@/modules/contacts/contact.types";

type VolunteerStatus = "Disponible" | "En Servicio" | "Inactivo";
type VolunteerType = "Socio" | "Contacto";

const STATUS_STYLES: Record<VolunteerStatus, string> = {
  Disponible: "bg-emerald-50 text-emerald-700",
  "En Servicio": "bg-blue-50 text-blue-700",
  Inactivo: "bg-slate-100 text-slate-600",
};

const PAGE_SIZE = 10;

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

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES", {
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
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadContacts();
    loadActivities();
    loadEvents();
  }, [loadContacts, loadActivities, loadEvents]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, typeFilter]);

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

  const filteredVolunteers = volunteerMetrics.filter((item) => {
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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredVolunteers.length / PAGE_SIZE)
  );
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pageVolunteers = filteredVolunteers.slice(
    (currentPageSafe - 1) * PAGE_SIZE,
    currentPageSafe * PAGE_SIZE
  );

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageTopbar>
        <div className="mb-4">
          <BackLink href="/people" label="Volver a Personas" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">
              Voluntarios
            </h1>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <span className="material-symbols-outlined text-[18px]">
                  search
                </span>
              </span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar voluntarios..."
                className="w-64 rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
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
            {formatNumber(activeVolunteers.length)}
          </p>
          <p className="mt-2 text-xs text-emerald-600">
            +{formatNumber(activeVolunteers.length)} vs mes anterior
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
            {formatNumber(monthlyHours)}h
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
            {formatNumber(pendingTasks)}
          </p>
          <p className="mt-2 text-xs text-rose-600">
            -{formatNumber(Math.round(pendingTasks * 0.2))} vs semana anterior
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as VolunteerStatus | "all")
              }
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm"
            >
              <option value="all">Estado: Todos</option>
              <option value="Disponible">Estado: Disponible</option>
              <option value="En Servicio">Estado: En servicio</option>
              <option value="Inactivo">Estado: Inactivo</option>
            </select>
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as VolunteerType | "all")
              }
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm"
            >
              <option value="all">Tipo: Todos</option>
              <option value="Socio">Tipo: Socio</option>
              <option value="Contacto">Tipo: Contacto</option>
            </select>
          </div>
          <p className="text-xs text-gray-500">
            Mostrando {pageVolunteers.length} de {filteredVolunteers.length} voluntarios
          </p>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-6 py-4">Voluntario</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Horas Totales</th>
              <th className="px-6 py-4">Tareas Actuales</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
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
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
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
                      {formatNumber(item.totalHours)}h
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.taskLabel}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/people/volunteers/records/new?volunteerId=${item.volunteer.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
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

        <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Mostrando{" "}
            {pageVolunteers.length === 0
              ? 0
              : (currentPageSafe - 1) * PAGE_SIZE + 1}{" "}
            a{" "}
            {Math.min(currentPageSafe * PAGE_SIZE, filteredVolunteers.length)}{" "}
            de {filteredVolunteers.length} voluntarios
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.max(1, prev - 1))
              }
              disabled={currentPageSafe === 1}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                currentPageSafe === 1
                  ? "border-gray-100 text-gray-300"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Anterior
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
              {currentPageSafe}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPageSafe === totalPages}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                currentPageSafe === totalPages
                  ? "border-gray-100 text-gray-300"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
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
