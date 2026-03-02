"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/core/i18n/use-locale";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import {
    Contact,
    ContactType,
    ContactTypeLabels,
    ContactKindLabels,
} from "@/modules/contacts/contact.types";

import ContactsHeader from "@/components/contacts/ContactsHeader";
import ContactsTable from "@/components/contacts/ContactsTable";
import ContactDetailPanel from "@/components/contacts/ContactDetailPanel";
import PageTopbar from "@/components/PageTopbar";
import BackLink from "@/components/shared/BackLink";

import Modal from "@/components/Modal";
import { downloadPdf, downloadXlsx } from "@/lib/exporters";

function cx(...classes: Array<string | undefined | null | false>) {
    return classes.filter(Boolean).join(" ");
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

function getContactDisplayName(contact: Contact) {
    const composed = `${contact.firstName} ${contact.lastName}`.trim();
    if (composed) return composed;
    return contact.fullName ?? "Sin nombre";
}

function getContactTypesLabel(contact: Contact) {
    if (!contact.types.length) return "Sin tipo";
    return contact.types
        .map((type) => ContactTypeLabels[type])
        .join(", ");
}

function formatDate(value: string | undefined, locale: string) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

function buildContactExportData(contact: Contact, locale: string) {
    const displayName = getContactDisplayName(contact);
    const fallbackParts = displayName.split(" ").filter(Boolean);
    const firstName =
        contact.firstName?.trim() || fallbackParts[0] || "Sin nombre";
    const lastName =
        contact.lastName?.trim() || fallbackParts.slice(1).join(" ") || "";
    const representative =
        contact.kind === "entity"
            ? `${contact.representativeFirstName ?? ""} ${contact.representativeLastName ?? ""}`.trim()
            : "";
    const tagsLabel =
        contact.tags && contact.tags.length > 0
            ? contact.tags.join(", ")
            : "";
    const birthDate =
        contact.kind === "person"
            ? formatDate(contact.birthDate, locale)
            : "-";

    return {
        displayName,
        firstName,
        lastName,
        fullName: contact.fullName?.trim() ?? "",
        dni: contact.dni || "",
        birthDate,
        kind: ContactKindLabels[contact.kind],
        roles: getContactTypesLabel(contact),
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        phone2: contact.secondaryPhone ?? "",
        website: contact.website ?? "",
        address: contact.address ?? "",
        city: contact.city ?? "",
        region: contact.region ?? "",
        postalCode: contact.postalCode ?? "",
        representative,
        tags: tagsLabel,
        notes: contact.notes ?? "",
        createdAt: formatDate(contact.createdAt, locale),
        deactivatedAt: formatDate(contact.deactivatedAt, locale),
    };
}

export default function ContactsPage() {
    const { formatLocale } = useLocale();
    const { contacts, loadContacts, removeContact } =
        useContactsStore();

    const [typeFilter, setTypeFilter] = useState<ContactType | "all">("all");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Contact | null>(null);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [registeredFrom, setRegisteredFrom] = useState("");
    const [registeredTo, setRegisteredTo] = useState("");
    const [deactivatedFrom, setDeactivatedFrom] = useState("");
    const [deactivatedTo, setDeactivatedTo] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const router = useRouter();
    const searchParams = useSearchParams();
    const typeParam = searchParams.get("type");

    const [confirmDelete, setConfirmDelete] =
        useState<Contact | null>(null);
    const [confirmDeleteFinal, setConfirmDeleteFinal] =
        useState<Contact | null>(null);

    useEffect(() => {
        loadContacts();
    }, [loadContacts]);

    useEffect(() => {
        if (!typeParam) return;
        if (typeParam === "all") {
            setTypeFilter("all");
            return;
        }
        if (
            typeParam === "member" ||
            typeParam === "collaborator" ||
            typeParam === "provider" ||
            typeParam === "sponsor" ||
            typeParam === "other"
        ) {
            setTypeFilter(typeParam);
        }
    }, [typeParam]);

    const filteredContacts = useMemo(() => {
        const query = search.trim().toLowerCase();

        return contacts.filter((c) => {
            const matchesType =
                typeFilter === "all" || c.types.includes(typeFilter);

            if (!matchesType) return false;

            const matchesRegistered = matchesDateRange(
                c.createdAt,
                registeredFrom,
                registeredTo
            );
            if (!matchesRegistered) return false;

            const matchesDeactivated = matchesDateRange(
                c.deactivatedAt,
                deactivatedFrom,
                deactivatedTo
            );
            if (!matchesDeactivated) return false;

            if (!query) return true;

            const displayName = `${c.firstName} ${c.lastName}`.trim();
            const matchesSearch =
                displayName.toLowerCase().includes(query) ||
                (c.fullName?.toLowerCase().includes(query) ?? false) ||
                (c.email?.toLowerCase().includes(query) ?? false) ||
                c.dni.toLowerCase().includes(query);

            return matchesSearch;
        });
    }, [
        contacts,
        typeFilter,
        search,
        registeredFrom,
        registeredTo,
        deactivatedFrom,
        deactivatedTo,
    ]);

    const exportRowsXlsx = useMemo(() => {
        return filteredContacts.map((contact) => {
            const data = buildContactExportData(contact, formatLocale);
            return [
                data.firstName || "-",
                data.lastName || "-",
                data.birthDate || "-",
                data.fullName || "-",
                data.dni || "-",
                data.kind || "-",
                data.roles || "-",
                data.email || "-",
                data.phone || "-",
                data.phone2 || "-",
                data.website || "-",
                data.address || "-",
                data.city || "-",
                data.region || "-",
                data.postalCode || "-",
                data.representative || "-",
                data.tags || "-",
                data.notes || "-",
                data.createdAt || "-",
                data.deactivatedAt || "-",
            ];
        });
    }, [filteredContacts]);

    const exportRowsPdf = useMemo(() => {
        return filteredContacts.flatMap((contact) => {
            const data = buildContactExportData(contact, formatLocale);
            return [
                ["Contacto", data.displayName || "-"],
                ["Nombre", data.firstName || "-"],
                ["Apellidos", data.lastName || "-"],
                ["Fecha nacimiento", data.birthDate || "-"],
                ["Nombre completo", data.fullName || "-"],
                ["DNI", data.dni || "-"],
                ["Tipo", data.kind || "-"],
                ["Roles", data.roles || "-"],
                ["Email", data.email || "-"],
                ["Teléfono", data.phone || "-"],
                ["Teléfono 2", data.phone2 || "-"],
                ["Web", data.website || "-"],
                ["Dirección", data.address || "-"],
                ["Ciudad", data.city || "-"],
                ["Región", data.region || "-"],
                ["Código postal", data.postalCode || "-"],
                ["Representante", data.representative || "-"],
                ["Tags", data.tags || "-"],
                ["Notas", data.notes || "-"],
                ["Fecha alta", data.createdAt || "-"],
                ["Fecha baja", data.deactivatedAt || "-"],
                ["", ""],
            ];
        });
    }, [filteredContacts]);

    const pageSize = 10;

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(filteredContacts.length / pageSize)),
        [filteredContacts.length, pageSize]
    );
    const currentPageSafe = Math.min(currentPage, totalPages);
    const pagedContacts = useMemo(() => {
        const start = (currentPageSafe - 1) * pageSize;
        return filteredContacts.slice(start, start + pageSize);
    }, [filteredContacts, currentPageSafe, pageSize]);

    useEffect(() => {
        if (currentPage !== currentPageSafe) {
            setCurrentPage(currentPageSafe);
        }
    }, [currentPage, currentPageSafe]);

    useEffect(() => {
        setCurrentPage(1);
    }, [
        search,
        typeFilter,
        registeredFrom,
        registeredTo,
        deactivatedFrom,
        deactivatedTo,
    ]);

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

    const canPrev = currentPageSafe > 1;
    const canNext = currentPageSafe < totalPages;

    const handleExportXlsx = () => {
        const rows = [
            [
                "Nombre",
                "Apellidos",
                "Fecha nacimiento",
                "Nombre completo",
                "DNI",
                "Tipo",
                "Roles",
                "Email",
                "Teléfono",
                "Teléfono 2",
                "Web",
                "Dirección",
                "Ciudad",
                "Región",
                "Código postal",
                "Representante",
                "Tags",
                "Notas",
                "Fecha alta",
                "Fecha baja",
            ],
            ...exportRowsXlsx,
        ];
        downloadXlsx("contactos.xlsx", "Contactos", rows);
    };

    const handleExportPdf = () => {
        const columns = [
            { label: "Campo", width: 20 },
            { label: "Valor", width: 60 },
        ];
        downloadPdf(
            "contactos.pdf",
            "Listado de contactos",
            columns,
            exportRowsPdf
        );
    };

    useEffect(() => {
        if (!selected) return;
        if (!filteredContacts.some((c) => c.id === selected.id)) {
            setSelected(null);
        }
    }, [filteredContacts, selected]);

    const confirmDeleteName = confirmDelete
        ? `${confirmDelete.firstName} ${confirmDelete.lastName}`.trim() ||
          confirmDelete.fullName ||
          "este contacto"
        : "este contacto";

    return (
        <div className="flex flex-col gap-6">
            <PageTopbar>
                <div className="space-y-4">
                    <BackLink href="/people" label="Volver a Personas" />
                    <ContactsHeader
                        onAdd={() => {
                            router.push("/contacts/new");
                        }}
                    />
                </div>
            </PageTopbar>

            {/* Contenido principal */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div
                    className={cx(
                        "space-y-4",
                        selected ? "xl:col-span-8" : "xl:col-span-12"
                    )}
                >
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
                                <div className="relative flex-1">
                                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                                        <span className="material-symbols-outlined text-[16px] leading-none">
                                            search
                                        </span>
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Buscar contactos por nombre o email..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                                    />
                                </div>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setFiltersOpen((prev) => !prev)}
                                        aria-expanded={filtersOpen}
                                        aria-controls="contacts-filters-panel"
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">
                                            tune
                                        </span>
                                        Filtros
                                    </button>
                                    {filtersOpen && (
                                        <div
                                            id="contacts-filters-panel"
                                            className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg"
                                        >
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-xs font-semibold uppercase text-gray-400">
                                                        Tipo
                                                    </label>
                                                    <select
                                                        value={typeFilter}
                                                        onChange={(e) =>
                                                            setTypeFilter(
                                                                e.target.value as
                                                                    | ContactType
                                                                    | "all"
                                                            )
                                                        }
                                                        className="mt-2 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                                                    >
                                                        <option value="all">Todos</option>
                                                        <option value="member">Socio</option>
                                                        <option value="provider">Proveedor</option>
                                                        <option value="collaborator">
                                                            Colaborador
                                                        </option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-semibold uppercase text-gray-400">
                                                        Fecha de registro
                                                    </p>
                                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                                        <input
                                                            type="date"
                                                            value={registeredFrom}
                                                            onChange={(e) =>
                                                                setRegisteredFrom(
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                                                            aria-label="Registro desde"
                                                        />
                                                        <input
                                                            type="date"
                                                            value={registeredTo}
                                                            onChange={(e) =>
                                                                setRegisteredTo(
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                                                            aria-label="Registro hasta"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-semibold uppercase text-gray-400">
                                                        Fecha de baja
                                                    </p>
                                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                                        <input
                                                            type="date"
                                                            value={deactivatedFrom}
                                                            onChange={(e) =>
                                                                setDeactivatedFrom(
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                                                            aria-label="Baja desde"
                                                        />
                                                        <input
                                                            type="date"
                                                            value={deactivatedTo}
                                                            onChange={(e) =>
                                                                setDeactivatedTo(
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                                                            aria-label="Baja hasta"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setTypeFilter("all");
                                                            setRegisteredFrom("");
                                                            setRegisteredTo("");
                                                            setDeactivatedFrom("");
                                                            setDeactivatedTo("");
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
                                        </div>
                                    )}
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

                        <div className="overflow-x-auto">
                            <ContactsTable
                                contacts={pagedContacts}
                                selectedId={selected?.id}
                                onSelect={setSelected}
                            />
                        </div>

                        <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                            <span>
                                Mostrando {pagedContacts.length} de {filteredContacts.length} contactos
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        canPrev && setCurrentPage(currentPageSafe - 1)
                                    }
                                    className={cx(
                                        "rounded-lg border px-3 py-1.5 text-sm",
                                        canPrev
                                            ? "border-gray-200 text-gray-500 hover:bg-gray-50"
                                            : "cursor-not-allowed border-gray-100 text-gray-300"
                                    )}
                                    disabled={!canPrev}
                                >
                                    Anterior
                                </button>
                                {pageNumbers.map((page) => {
                                    const isActive = page === currentPageSafe;
                                    return (
                                        <button
                                            key={page}
                                            type="button"
                                            onClick={() => setCurrentPage(page)}
                                            className={cx(
                                                "rounded-lg border px-3 py-1.5 text-sm",
                                                isActive
                                                    ? "border-primary bg-primary/5 font-semibold text-primary"
                                                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                                            )}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                                <button
                                    type="button"
                                    onClick={() =>
                                        canNext && setCurrentPage(currentPageSafe + 1)
                                    }
                                    className={cx(
                                        "rounded-lg border px-3 py-1.5 text-sm",
                                        canNext
                                            ? "border-gray-200 text-gray-500 hover:bg-gray-50"
                                            : "cursor-not-allowed border-gray-100 text-gray-300"
                                    )}
                                    disabled={!canNext}
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {selected && (
                    <div className="xl:col-span-4 hidden xl:block">
                        <ContactDetailPanel
                            contact={selected}
                            onEdit={(c) => {
                                router.push(`/contacts/${c.id}/edit`);
                            }}
                            onDelete={(c) => setConfirmDelete(c)}
                            onClose={() => setSelected(null)}
                        />
                    </div>
                )}
            </div>

            {/* Confirmación eliminar (1) */}
            <Modal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                title="¿Eliminar contacto?"
            >
                <p className="mb-6">
                    ¿Seguro que quieres eliminar{" "}
                    <strong>{confirmDeleteName}</strong>?
                </p>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-4 py-2 border rounded-lg"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            setConfirmDeleteFinal(confirmDelete);
                            setConfirmDelete(null);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg"
                    >
                        Sí, eliminar
                    </button>
                </div>
            </Modal>

            {/* Confirmación eliminar (2) */}
            <Modal
                isOpen={!!confirmDeleteFinal}
                onClose={() => setConfirmDeleteFinal(null)}
                title="Confirmación final"
            >
                <p className="mb-6 text-red-600 font-medium">
                    Esta acción no se puede deshacer.
                </p>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => setConfirmDeleteFinal(null)}
                        className="px-4 py-2 border rounded-lg"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={async () => {
                            if (confirmDeleteFinal) {
                                await removeContact(confirmDeleteFinal.id);
                            }
                            setConfirmDeleteFinal(null);
                            setSelected(null);
                        }}
                        className="px-4 py-2 bg-red-700 text-white rounded-lg"
                    >
                        Eliminar definitivamente
                    </button>
                </div>
            </Modal>
        </div>
    );
}
















