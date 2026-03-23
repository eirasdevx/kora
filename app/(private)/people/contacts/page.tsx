"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import SortableHeader from "@/components/shared/SortableHeader";
import StatCard from "@/components/shared/StatCard";
import {
  tableBodyStyles,
  tableEmptyCellStyles,
  tableFooterStyles,
  tableHeadCellStyles,
  tableHeadStyles,
  tablePagerButtonDisabledStyles,
  tablePagerButtonEnabledStyles,
  tablePagerButtonStyles,
  tablePagerCurrentStyles,
  tableRowStyles,
  tableTextActionStyles,
  tableWrapperStyles,
} from "@/components/shared/tableStyles";
import { useLocale } from "@/core/i18n/use-locale";
import {
  applySortDirection,
  compareText,
  SortState,
  toggleSort,
} from "@/lib/table-sorting";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import {
  Contact,
  ContactKind,
  ContactType,
  ContactTypeLabels,
} from "@/modules/contacts/contact.types";

const PAGE_SIZE = 6;
const filterControlStyles =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
const contactsTableSectionStyles =
  "rounded-[26px] border border-slate-200 bg-white shadow-sm";

const CONTACT_TYPE_FILTERS: Array<{ label: string; value: "all" | ContactType }> = [
  { label: "Todos", value: "all" },
  { label: "Proveedor", value: "provider" },
  { label: "Colaborador", value: "collaborator" },
  { label: "Patrocinador", value: "sponsor" },
  { label: "Otro", value: "other" },
];

const CONTACT_KIND_FILTERS: Array<{ label: string; value: "all" | ContactKind }> = [
  { label: "Todos", value: "all" },
  { label: "Persona", value: "person" },
  { label: "Entidad", value: "entity" },
];

type ContactsSortKey = "contact" | "type" | "phone";

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

function isContact(contact: Contact) {
  return contact.types.some((type) => type !== "member");
}

