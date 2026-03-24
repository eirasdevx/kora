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
import ContactsTable, {
    type ContactsSortKey,
} from "@/components/contacts/ContactsTable";
import ContactDetailPanel from "@/components/contacts/ContactDetailPanel";
import PageTopbar from "@/components/PageTopbar";
import BackLink from "@/components/shared/BackLink";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

import Modal from "@/components/Modal";
import { downloadPdf, downloadXlsx } from "@/lib/exporters";
import {
    applySortDirection,
    compareDate,
    compareText,
    type SortState,
    toggleSort,
} from "@/lib/table-sorting";

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

function parseContactTypeFilter(value: string | null): ContactType | "all" {
    if (
        value === "member" ||
        value === "collaborator" ||
        value === "provider" ||
        value === "sponsor" ||
        value === "other"
    ) {
        return value;
    }
    return "all";
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
    const router = useRouter();
    const searchParams = useSearchParams();
    const typeParam = searchParams.get("type");
    const contacts = useContactsStore((state) => state.contacts);
    const loadContacts = useContactsStore((state) => state.loadContacts);
    const removeContact = useContactsStore((state) => state.removeContact);
    const isLoading = useContactsStore((state) => state.isLoading);
    const isSaving = useContactsStore((state) => state.isSaving);

    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [registeredFrom, setRegisteredFrom] = useState("");
    const [registeredTo, setRegisteredTo] = useState("");
    const [deactivatedFrom, setDeactivatedFrom] = useState("");
    const [deactivatedTo, setDeactivatedTo] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortState, setSortState] = useState<SortState<ContactsSortKey>>({
        key: "firstName",
        direction: "asc",
    });

    const [confirmDelete, setConfirmDelete] =
        useState<Contact | null>(null);
    const [confirmDeleteFinal, setConfirmDeleteFinal] =
        useState<Contact | null>(null);
    const typeFilter = parseContactTypeFilter(typeParam);

    useEffect(() => {
        void loadContacts();
    }, [loadContacts]);

    const updateTypeFilter = (next: ContactType | "all") => {
        const params = new URLSearchParams(searchParams.toString());
        if (next === "all") {
            params.delete("type");
        } else {
            params.set("type", next);
        }
        const query = params.toString();
        router.replace(query ? `/contacts?${query}` : "/contacts");
    };

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

    const sortedContacts = useMemo(() => {
        return [...filteredContacts].sort((left, right) => {
            const leftDisplayName = getContactDisplayName(left);
            const rightDisplayName = getContactDisplayName(right);
            const leftFallbackParts = leftDisplayName.split(" ").filter(Boolean);
            const rightFallbackParts = rightDisplayName.split(" ").filter(Boolean);
            const leftFirstName =
                left.firstName?.trim() || leftFallbackParts[0] || "Sin nombre";
            const rightFirstName =
                right.firstName?.trim() || rightFallbackParts[0] || "Sin nombre";
            const leftLastName =
                left.lastName?.trim() || leftFallbackParts.slice(1).join(" ") || "-";
            const rightLastName =
                right.lastName?.trim() || rightFallbackParts.slice(1).join(" ") || "-";
            const leftPhone =
                left.phone?.trim() || left.secondaryPhone?.trim() || "-";
            const rightPhone =
                right.phone?.trim() || right.secondaryPhone?.trim() || "-";

            switch (sortState.key) {
                case "lastName":
                    return applySortDirection(
                        compareText(leftLastName, rightLastName, formatLocale),
                        sortState.direction
                    );
                case "birthDate":
                    return applySortDirection(
                        compareDate(left.birthDate, right.birthDate),
                        sortState.direction
                    );
                case "dni":
                    return applySortDirection(
                        compareText(left.dni, right.dni, formatLocale),
                        sortState.direction
                    );
                case "phone":
                    return applySortDirection(
                        compareText(leftPhone, rightPhone, formatLocale),
                        sortState.direction
                    );
                case "email":
                    return applySortDirection(
                        compareText(left.email, right.email, formatLocale),
                        sortState.direction
                    );
                case "firstName":
                default:
                    return applySortDirection(
                        compareText(leftFirstName, rightFirstName, formatLocale),
                        sortState.direction
                    );
            }
        });
    }, [filteredContacts, formatLocale, sortState]);

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
    }, [filteredContacts, formatLocale]);

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
    }, [filteredContacts, formatLocale]);

    const pageSize = 10;

    const totalPages = useMemo(
        () => Math.max(1, Math.ceil(sortedContacts.length / pageSize)),
        [pageSize, sortedContacts.length]
    );
    const currentPageSafe = Math.min(currentPage, totalPages);
    const pagedContacts = useMemo(() => {
        const start = (currentPageSafe - 1) * pageSize;
        return sortedContacts.slice(start, start + pageSize);
    }, [currentPageSafe, pageSize, sortedContacts]);

    const pageNumbers = useMemo(() => {
        if (totalPages <= 3) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        let start = Math.max(1, currentPageSafe - 1);
        const end = Math.min(totalPages, start + 2);
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

    const selected =
        filteredContacts.find((contact) => contact.id === selectedId) ?? null;

    const confirmDeleteName = confirmDelete
        ? `${confirmDelete.firstName} ${confirmDelete.lastName}`.trim() ||
          confirmDelete.fullName ||
          "este contacto"
        : "este contacto";
    const showInitialLoader = isLoading && contacts.length === 0;
    const showBusyOverlay = (isLoading && contacts.length > 0) || isSaving;

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
                    <div className="relative rounded-2xl border border-gray-200 bg-white shadow-sm">
                        {showBusyOverlay ? (
                            <LoadingSpinner
                                overlay
                                label={
                                    isSaving
                                        ? "Guardando cambios..."
                                        : "Cargando contactos..."
                                }
                                description="La ruleta desaparecera automaticamente al terminar."
                            />
                        ) : null}
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
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setCurrentPage(1);
                                        }}
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
                                                        onChange={(e) => {
                                                            updateTypeFilter(
                                                                e.target.value as
                                                                    | ContactType
                                                                    | "all"
                                                            );
                                                            setCurrentPage(1);
                                                        }}
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
                                                            onChange={(e) => {
                                                                setRegisteredFrom(
                                                                    e.target.value
                                                                );
                                                                setCurrentPage(1);
                                                            }}
                                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                                                            aria-label="Registro desde"
                                                        />
                                                        <input
                                                            type="date"
                                                            value={registeredTo}
                                                            onChange={(e) => {
                                                                setRegisteredTo(
                                                                    e.target.value
                                                                );
                                                                setCurrentPage(1);
                                                            }}
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
                                                            onChange={(e) => {
                                                                setDeactivatedFrom(
                                                                    e.target.value
                                                                );
                                                                setCurrentPage(1);
                                                            }}
                                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                                                            aria-label="Baja desde"
                                                        />
                                                        <input
                                                            type="date"
                                                            value={deactivatedTo}
                                                            onChange={(e) => {
                                                                setDeactivatedTo(
                                                                    e.target.value
                                                                );
                                                                setCurrentPage(1);
                                                            }}
                                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                                                            aria-label="Baja hasta"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            updateTypeFilter("all");
                                                            setRegisteredFrom("");
                                                            setRegisteredTo("");
                                                            setDeactivatedFrom("");
                                                            setDeactivatedTo("");
                                                            setCurrentPage(1);
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
                            {showInitialLoader ? (
                                <LoadingSpinner
                                    fullHeight
                                    label="Cargando contactos..."
                                    description="La tabla se mostrara en cuanto termine la carga."
                                />
                            ) : (
                                <ContactsTable
                                    contacts={pagedContacts}
                                    selectedId={selectedId}
                                    onSelect={(contact) => setSelectedId(contact.id)}
                                    sortState={sortState}
                                    onSortChange={(key) =>
                                        setSortState((current) => toggleSort(current, key))
                                    }
                                />
                            )}
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
                            onClose={() => setSelectedId("")}
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
                        disabled={isSaving}
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
                            setSelectedId("");
                        }}
                        disabled={isSaving}
                        className="px-4 py-2 bg-red-700 text-white rounded-lg"
                    >
                        {isSaving ? "Eliminando..." : "Eliminar definitivamente"}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
















