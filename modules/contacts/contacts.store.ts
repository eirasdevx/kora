import { create } from "zustand";
import { Contact, ContactKind, ContactType } from "./contact.types";
import { db } from "@/core/storage/kora.db";
import { useSessionStore } from "@/core/session/session.store";
import { useNotificationsStore } from "@/core/notifications/notifications.store";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import { Transaction } from "@/modules/accounting/transaction.types";
import { resolveFeeCycle } from "@/modules/people/people.utils";

interface ContactsState {
  contacts: Contact[];

  loadContacts: () => Promise<void>;
  addContact: (contact: Contact) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  resetContacts: () => void;
}

const isAuthenticated = () =>
  useSessionStore.getState().mode === "authenticated";

const MEMBERSHIP_FEE_AMOUNT: Record<"Mensual" | "Anual", number> = {
  Mensual: 25,
  Anual: 250,
};

const buildTransactionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getContactDisplayName = (contact: Contact) => {
  const composed = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();
  return composed || contact.fullName || contact.email || "contacto";
};

const hasMembershipTransaction = async (contactId: string) => {
  const inMemory = useTransactionsStore
    .getState()
    .transactions.some(
      (tx) =>
        tx.category === "membership" &&
        (tx.contactId === contactId || tx.contactIds?.includes(contactId))
    );

  if (inMemory) return true;
  if (!isAuthenticated()) return false;

  const persisted = await db.transactions.toArray();
  return persisted.some(
    (tx) =>
      tx.category === "membership" &&
      (tx.contactId === contactId || tx.contactIds?.includes(contactId))
  );
};

const createPendingMembershipTransaction = (contact: Contact): Transaction => {
  const cycle = resolveFeeCycle(contact.id);
  const displayName = getContactDisplayName(contact);
  const createdAt = new Date().toISOString();
  const txDate = (contact.createdAt || createdAt).slice(0, 10);

  return {
    id: buildTransactionId(),
    type: "income",
    amount: MEMBERSHIP_FEE_AMOUNT[cycle],
    date: txDate,
    concept: `Cuota ${cycle.toLowerCase()} pendiente`,
    description: `Generada automaticamente al registrar al socio ${displayName}.`,
    category: "membership",
    status: "pending",
    contactId: contact.id,
    contactIds: [contact.id],
    createdAt,
  };
};

const registerPendingMembershipTransaction = async (contact: Contact) => {
  const exists = await hasMembershipTransaction(contact.id);
  if (exists) return;

  const transaction = createPendingMembershipTransaction(contact);

  if (isAuthenticated()) {
    await db.transactions.put(transaction);
  }

  useTransactionsStore.setState((state) => ({
    transactions: [...state.transactions, transaction],
  }));

  const cycle = resolveFeeCycle(contact.id);
  useNotificationsStore.getState().addNotification({
    category: "payments",
    title: "Cuota pendiente generada",
    description: `Se genero una cuota ${cycle.toLowerCase()} pendiente para ${getContactDisplayName(contact)}.`,
    href: "/finance",
    actionLabel: "Ver cuotas",
    icon: "schedule",
    tone: "bg-amber-50 text-amber-600",
  });
};

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
    const previousContact = get().contacts.find((c) => c.id === contact.id);
    const exists = Boolean(previousContact);
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
    const wasMember = previousContact?.types.includes("member") ?? false;
    const isMember = normalized.types.includes("member");
    const shouldCreatePendingMembership = isMember && !wasMember;

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
      if (shouldCreatePendingMembership) {
        await registerPendingMembershipTransaction(normalized);
      }
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

    if (shouldCreatePendingMembership) {
      await registerPendingMembershipTransaction(normalized);
    }
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
