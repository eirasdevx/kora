import { create } from "zustand";
import {
  getAssociationMembershipSettings,
  getContactMembershipPlan,
  getDefaultMembershipPlan,
} from "@/core/session/membership-settings";
import { normalizeContactPrivacyPermissions } from "./contact-privacy";
import { Contact, ContactKind, ContactType } from "./contact.types";
import { db } from "@/core/storage/kora.db";
import {
  getActiveAssociationId,
  getAssociationScopedRecords,
  withActiveAssociation,
} from "@/core/storage/association-scope";
import { useSessionStore } from "@/core/session/session.store";
import { useNotificationsStore } from "@/core/notifications/notifications.store";
import {
  deleteAssociationModuleRecord,
  listAssociationModuleRecords,
  upsertAssociationModuleRecord,
} from "@/lib/client/association-data-client";
import {
  createMembershipTransaction,
  getContactDisplayName,
} from "@/modules/accounting/membership-fees";
import {
  ensureContactAccountingCode,
  ensureTransactionAccountingCode,
  hydrateContactsWithAccountingCodes,
} from "@/modules/accounting/accounting-codes";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import type { Transaction } from "@/modules/accounting/transaction.types";

interface ContactsState {
  contacts: Contact[];

  loadContacts: () => Promise<void>;
  addContact: (contact: Contact) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  resetContacts: () => void;
}

const isAuthenticated = () =>
  useSessionStore.getState().mode === "authenticated";

const getDefaultMembershipPlanId = () =>
  getDefaultMembershipPlan(
    getAssociationMembershipSettings(useSessionStore.getState().association)
  ).id;

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

  try {
    const persisted =
      await listAssociationModuleRecords<Transaction>("transactions");

    return persisted.some(
      (tx) =>
        tx.category === "membership" &&
        (tx.contactId === contactId || tx.contactIds?.includes(contactId))
    );
  } catch (error) {
    console.error(error);
    const persisted = await db.transactions.toArray();
    const { scopedRecords } = getAssociationScopedRecords(
      persisted,
      getActiveAssociationId()
    );

    return scopedRecords.some(
      (tx) =>
        tx.category === "membership" &&
        (tx.contactId === contactId || tx.contactIds?.includes(contactId))
    );
  }
};