export default function PeopleContactsPage() {
  const { formatLocale } = useLocale();
  const { contacts, loadContacts } = useContactsStore();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ContactType>("all");
  const [kindFilter, setKindFilter] = useState<"all" | ContactKind>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortState, setSortState] = useState<SortState<ContactsSortKey>>({
    key: "contact",
    direction: "asc",
  });

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, typeFilter, kindFilter]);

  const contactPool = useMemo(() => contacts.filter(isContact), [contacts]);
  const providers = useMemo(
    () => contactPool.filter((contact) => contact.types.includes("provider")),
    [contactPool]
  );
  const collaborators = useMemo(
    () =>
      contactPool.filter((contact) => contact.types.includes("collaborator")),
    [contactPool]
  );

  const filteredContacts = useMemo(() => {
    return contactPool.filter((contact) => {
      if (typeFilter !== "all" && !contact.types.includes(typeFilter)) {
        return false;
      }
      if (kindFilter !== "all" && contact.kind !== kindFilter) {
        return false;
      }
      if (!query.trim()) return true;
      const name = getDisplayName(contact).toLowerCase();
      const email = contact.email?.toLowerCase() ?? "";
      return (
        name.includes(query.toLowerCase()) || email.includes(query.toLowerCase())
      );
    });
  }, [contactPool, kindFilter, query, typeFilter]);

  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((left, right) => {
      const leftTypeLabel =
        left.types.length === 0
          ? "Otro"
          : left.types.map((type) => ContactTypeLabels[type]).join(", ");
      const rightTypeLabel =
        right.types.length === 0
          ? "Otro"
          : right.types.map((type) => ContactTypeLabels[type]).join(", ");
      const leftPhone = left.phone?.trim() || left.secondaryPhone?.trim() || "-";
      const rightPhone =
        right.phone?.trim() || right.secondaryPhone?.trim() || "-";

      switch (sortState.key) {
        case "type":
          return applySortDirection(
            compareText(leftTypeLabel, rightTypeLabel, formatLocale),
            sortState.direction
          );
        case "phone":
          return applySortDirection(
            compareText(leftPhone, rightPhone, formatLocale),
            sortState.direction
          );
        case "contact":
        default:
          return applySortDirection(
            compareText(
              getDisplayName(left),
              getDisplayName(right),
              formatLocale
            ),
            sortState.direction
          );
      }
    });
  }, [filteredContacts, formatLocale, sortState]);

  const totalPages = Math.max(1, Math.ceil(sortedContacts.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pageContacts = useMemo(() => {
    const start = (currentPageSafe - 1) * PAGE_SIZE;
    return sortedContacts.slice(start, start + PAGE_SIZE);
  }, [currentPageSafe, sortedContacts]);

  const activeFiltersCount = useMemo(() => {
    let total = 0;
    if (typeFilter !== "all") total += 1;
    if (kindFilter !== "all") total += 1;
    return total;
  }, [kindFilter, typeFilter]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Contactos"
        subtitle="Gestión general de proveedores y colaboradores"
        backHref="/people"
        backLabel="Volver a Personas"
        actions={
          <Link
            href="/contacts/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nuevo contacto
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Contactos totales"
          value={formatNumber(contactPool.length, formatLocale)}
          meta="Base de datos general"
          icon="contacts"
          accentClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Proveedores"
          value={formatNumber(providers.length, formatLocale)}
          meta="Servicios y recursos"
          icon="inventory"
          accentClassName="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Colaboradores"
          value={formatNumber(collaborators.length, formatLocale)}
          meta="Equipo externo"
          icon="handshake"
          accentClassName="bg-emerald-50 text-emerald-600"
        />
      </section>

      <section className={contactsTableSectionStyles}>
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-[260px] flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <span className="material-symbols-outlined text-[16px]">
                  search
                </span>
              </span>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar contacto por nombre o email..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
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

          {showFilters ? (
            <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 lg:grid-cols-[1fr_1fr_auto]">
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as "all" | ContactType)
                }
                className={`${filterControlStyles} appearance-none`}
              >
                {CONTACT_TYPE_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    Tipo: {filter.label}
                  </option>
                ))}
              </select>
              <select
                value={kindFilter}
                onChange={(event) =>
                  setKindFilter(event.target.value as "all" | ContactKind)
                }
                className={`${filterControlStyles} appearance-none`}
              >
                {CONTACT_KIND_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    Perfil: {filter.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("all");
                  setKindFilter("all");
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
                  label="Contacto"
                  active={sortState.key === "contact"}
                  direction={sortState.direction}
                  onClick={() => {
                    setCurrentPage(1);
                    setSortState((current) => toggleSort(current, "contact"));
                  }}
                  className={tableHeadCellStyles}
                />
                <SortableHeader
                  label="Tipo"
                  active={sortState.key === "type"}
                  direction={sortState.direction}
                  onClick={() => {
                    setCurrentPage(1);
                    setSortState((current) => toggleSort(current, "type"));
                  }}
                  className={tableHeadCellStyles}
                />
                <SortableHeader
                  label="Teléfono"
                  active={sortState.key === "phone"}
                  direction={sortState.direction}
                  onClick={() => {
                    setCurrentPage(1);
                    setSortState((current) => toggleSort(current, "phone"));
                  }}
                  className={tableHeadCellStyles}
                />
                <th className={`${tableHeadCellStyles} text-right`}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className={tableBodyStyles}>
              {pageContacts.length === 0 ? (
                <tr>
                  <td colSpan={4} className={tableEmptyCellStyles}>
                    No hay contactos disponibles.
                  </td>
                </tr>
              ) : (
                pageContacts.map((contact) => {
                  const displayName = getDisplayName(contact);
                  const email = contact.email?.trim() || "Sin correo";
                  const phone =
                    contact.phone?.trim() ||
                    contact.secondaryPhone?.trim() ||
                    "-";

                  return (
                    <tr key={contact.id} className={tableRowStyles}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                            {contact.photoUrl ? (
                              <img
                                src={contact.photoUrl}
                                alt={displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getInitials(contact)
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {displayName}
                            </p>
                            <p className="text-xs text-gray-500">{email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {contact.types.length === 0 ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              Otro
                            </span>
                          ) : (
                            contact.types.map((type) => (
                              <span
                                key={`${contact.id}-${type}`}
                                className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600"
                              >
                                {ContactTypeLabels[type]}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {phone}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/contacts/${contact.id}/edit`}
                          className={tableTextActionStyles}
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

        <div className={tableFooterStyles}>
          <span>
            Mostrando{" "}
            {pageContacts.length === 0
              ? 0
              : (currentPageSafe - 1) * PAGE_SIZE + 1}{" "}
            a {Math.min(currentPageSafe * PAGE_SIZE, sortedContacts.length)} de{" "}
            {sortedContacts.length} contactos
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
            <span className={tablePagerCurrentStyles}>{currentPageSafe}</span>
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
