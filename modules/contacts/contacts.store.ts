import { create } from "zustand";
import { Contact } from "./contact.types";
import { db } from "@/core/storage/kora.db";
import { useSessionStore } from "@/core/session/session.store";

interface ContactsState {
  contacts: Contact[];

  loadContacts: () => Promise<void>;
  addContact: (contact: Contact) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  resetContacts: () => void;
}

const isAuthenticated = () =>
  useSessionStore.getState().mode === "authenticated";

export const useContactsStore = create<ContactsState>((set) => ({
  contacts: [],

  // Cargar todos los contactos desde IndexedDB
  loadContacts: async () => {
    if (!isAuthenticated()) return;
    const all = await db.contacts.toArray();
    const normalized = all.map((c) => {
      const fullName = c.fullName ?? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
      const nameParts = fullName.split(" ").filter(Boolean);
      const kind = c.kind === "entity" ? "entity" : "person";
      const allowedTypes =
        kind === "entity" ? ["provider", "collaborator"] : ["member", "provider", "collaborator"];
      const types = Array.isArray(c.types)
        ? c.types.filter(
            (t) =>
              allowedTypes.includes(t as "member" | "provider" | "collaborator")
          )
        : [];
      const createdAt = c.createdAt ?? new Date().toISOString();
      return {
        ...c,
        kind,
        birthDate: kind === "person" ? c.birthDate ?? undefined : undefined,
        firstName: c.firstName ?? nameParts[0] ?? "",
        lastName: c.lastName ?? nameParts.slice(1).join(" "),
        dni: c.dni ?? "",
        fullName,
        types,
        createdAt,
        deactivatedAt: c.deactivatedAt ?? undefined,
      };
    });
    set({ contacts: normalized });
  },

  // Crear o actualizar contacto (UPSERT)
  addContact: async (contact) => {
    const fullName =
      contact.fullName ??
      `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();
    const kind = contact.kind === "entity" ? "entity" : "person";
    const allowedTypes =
      kind === "entity" ? ["provider", "collaborator"] : ["member", "provider", "collaborator"];
    const normalized = {
      ...contact,
      kind,
      fullName,
      birthDate: kind === "person" ? contact.birthDate ?? undefined : undefined,
      types: contact.types.filter(
        (t) =>
          allowedTypes.includes(t as "member" | "provider" | "collaborator")
      ),
      createdAt: contact.createdAt ?? new Date().toISOString(),
      deactivatedAt: contact.deactivatedAt ?? undefined,
    };
    if (!isAuthenticated()) {
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
      return;
    }

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
    if (!isAuthenticated()) {
      set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== id),
      }));
      return;
    }
    await db.contacts.delete(id);

    set((state) => ({
      contacts: state.contacts.filter((c) => c.id !== id),
    }));
  },

  resetContacts: () => set({ contacts: [] }),
}));
