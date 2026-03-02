"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import SectionBlock from "@/components/shared/SectionBlock";
import StatCard from "@/components/shared/StatCard";
import DataTable from "@/components/shared/DataTable";
import { useLocale } from "@/core/i18n/use-locale";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { Contact, ContactTypeLabels } from "@/modules/contacts/contact.types";

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

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const contactPool = useMemo(
    () => contacts.filter(isContact),
    [contacts]
  );
  const providers = contactPool.filter((c) =>
    c.types.includes("provider")
  );
  const collaborators = contactPool.filter((c) =>
    c.types.includes("collaborator")
  );

  const filteredContacts = contactPool.filter((contact) => {
    if (!query.trim()) return true;
    const name = getDisplayName(contact).toLowerCase();
    const email = contact.email?.toLowerCase() ?? "";
    return name.includes(query.toLowerCase()) || email.includes(query.toLowerCase());
  });

  const rows = filteredContacts.map((contact) => {
    const displayName = getDisplayName(contact);
    const email = contact.email?.trim() || "Sin correo";
    const phone = contact.phone?.trim() || contact.secondaryPhone?.trim() || "-";

    return {
      key: contact.id,
      cells: [
        <div key={`${contact.id}-person`} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
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
        </div>,
        <div key={`${contact.id}-type`} className="flex flex-wrap gap-2">
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
        </div>,
        <span key={`${contact.id}-phone`} className="text-sm text-gray-600">
          {phone}
        </span>,
        <div key={`${contact.id}-actions`} className="flex justify-end">
          <Link
            href={`/contacts/${contact.id}/edit`}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Ver ficha
          </Link>
        </div>,
      ],
      className: "hover:bg-gray-50",
    };
  });

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
            <span className="material-symbols-outlined text-[18px]">
              add
            </span>
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

      <SectionBlock
        title="Base de contactos"
        subtitle="Listado general de contactos externos"
        actions={
          <div className="relative w-full sm:w-64">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <span className="material-symbols-outlined text-[16px]">
                search
              </span>
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar contacto..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
        }
      >
        <DataTable
          columns={[
            { key: "contact", label: "Contacto" },
            { key: "type", label: "Tipo" },
            { key: "phone", label: "Teléfono" },
            { key: "actions", label: "Acciones", align: "right" },
          ]}
          rows={rows}
          emptyLabel="No hay contactos disponibles."
        />
      </SectionBlock>
    </div>
  );
}
