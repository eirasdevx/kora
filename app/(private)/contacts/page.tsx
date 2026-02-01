"use client";

import { useEffect, useState } from "react";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { Contact, ContactType } from "@/modules/contacts/contact.types";

import ContactsHeader from "@/components/contacts/ContactsHeader";
import ContactsFilters from "@/components/contacts/ContactsFilters";
import ContactsTable from "@/components/contacts/ContactsTable";
import ContactDetailPanel from "@/components/contacts/ContactDetailPanel";

import ContactForm from "@/modules/contacts/ContactForm";
import Modal from "@/components/Modal";

export default function ContactsPage() {
    const {
        contacts,
        loadContacts,
        addContact,
        removeContact,
    } = useContactsStore();

    const [filter, setFilter] = useState<ContactType | "all">("all");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Contact | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [editingContact, setEditingContact] =
        useState<Contact | null>(null);

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
        const matchesSearch =
            c.fullName.toLowerCase().includes(query) ||
            (c.email?.toLowerCase().includes(query) ?? false);

        return matchesType && matchesSearch;
    });

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <ContactsHeader
                onAdd={() => {
                    setEditingContact(null);
                    setShowForm(true);
                }}
                onSearch={setSearch}
            />

            {/* Filtros */}
            <ContactsFilters
                value={filter}
                onChange={setFilter}
            />

            {/* Contenido principal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <ContactsTable
                        contacts={filteredContacts}
                        selectedId={selected?.id}
                        onSelect={setSelected}
                    />
                </div>

                <div className="lg:col-span-4 hidden lg:block">
                    <ContactDetailPanel
                        contact={selected}
                        onEdit={(c) => {
                            setEditingContact(c);
                            setShowForm(true);
                        }}
                        onDelete={(c) => setConfirmDelete(c)}
                    />
                </div>
            </div>

            {/* Modal crear / editar */}
            <Modal
                isOpen={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditingContact(null);
                }}
            >
                <ContactForm
                    key={editingContact?.id ?? "new"}
                    initialData={editingContact ?? undefined}
                    onSubmit={async (contact) => {
                        await addContact(contact);
                        setShowForm(false);
                        setEditingContact(null);
                    }}
                    onCancel={() => {
                        setShowForm(false);
                        setEditingContact(null);
                    }}
                />


            </Modal>

            {/* Confirmación eliminar (1) */}
            <Modal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                title="¿Eliminar contacto?"
            >
                <p className="mb-6">
                    ¿Seguro que quieres eliminar{" "}
                    <strong>{confirmDelete?.fullName}</strong>?
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
