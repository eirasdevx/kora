"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import SectionBlock from "@/components/shared/SectionBlock";
import StatCard from "@/components/shared/StatCard";
import { useLocale } from "@/core/i18n/use-locale";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { Contact, ContactTypeLabels } from "@/modules/contacts/contact.types";
import { useVolunteerActivitiesStore } from "@/modules/volunteers/volunteer-activities.store";

type PeopleSegment = "member" | "volunteer" | "contact";

const PAGE_SIZE = 5;

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

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
}

function getTypeBadges(contact: Contact) {
  if (!contact.types || contact.types.length === 0) {
    return ["Otro"];
  }
  return contact.types.map((type) => ContactTypeLabels[type]);
}

function isOnOrAfter(dateValue: string | undefined, start: Date) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start;
}

export default function PeoplePage() {
  const { formatLocale } = useLocale();
  const { contacts, loadContacts } = useContactsStore();
  const { activities, loadActivities } = useVolunteerActivitiesStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [tableFilter, setTableFilter] = useState<PeopleSegment>("contact");

  useEffect(() => {
    loadContacts();
    loadActivities();
  }, [loadContacts, loadActivities]);

  useEffect(() => {
    setCurrentPage(1);
  }, [contacts.length, tableFilter]);

  const now = useMemo(() => new Date(), []);
  const startOfMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
    [now]
  );
  const startOfWeek = useMemo(() => {
    const date = new Date(now);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [now]);

  const volunteerIds = useMemo(() => {
    const ids = new Set(
      contacts
        .filter((contact) => contact.types.includes("collaborator"))
        .map((contact) => contact.id)
    );
    activities.forEach((activity) => {
      ids.add(activity.contactId);
    });
    return ids;
  }, [contacts, activities]);

  const members = useMemo(
    () => contacts.filter((contact) => contact.types.includes("member")),
    [contacts]
  );
  const volunteers = useMemo(
    () => contacts.filter((contact) => volunteerIds.has(contact.id)),
    [contacts, volunteerIds]
  );
  const contactPool = useMemo(
    () =>
      contacts.filter((contact) =>
        contact.types.some((type) => type !== "member")
      ),
    [contacts]
  );

  const tableContacts = useMemo(() => {
    if (tableFilter === "member") return members;
    if (tableFilter === "volunteer") return volunteers;
    return contactPool;
  }, [tableFilter, members, volunteers, contactPool]);

  const newMembersThisMonth = members.filter((member) =>
    isOnOrAfter(member.createdAt, startOfMonth)
  ).length;
  const newContactsThisWeek = contactPool.filter((contact) =>
    isOnOrAfter(contact.createdAt, startOfWeek)
  ).length;

  const volunteerHoursThisMonth = useMemo(() => {
    return activities
      .filter((activity) => isOnOrAfter(activity.date, startOfMonth))
      .reduce((sum, activity) => sum + activity.hours, 0);
  }, [activities, startOfMonth]);

  const sortedContacts = useMemo(() => {
    return [...tableContacts].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );
  }, [tableContacts]);

  const totalPages = Math.max(1, Math.ceil(sortedContacts.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedContacts = useMemo(() => {
    const start = (currentPageSafe - 1) * PAGE_SIZE;
    return sortedContacts.slice(start, start + PAGE_SIZE);
  }, [sortedContacts, currentPageSafe]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    let start = Math.max(1, currentPageSafe - 1);
    let end = Math.min(totalPages, start + 2);
    if (end - start < 2) {
      start = Math.max(1, end - 2);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPageSafe, totalPages]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Personas"
        subtitle="Gestión de socios, voluntarios y contactos"
        actions={
          <>
            <Link
              href="/people/all"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              <span className="material-symbols-outlined text-[18px]">
                groups
              </span>
              Total personas
            </Link>
            <Link
              href="/contacts/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <span className="material-symbols-outlined text-[16px]">
                  add
                </span>
              </span>
              A?adir nueva
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Socios"
          value={formatNumber(members.length, formatLocale)}
          meta={`+${formatNumber(newMembersThisMonth, formatLocale)} este mes`}
          href="/people/members"
          icon="group"
          accentClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Voluntarios"
          value={formatNumber(volunteers.length, formatLocale)}
          meta={`${formatNumber(volunteerHoursThisMonth, formatLocale)} horas este mes`}
          href="/people/volunteers"
          icon="volunteer_activism"
          accentClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Contactos"
          value={formatNumber(contactPool.length, formatLocale)}
          meta={`+${formatNumber(newContactsThisWeek, formatLocale)} esta semana`}
          href="/people/contacts"
          icon="contact_page"
          accentClassName="bg-slate-100 text-slate-600"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <SectionBlock
          title="Contactos"
          subtitle="Listado general de contactos"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Registro</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {pagedContacts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      No hay contactos registrados.
                    </td>
                  </tr>
                ) : (
                  pagedContacts.map((person) => {
                    const displayName = getDisplayName(person);
                    const email = person.email?.trim() || "Sin correo";
                    const typeLabels = getTypeBadges(person);
                    return (
                      <tr
                        key={person.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
                              {person.photoUrl ? (
                                <img
                                  src={person.photoUrl}
                                  alt={displayName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getInitials(person)
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {displayName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {typeLabels.map((label) => (
                              <span
                                key={`${person.id}-${label}`}
                                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(person.createdAt, formatLocale)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/contacts/${person.id}/edit`}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                          >
                            Ver ficha
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Mostrando{" "}
              {pagedContacts.length === 0
                ? 0
                : (currentPageSafe - 1) * PAGE_SIZE + 1}{" "}
              a{" "}
              {Math.min(currentPageSafe * PAGE_SIZE, sortedContacts.length)}{" "}
              de {sortedContacts.length} contactos
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
              {pageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`h-8 w-8 rounded-lg text-xs font-semibold ${
                    page === currentPageSafe
                      ? "bg-primary/10 text-primary"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              ))}
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
        </SectionBlock>

        <SectionBlock
          title="Filtrado tabla"
          subtitle="Selecciona el grupo a mostrar"
        >
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => setTableFilter("member")}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                tableFilter === "member"
                  ? "border-primary/40 bg-white text-gray-800 shadow-sm"
                  : "border-gray-200 bg-gray-50 text-gray-700 hover:border-primary/40 hover:bg-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <span className="material-symbols-outlined text-[18px]">
                    group
                  </span>
                </span>
                Miembros
              </span>
              <span className="text-xs font-semibold text-gray-400">
                {formatNumber(members.length, formatLocale)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("volunteer")}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                tableFilter === "volunteer"
                  ? "border-primary/40 bg-white text-gray-800 shadow-sm"
                  : "border-gray-200 bg-gray-50 text-gray-700 hover:border-primary/40 hover:bg-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <span className="material-symbols-outlined text-[18px]">
                    volunteer_activism
                  </span>
                </span>
                Voluntarios
              </span>
              <span className="text-xs font-semibold text-gray-400">
                {formatNumber(volunteers.length, formatLocale)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTableFilter("contact")}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                tableFilter === "contact"
                  ? "border-primary/40 bg-white text-gray-800 shadow-sm"
                  : "border-gray-200 bg-gray-50 text-gray-700 hover:border-primary/40 hover:bg-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <span className="material-symbols-outlined text-[18px]">
                    contact_page
                  </span>
                </span>
                Contactos
              </span>
              <span className="text-xs font-semibold text-gray-400">
                {formatNumber(contactPool.length, formatLocale)}
              </span>
            </button>
          </div>
        </SectionBlock>
      </section>
    </div>
  );
}
