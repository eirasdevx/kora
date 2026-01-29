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
    set({ contacts: all });
  },

  // Crear o actualizar contacto (UPSERT)
  addContact: async (contact) => {
    await db.contacts.put(contact);

    set((state) => {
      const exists = state.contacts.some(
        (c) => c.id === contact.id
      );

      return {
        contacts: exists
          ? state.contacts.map((c) =>
              c.id === contact.id ? contact : c
            )
          : [...state.contacts, contact],
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