const registerPendingMembershipTransaction = async (contact: Contact) => {
  const exists = await hasMembershipTransaction(contact.id);
  if (exists) return;

  const association = useSessionStore.getState().association;
  const plan = getContactMembershipPlan(contact, association);
  const transaction = ensureTransactionAccountingCode(
    createMembershipTransaction({
      contact,
      status: "pending",
      description: `Generada automáticamente al registrar al socio ${getContactDisplayName(contact)}.`,
    }),
    association
  );

  if (isAuthenticated()) {
    await upsertAssociationModuleRecord<Transaction>(
      "transactions",
      transaction
    );
    await db.transactions.put(transaction);
  }

  useTransactionsStore.setState((state) => ({
    transactions: [...state.transactions, transaction],
  }));

  useNotificationsStore.getState().addNotification({
    category: "payments",
    title: "Cuota pendiente generada",
    description: `Se generó una cuota pendiente del plan ${plan.name} para ${getContactDisplayName(contact)}.`,
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

const parseStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],

  // Cargar todos los contactos desde IndexedDB
  loadContacts: async () => {
    if (!isAuthenticated()) return;
    const hydratePersistedContacts = async (sourceContacts: Contact[]) => {
      const normalized = sourceContacts.map((c) => {
        const fullName =
          c.fullName ? `${c.firstName ? ""} ${c.lastName ? ""}`.trim();
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
        const createdAt = c.createdAt ? new Date().toISOString();
        const membershipPlanId = types.includes("member")
          ? c.membershipPlanId ? getDefaultMembershipPlanId()
          : undefined;
        const privacyPermissions = normalizeContactPrivacyPermissions(
          c.privacyPermissions
        );
        const consentDocumentIds = parseStringList(
          (c as { consentDocumentIds?: unknown }).consentDocumentIds
        );
        return {
          ...c,
          kind,
          birthDate: kind === "person" ? c.birthDate ? undefined : undefined,
          firstName: c.firstName ? nameParts[0] ? "",
          lastName: c.lastName ? nameParts.slice(1).join(" "),
          dni: c.dni ? "",
          fullName,
          types,
          membershipPlanId,
          privacyPermissions,
          privacyUpdatedAt: c.privacyUpdatedAt ? undefined,
          consentDocumentIds: consentDocumentIds.length
            ? consentDocumentIds
            : undefined,
          createdAt,
          deactivatedAt: c.deactivatedAt ? undefined,
        };
      });
      const hydratedContacts = hydrateContactsWithAccountingCodes(
        normalized as Contact[]
      );
      set({ contacts: hydratedContacts });
    };

    try {
      const contacts =
        await listAssociationModuleRecords<Contact>("contacts");
      await hydratePersistedContacts(contacts);
      return;
    } catch (error) {
      console.error(error);
    }

    const all = await db.contacts.toArray();
    const { scopedRecords, migratedRecords } = getAssociationScopedRecords(
      all,
      getActiveAssociationId()
    );
    const normalized = scopedRecords.map((c) => {
      const fullName = c.fullName ? `${c.firstName ? ""} ${c.lastName ? ""}`.trim();
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
      const createdAt = c.createdAt ? new Date().toISOString();
      const membershipPlanId = types.includes("member")
        ? c.membershipPlanId ? getDefaultMembershipPlanId()
        : undefined;
      const privacyPermissions = normalizeContactPrivacyPermissions(
        c.privacyPermissions
      );
      const consentDocumentIds = parseStringList(
        (c as { consentDocumentIds?: unknown }).consentDocumentIds
      );
      return {
        ...c,
        kind,
        birthDate: kind === "person" ? c.birthDate ? undefined : undefined,
        firstName: c.firstName ? nameParts[0] ? "",
        lastName: c.lastName ? nameParts.slice(1).join(" "),
        dni: c.dni ? "",
        fullName,
        types,
        membershipPlanId,
        privacyPermissions,
        privacyUpdatedAt: c.privacyUpdatedAt ? undefined,
        consentDocumentIds: consentDocumentIds.length
          ? consentDocumentIds
          : undefined,
        createdAt,
        deactivatedAt: c.deactivatedAt ? undefined,
      };
    });
    const hydratedContacts = hydrateContactsWithAccountingCodes(normalized as Contact[]);
    const shouldBackfill = hydratedContacts.some((contact, index) => {
      const source = normalized[index] as Contact;
      return (
        contact.accountingAccountType !== source.accountingAccountType ||
        contact.accountingAccountCode !== source.accountingAccountCode ||
        contact.accountingAccountLabel !== source.accountingAccountLabel ||
        contact.privacyPermissions?.image !== source.privacyPermissions?.image ||
        contact.privacyPermissions?.voice !== source.privacyPermissions?.voice ||
        contact.privacyPermissions?.communications !==
          source.privacyPermissions?.communications ||
        contact.privacyPermissions?.services !==
          source.privacyPermissions?.services ||
        (contact.consentDocumentIds ? []).join(",") !==
          (source.consentDocumentIds ? []).join(",")
      );
    });

    if (shouldBackfill || migratedRecords.length > 0) {
      await db.contacts.bulkPut(hydratedContacts);
    }

    set({ contacts: hydratedContacts });
  },

  // Crear o actualizar contacto (UPSERT)
  addContact: async (contact) => {
    const previousContact = get().contacts.find((c) => c.id === contact.id);
    const exists = Boolean(previousContact);
    const fullName =
      contact.fullName ?
      `${contact.firstName ? ""} ${contact.lastName ? ""}`.trim();
    const displayName = fullName || contact.email || "contacto";
    const kind: ContactKind = contact.kind === "entity" ? "entity" : "person";
    const allowedTypes =
      kind === "entity"
        ? ["provider", "collaborator", "sponsor", "other"]
        : ["member", "provider", "collaborator", "sponsor", "other"];
    const rawTypes = parseContactTypes(
      (contact as { types?: unknown }).types
    );
    const types = rawTypes.filter((t) =>
      allowedTypes.includes(t as ContactType)
    );
    const baseContact = {
      ...contact,
      kind,
      associationId: contact.associationId,
      fullName,
      birthDate: kind === "person" ? contact.birthDate ? undefined : undefined,
      types,
      membershipPlanId: types.includes("member")
        ? contact.membershipPlanId ? getDefaultMembershipPlanId()
        : undefined,
      privacyPermissions: normalizeContactPrivacyPermissions(
        contact.privacyPermissions ? previousContact?.privacyPermissions
      ),
      privacyUpdatedAt:
        contact.privacyUpdatedAt ? previousContact?.privacyUpdatedAt,
      consentDocumentIds: parseStringList(
        contact.consentDocumentIds ? previousContact?.consentDocumentIds
      ),
      createdAt: contact.createdAt ? new Date().toISOString(),
      deactivatedAt: contact.deactivatedAt ? undefined,
    };
    const normalized = ensureContactAccountingCode(
      withActiveAssociation(baseContact),
      get().contacts
    );
    const wasMember = previousContact?.types.includes("member") ? false;
    const isMember = normalized.types.includes("member");
    const shouldCreatePendingMembership = isMember && !wasMember;

    if (!isAuthenticated()) {
      set((state) => {
        const exists = state.contacts.some((c) => c.id === contact.id);
        const nextContacts = exists
          ? state.contacts.map((c) => (c.id === contact.id ? normalized : c))
          : [...state.contacts, normalized];

        return {
          contacts: hydrateContactsWithAccountingCodes(nextContacts),
        };
      });
      useNotificationsStore.getState().addNotification({
        category: "members",
        title: exists ? "Contacto actualizado" : "Nuevo contacto creado",
        description: exists
          ? `Se actualizó el contacto ${displayName}.`
          : `Se creó el contacto ${displayName}.`,
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

    await upsertAssociationModuleRecord<Contact>("contacts", normalized);
    await db.contacts.put(normalized);

    set((state) => {
      const exists = state.contacts.some((c) => c.id === contact.id);
      const nextContacts = exists
        ? state.contacts.map((c) => (c.id === contact.id ? normalized : c))
        : [...state.contacts, normalized];

      return {
        contacts: hydrateContactsWithAccountingCodes(nextContacts),
      };
    });

    useNotificationsStore.getState().addNotification({
      category: "members",
      title: exists ? "Contacto actualizado" : "Nuevo contacto creado",
      description: exists
        ? `Se actualizó el contacto ${displayName}.`
        : `Se creó el contacto ${displayName}.`,
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
          ? `Se eliminó el contacto ${target.fullName}.`
          : "Se eliminó un contacto.",
        href: "/people",
        actionLabel: "Ver contactos",
        icon: "person_remove",
        tone: "bg-rose-50 text-rose-600",
      });
      return;
    }
    await deleteAssociationModuleRecord("contacts", id);
    await db.contacts.delete(id);

    set((state) => ({
      contacts: state.contacts.filter((c) => c.id !== id),
    }));

    useNotificationsStore.getState().addNotification({
      category: "members",
      title: "Contacto eliminado",
      description: target?.fullName
        ? `Se eliminó el contacto ${target.fullName}.`
        : "Se eliminó un contacto.",
      href: "/people",
      actionLabel: "Ver contactos",
      icon: "person_remove",
      tone: "bg-rose-50 text-rose-600",
    });
  },

  resetContacts: () => set({ contacts: [] }),
}));
