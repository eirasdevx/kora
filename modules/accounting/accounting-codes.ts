import {
  getAccountingAccountByKey,
  getAssociationAccountingSettings,
  getTransactionAccountingAccountKey,
  type AccountingAccountKey,
} from "@/core/session/accounting-settings";
import type { Contact, ContactType } from "@/modules/contacts/contact.types";
import type { Transaction } from "@/modules/accounting/transaction.types";

type ContactAccountingTemplate = {
  type: ContactType;
  prefix: string;
  label: string;
};

const CONTACT_ACCOUNTING_PRIORITY: ContactType[] = [
  "member",
  "provider",
  "collaborator",
  "sponsor",
  "other",
];

const CONTACT_ACCOUNTING_TEMPLATES: Record<ContactType, ContactAccountingTemplate> = {
  member: {
    type: "member",
    prefix: "430",
    label: "Socios deudores",
  },
  provider: {
    type: "provider",
    prefix: "400",
    label: "Proveedores",
  },
  collaborator: {
    type: "collaborator",
    prefix: "410",
    label: "Acreedores colaboradores",
  },
  sponsor: {
    type: "sponsor",
    prefix: "440",
    label: "Patrocinadores y deudores",
  },
  other: {
    type: "other",
    prefix: "449",
    label: "Otros deudores y acreedores",
  },
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getContactDisplayName(contact: Pick<Contact, "fullName" | "firstName" | "lastName" | "email">) {
  return (
    normalizeText(contact.fullName) ||
    `${normalizeText(contact.firstName)} ${normalizeText(contact.lastName)}`.trim() ||
    normalizeText(contact.email) ||
    "Contacto"
  );
}

function extractAccountingSequence(code: string, prefix: string) {
  if (!code.startsWith(prefix)) return null;
  const rawSequence = code.slice(prefix.length);
  const numeric = Number(rawSequence);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;
  return numeric;
}

export function getPrimaryContactAccountingType(types: ContactType[]) {
  return (
    CONTACT_ACCOUNTING_PRIORITY.find((type) => types.includes(type)) ? "other"
  );
}

export function getContactAccountingTemplate(type: ContactType) {
  return CONTACT_ACCOUNTING_TEMPLATES[type];
}

function buildContactAccountingLabel(
  template: ContactAccountingTemplate,
  contact: Pick<Contact, "fullName" | "firstName" | "lastName" | "email">
) {
  return `${template.label} · ${getContactDisplayName(contact)}`;
}

function buildNextContactAccountingCode(
  template: ContactAccountingTemplate,
  contacts: Contact[],
  currentContactId?: string
) {
  const maxSequence = contacts.reduce((max, contact) => {
    if (contact.id === currentContactId) return max;

    const type =
      contact.accountingAccountType && contact.types.includes(contact.accountingAccountType)
        ? contact.accountingAccountType
        : getPrimaryContactAccountingType(contact.types);

    if (type !== template.type) return max;

    const sequence = extractAccountingSequence(
      normalizeText(contact.accountingAccountCode),
      template.prefix
    );

    return sequence ? Math.max(max, sequence) : max;
  }, 0);

  return `${template.prefix}${String(maxSequence + 1).padStart(4, "0")}`;
}

export function ensureContactAccountingCode(
  contact: Contact,
  contacts: Contact[]
): Contact {
  const accountingAccountType = getPrimaryContactAccountingType(contact.types);
  const template = getContactAccountingTemplate(accountingAccountType);
  const existingCode = normalizeText(contact.accountingAccountCode);
  const validExistingCode =
    existingCode && extractAccountingSequence(existingCode, template.prefix);

  return {
    ...contact,
    accountingAccountType,
    accountingAccountCode:
      validExistingCode
        ? existingCode
        : buildNextContactAccountingCode(template, contacts, contact.id),
    accountingAccountLabel: buildContactAccountingLabel(template, contact),
  };
}

export function hydrateContactsWithAccountingCodes(contacts: Contact[]) {
  const ordered = [...contacts].sort((a, b) => {
    const byCreatedAt =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (byCreatedAt !== 0) return byCreatedAt;
    return a.id.localeCompare(b.id, "es");
  });

  const assigned = ordered.reduce<Contact[]>((acc, contact) => {
    const normalized = ensureContactAccountingCode(contact, acc);
    acc.push(normalized);
    return acc;
  }, []);

  const assignedById = new Map(assigned.map((contact) => [contact.id, contact]));
  return contacts.map((contact) => assignedById.get(contact.id) ? contact);
}

function normalizeAccountingAccountKey(
  value: unknown,
  fallback: AccountingAccountKey
) {
  const normalized = normalizeText(value);
  return normalized ? (normalized as AccountingAccountKey) : fallback;
}

export function ensureTransactionAccountingCode(
  transaction: Transaction,
  association:
    | { accountingSettings?: unknown }
    | null
    | undefined
) {
  const fallbackKey = getTransactionAccountingAccountKey(
    transaction.category,
    transaction.type
  );
  const accountingAccountKey = normalizeAccountingAccountKey(
    transaction.accountingAccountKey,
    fallbackKey
  );
  const accountingSettings = getAssociationAccountingSettings(association);
  const account = getAccountingAccountByKey(accountingSettings, accountingAccountKey);

  return {
    ...transaction,
    accountingAccountKey,
    accountCode: account.code,
    accountLabel: account.label,
  };
}
