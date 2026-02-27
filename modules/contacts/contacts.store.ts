import { create } from "zustand";
import { Contact, ContactKind, ContactType } from "./contact.types";
import { db } from "@/core/storage/kora.db";
import { useSessionStore } from "@/core/session/session.store";
import { useNotificationsStore } from "@/core/notifications/notifications.store";

interface ContactsState {
  contacts: Contact[];

  loadContacts: () => Promise<void>;
  addContact: (contact: Contact) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  resetContacts: () => void;
}

const isAuthenticated = () =>
  useSessionStore.getState().mode === "authenticated";

const parseContactTypes = (value: unknown): ContactType[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is ContactType => typeof item === "string");
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean) as ContactType[];
  }
  return [];
};

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],

  // Cargar todos los contactos desde IndexedDB
  loadContacts: async () => {
    if (!isAuthenticated()) return;
    const all = await db.contacts.toArray();
    const normalized = all.map((c) => {
      const fullName = c.fullName ?? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
      const nameParts = fullName.split(" ").filter(Boolean);
      const kind: ContactKind = c.kind === "entity" ? "entity" : "person";
      const allowedTypes =
        kind === "entity"
          ? ["provider", "collaborator", "sponsor", "other"]
          : ["member", "provider", "collaborator", "sponsor", "other"];
      const rawTypes = parseContactTypes(
        (c as { types?: unknown }).types
      );
      const types = rawTypes.filter((t) =>
        allowedTypes.includes(t as ContactType)
      );
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
    set({ contacts: normalized as Contact[] });
  },

  // Crear o actualizar contacto (UPSERT)
  addContact: async (contact) => {
    const exists = get().contacts.some((c) => c.id === contact.id);
    const fullName =
      contact.fullName ??
      `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();
    const displayName = fullName || contact.email || "contacto";
    const kind: ContactKind = contact.kind === "entity" ? "entity" : "person";
    const allowedTypes =
      kind === "entity"
        ? ["provider", "collaborator", "sponsor", "other"]
        : ["member", "provider", "collaborator", "sponsor", "other"];
    const rawTypes = parseContactTypes(
      (contact as { types?: unknown }).types
    );
    const normalized = {
      ...contact,
      kind,
      fullName,
      birthDate: kind === "person" ? contact.birthDate ?? undefined : undefined,
      types: rawTypes.filter((t) =>
        allowedTypes.includes(t as ContactType)
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
      useNotificationsStore.getState().addNotification({
        category: "members",
        title: exists ? "Contacto actualizado" : "Nuevo contacto creado",
        description: exists
          ? `Se actualizo el contacto ${displayName}.`
          : `Se creo el contacto ${displayName}.`,
        href: "/people",
        actionLabel: "Ver perfil",
        icon: exists ? "edit" : "person_add",
        tone: exists ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600",
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

    useNotificationsStore.getState().addNotification({
      category: "members",
      title: exists ? "Contacto actualizado" : "Nuevo contacto creado",
      description: exists
        ? `Se actualizo el contacto ${displayName}.`
        : `Se creo el contacto ${displayName}.`,
      href: "/people",
      actionLabel: "Ver perfil",
      icon: exists ? "edit" : "person_add",
      tone: exists ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600",
    });
  },

  // Eliminar contacto
  removeContact: async (id) => {
    const target = get().contacts.find((c) => c.id === id);
    if (!isAuthenticated()) {
      set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== id),
      }));
      useNotificationsStore.getState().addNotification({
        category: "members",
        title: "Contacto eliminado",
        description: target?.fullName
          ? `Se elimino el contacto ${target.fullName}.`
          : "Se elimino un contacto.",
        href: "/people",
        actionLabel: "Ver contactos",
        icon: "person_remove",
        tone: "bg-rose-50 text-rose-600",
      });
      return;
    }
    await db.contacts.delete(id);

    set((state) => ({
      contacts: state.contacts.filter((c) => c.id !== id),
    }));

    useNotificationsStore.getState().addNotification({
      category: "members",
      title: "Contacto eliminado",
      description: target?.fullName
        ? `Se elimino el contacto ${target.fullName}.`
        : "Se elimino un contacto.",
      href: "/people",
      actionLabel: "Ver contactos",
      icon: "person_remove",
      tone: "bg-rose-50 text-rose-600",
    });
  },

  resetContacts: () => set({ contacts: [] }),
}));
