"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { Contact, ContactType } from "@/modules/contacts/contact.types";

import ContactsHeader from "@/components/contacts/ContactsHeader";
import ContactsFilters from "@/components/contacts/ContactsFilters";
import ContactsTable from "@/components/contacts/ContactsTable";
import ContactDetailPanel from "@/components/contacts/ContactDetailPanel";
import PageTopbar from "@/components/PageTopbar";

import Modal from "@/components/Modal";

function cx(...classes: Array<string | undefined | null | false>) {
    return classes.filter(Boolean).join(" ");
}

export default function ContactsPage() {
    const { contacts, loadContacts, removeContact } =
        useContactsStore();

    const [filter, setFilter] = useState<ContactType | "all">("all");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Contact | null>(null);

    const router = useRouter();

    const [confirmDelete, setConfirmDelete] =
        useState<Contact | null>(null);
    const [confirmDeleteFinal, setConfirmDeleteFinal] =
        useState<Contact | null>(null);

    useEffect(() => {
        loadContacts();
    }, [loadContacts]);

    const filteredContacts = contacts.filter((c) => {
        const matchesType =
            filter === "all" || c.types.includes(filter);

        const query = search.toLowerCase();
        const displayName = `${c.firstName} ${c.lastName}`.trim();
        const matchesSearch =
            displayName.toLowerCase().includes(query) ||
            (c.fullName?.toLowerCase().includes(query) ?? false) ||
            (c.email?.toLowerCase().includes(query) ?? false) ||
            c.dni.toLowerCase().includes(query);

        return matchesType && matchesSearch;
    });

    const filterCounts = {
        all: contacts.length,
        member: contacts.filter((c) => c.types.includes("member")).length,
        provider: contacts.filter((c) => c.types.includes("provider")).length,
        collaborator: contacts.filter((c) => c.types.includes("collaborator")).length,
    };

    const confirmDeleteName = confirmDelete
        ? `${confirmDelete.firstName} ${confirmDelete.lastName}`.trim() ||
          confirmDelete.fullName ||
          "este contacto"
        : "este contacto";

    return (
        <div className="flex flex-col gap-6">
            <PageTopbar>
                <ContactsHeader
                    onAdd={() => {
                        router.push("/contacts/new");
                    }}
                />
            </PageTopbar>

            {/* Filtros */}
            <ContactsFilters
                value={filter}
                onChange={setFilter}
                counts={filterCounts}
            />

            {/* Contenido principal */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div
                    className={cx(
                        "space-y-4",
                        selected ? "xl:col-span-8" : "xl:col-span-12"
                    )}
                >
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 sm:flex-row sm:items-center">
                            <div className="relative flex-1">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <circle cx="11" cy="11" r="7" />
                                        <path d="M21 21l-4.3-4.3" />
                                    </svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Buscar contactos por nombre o email..."
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                                />
                            </div>
                            <button
                                type="button"
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M3 6h18" />
                                    <path d="M7 12h10" />
                                    <path d="M10 18h4" />
                                </svg>
                                Filtros
                            </button>
                        </div>

                        <div className="overflow-hidden">
                            <ContactsTable
                                contacts={filteredContacts}
                                selectedId={selected?.id}
                                onSelect={setSelected}
                            />
                        </div>

                        <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                            <span>
                                Mostrando {filteredContacts.length} de {contacts.length} contactos
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500"
                                >
                                    Anterior
                                </button>
                                <button
                                    type="button"
                                    className="rounded-lg border border-primary bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary"
                                >
                                    1
                                </button>
                                <button
                                    type="button"
                                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500"
                                >
                                    2
                                </button>
                                <button
                                    type="button"
                                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500"
                                >
                                    3
                                </button>
                                <button
                                    type="button"
                                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500"
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
