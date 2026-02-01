import { create } from "zustand";
import { Contact } from "./contact.types";
import { db } from "@/core/storage/kora.db";

interface ContactsState {
  contacts: Contact[];

  loadContacts: () => Promise<void>;
  addContact: (contact: Contact) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
}

export const useContactsStore = create<ContactsState>((set) => ({
  contacts: [],

  // Cargar todos los contactos desde IndexedDB
  loadContacts: async () => {
    const all = await db.contacts.toArray();
    const normalized = all.map((c) => {
      const fullName = c.fullName ?? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
      const nameParts = fullName.split(" ").filter(Boolean);
      const types = Array.isArray(c.types)
        ? c.types.filter(
            (t) =>
              t === "member" ||
              t === "provider" ||
              t === "collaborator"
          )
        : [];
      return {
        ...c,
        firstName: c.firstName ?? nameParts[0] ?? "",
        lastName: c.lastName ?? nameParts.slice(1).join(" "),
        dni: c.dni ?? "",
        fullName,
        types,
      };
    });
    set({ contacts: normalized });
  },

  // Crear o actualizar contacto (UPSERT)
  addContact: async (contact) => {
    const fullName =
      contact.fullName ??
      `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();
    const normalized = {
      ...contact,
      fullName,
      types: contact.types.filter(
        (t) =>
          t === "member" || t === "provider" || t === "collaborator"
      ),
    };
    await db.contacts.put(normalized);

    set((state) => {
      const exists = state.contacts.some(
        (c) => c.id === contact.id
      );

      return {
        contacts: exists
          ? state.contacts.map((c) =>
              c.id === contact.id ? normalized : c
            )
          : [...state.contacts, normalized],
      };
    });
  },

  // Eliminar contacto
  removeContact: async (id) => {
    await db.contacts.delete(id);

    set((state) => ({
      contacts: state.contacts.filter((c) => c.id !== id),
    }));
  },
}));
