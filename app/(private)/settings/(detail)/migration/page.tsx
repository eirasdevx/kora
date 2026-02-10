"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageTopbar from "@/components/PageTopbar";
import { db } from "@/core/storage/kora.db";
import {
  type AssociationProfile,
  type AssociationRepresentative,
  useSessionStore,
} from "@/core/session/session.store";
import type { Contact, ContactType } from "@/modules/contacts/contact.types";
import type { Event, EventStatus } from "@/modules/events/event.types";
import type {
  Transaction,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
} from "@/modules/accounting/transaction.types";
import type { SocialPost, SocialPostStatus } from "@/modules/social/social.types";

type DataScope =
  | "all"
  | "associationProfile"
  | "contacts"
  | "events"
  | "transactions"
  | "socialPosts";

type DataFormat = "json" | "csv";

type ImportMode = "merge" | "replace";

type KoraExportPayloadV1 = {
  version: 1;
  exportedAt: string;
  associationProfile: AssociationProfile | null;
  contacts: Contact[];
  events: Event[];
  transactions: Transaction[];
  socialPosts: SocialPost[];
};

const CONTACT_TYPES: ContactType[] = ["member", "provider", "collaborator"];
const EVENT_STATUSES: EventStatus[] = ["draft", "published"];
const TRANSACTION_TYPES: TransactionType[] = ["income", "expense"];
const TRANSACTION_CATEGORIES: TransactionCategory[] = [
  "membership",
  "installations",
  "events",
  "subsidies",
  "other",
];
const TRANSACTION_STATUSES: TransactionStatus[] = ["completed", "pending"];
const SOCIAL_POST_STATUSES: SocialPostStatus[] = [
  "draft",
  "scheduled",
  "published",
];

const ASSOCIATION_PROFILE_COLUMNS = [
  "name",
  "taxId",
  "contactEmail",
  "phone",
  "location",
  "address",
  "representatives",
] as const;

const CONTACTS_COLUMNS = [
  "id",
  "firstName",
  "lastName",
  "dni",
  "fullName",
  "email",
  "phone",
  "secondaryPhone",
  "website",
  "socialLinks",
  "postalCode",
  "address",
  "city",
  "region",
  "photoUrl",
  "types",
  "tags",
  "notes",
  "createdAt",
] as const;

const EVENTS_COLUMNS = [
  "id",
  "title",
  "description",
  "category",
  "status",
  "startDate",
  "endDate",
  "location",
  "locationType",
  "ticketPrice",
  "capacity",
  "registrationDeadline",
  "waitlistEnabled",
  "participantIds",
  "organizerIds",
  "createdAt",
] as const;

const TRANSACTIONS_COLUMNS = [
  "id",
  "type",
  "amount",
  "date",
  "concept",
  "description",
  "paymentMethod",
  "category",
  "status",
  "eventId",
  "contactId",
  "createdAt",
] as const;

const SOCIAL_POSTS_COLUMNS = [
  "id",
  "content",
  "channels",
  "status",
  "mediaUrls",
  "scheduledAt",
  "createdAt",
] as const;

function safeString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
}

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ensureId(id: unknown) {
  const value = safeString(id).trim();
  return value || createId();
}

function splitList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => safeString(v).trim()).filter(Boolean);
  }
  const raw = safeString(value).trim();
  if (!raw) return [];
  return raw
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseNumber(value: unknown): number | undefined {
  const raw = safeString(value).trim();
  if (!raw) return undefined;
  const normalized =
    raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
  const raw = safeString(value).trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === "true" || raw === "1" || raw === "sí" || raw === "si") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return undefined;
}

function normalizeRepresentativeEntry(
  value: unknown
): AssociationRepresentative | null {
  if (!value) return null;
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;
    const [role, name, email, phone] = raw
      .split("|")
      .map((part) => part.trim());
    if (!role && !name && !email && !phone) return null;
    return {
      id: createId(),
      role,
      name,
      email: email || undefined,
      phone: phone || undefined,
    };
  }
  if (typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const role =
    safeString(obj.role).trim() ||
    safeString(obj.position).trim() ||
    safeString(obj.title).trim();
  const name =
    safeString(obj.name).trim() ||
    safeString(obj.fullName).trim() ||
    safeString(obj.contactName).trim();
  const email = safeString(obj.email).trim();
  const phone = safeString(obj.phone).trim();
  const id = safeString(obj.id).trim() || createId();
  if (!role && !name && !email && !phone) return null;
  return {
    id,
    role,
    name,
    email: email || undefined,
    phone: phone || undefined,
  };
}

function normalizeRepresentatives(value: unknown): AssociationRepresentative[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeRepresentativeEntry(entry))
      .filter((entry): entry is AssociationRepresentative => !!entry);
  }
  if (typeof value === "string") {
    return value
      .split(";")
      .map((entry) => normalizeRepresentativeEntry(entry))
      .filter((entry): entry is AssociationRepresentative => !!entry);
  }
  const entry = normalizeRepresentativeEntry(value);
  return entry ? [entry] : [];
}

function serializeRepresentativesForCsv(
  representatives: AssociationRepresentative[] | undefined
) {
  if (!representatives || representatives.length === 0) return "";
  return representatives
    .map((rep) => {
      const role = safeString(rep.role).trim();
      const name = safeString(rep.name).trim();
      const email = safeString(rep.email).trim();
      const phone = safeString(rep.phone).trim();
      const fields = [role, name, email, phone];
      const hasData = fields.some((value) => value.length > 0);
      return hasData ? fields.join("|") : "";
    })
    .filter((entry) => entry.length > 0)
    .join(";");
}

function normalizeAssociationProfile(value: unknown): AssociationProfile | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const name =
    safeString(obj.name).trim() ||
    safeString(obj.associationName).trim() ||
    safeString(obj.legalName).trim();
  if (!name) return null;

  const taxId =
    safeString(obj.taxId).trim() ||
    safeString(obj.nif).trim() ||
    safeString(obj.cif).trim() ||
    safeString(obj.vatId).trim();

  const contactEmail =
    safeString(obj.contactEmail).trim() || safeString(obj.email).trim();

  const phone = safeString(obj.phone).trim();

  let location = safeString(obj.location).trim();
  let address = safeString(obj.address).trim();

  if (!address && obj.address && typeof obj.address === "object") {
    const addr = obj.address as Record<string, unknown>;
    const street = safeString(addr.street).trim();
    const postalCode = safeString(addr.postalCode).trim();
    const city = safeString(addr.city).trim();
    const country = safeString(addr.country).trim();

    address = [street, postalCode, city, country].filter(Boolean).join(", ");
    if (!location) location = city || country;
  }

  const representatives = normalizeRepresentatives(
    obj.representatives ?? obj.boardMembers ?? obj.committee
  );

  return {
    name,
    taxId: taxId || undefined,
    contactEmail: contactEmail || undefined,
    phone: phone || undefined,
    location: location || undefined,
    address: address || undefined,
    representatives: representatives.length ? representatives : undefined,
  };
}

function normalizeContact(value: unknown): Contact | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  const fullNameRaw = safeString(obj.fullName).trim() || safeString(obj.name).trim();

  let firstName = safeString(obj.firstName).trim();
  let lastName = safeString(obj.lastName).trim();

  if ((!firstName || !lastName) && fullNameRaw) {
    const parts = fullNameRaw.split(" ").filter(Boolean);
    if (!firstName) firstName = parts[0] ?? "";
    if (!lastName) lastName = parts.slice(1).join(" ");
  }

  const dni =
    safeString(obj.dni).trim() ||
    safeString(obj.nationalId).trim() ||
    safeString(obj.document).trim();

  const types = splitList(obj.types).filter((t): t is ContactType =>
    CONTACT_TYPES.includes(t as ContactType)
  );

  const role = safeString(obj.role).trim().toLowerCase();
  const inferredType = CONTACT_TYPES.includes(role as ContactType)
    ? (role as ContactType)
    : undefined;
  const normalizedTypes: ContactType[] =
    types.length > 0
      ? types
      : inferredType
        ? [inferredType]
        : role
          ? ["member"]
          : [];

  const tagsFromInput =
    obj.tags == null
      ? []
      : splitList(obj.tags).map((t) => t.trim()).filter(Boolean);
  const tags = [...tagsFromInput];
  if (role && role !== "member" && !tags.includes(role)) tags.push(role);

  return {
    id: ensureId(obj.id),
    firstName,
    lastName,
    dni,
    fullName: fullNameRaw || undefined,
    email: safeString(obj.email) || undefined,
    phone: safeString(obj.phone) || undefined,
    secondaryPhone: safeString(obj.secondaryPhone) || undefined,
    website: safeString(obj.website) || undefined,
    socialLinks: safeString(obj.socialLinks) || undefined,
    postalCode: safeString(obj.postalCode) || undefined,
    address: safeString(obj.address) || undefined,
    city: safeString(obj.city) || undefined,
    region: safeString(obj.region) || undefined,
    photoUrl: safeString(obj.photoUrl) || undefined,
    types: normalizedTypes,
    tags: tags.length ? tags : undefined,
    notes: safeString(obj.notes) || undefined,
    createdAt: safeString(obj.createdAt) || safeString(obj.joinedAt) || nowIso(),
  };
}

function normalizeEvent(value: unknown): Event | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const title = safeString(obj.title).trim();
  const startDate = safeString(obj.startDate).trim();
  if (!title || !startDate) return null;

  const statusRaw = safeString(obj.status).trim().toLowerCase();
  let status: EventStatus | undefined;

  if (EVENT_STATUSES.includes(statusRaw as EventStatus)) {
    status = statusRaw as EventStatus;
  } else if (statusRaw === "confirmed" || statusRaw === "confirmado") {
    status = "published";
  } else if (statusRaw === "planned" || statusRaw === "planificado") {
    status = "draft";
  }

  const locationTypeRaw = safeString(obj.locationType).trim();
  const locationType: "onsite" | "online" | undefined =
    locationTypeRaw === "onsite" || locationTypeRaw === "online"
      ? (locationTypeRaw as "onsite" | "online")
      : undefined;

  const participantIdsRaw = splitList(obj.participantIds);
  const organizerIdsRaw = splitList(obj.organizerIds);

  return {
    id: ensureId(obj.id),
    title,
    description: safeString(obj.description) || undefined,
    category: safeString(obj.category) || undefined,
    status,
    startDate,
    endDate: safeString(obj.endDate) || undefined,
    location: safeString(obj.location) || undefined,
    locationType,
    ticketPrice: parseNumber(obj.ticketPrice),
    capacity: parseNumber(obj.capacity),
    registrationDeadline: safeString(obj.registrationDeadline) || undefined,
    waitlistEnabled: parseBoolean(obj.waitlistEnabled),
    participantIds: participantIdsRaw.length
      ? participantIdsRaw
      : splitList(obj.participants),
    organizerIds: organizerIdsRaw.length ? organizerIdsRaw : splitList(obj.organizers),
    createdAt: safeString(obj.createdAt) || nowIso(),
  };
}

function normalizeTransaction(value: unknown): Transaction | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  const typeRaw = safeString(obj.type).trim();
  const type: TransactionType = TRANSACTION_TYPES.includes(
    typeRaw as TransactionType
  )
    ? (typeRaw as TransactionType)
    : "income";

  const amount = parseNumber(obj.amount) ?? 0;
  const date = safeString(obj.date).trim();
  const concept =
    safeString(obj.concept).trim() ||
    safeString(obj.title).trim() ||
    safeString(obj.description).trim();

  const categoryRaw = safeString(obj.category).trim();
  const category: TransactionCategory = TRANSACTION_CATEGORIES.includes(
    categoryRaw as TransactionCategory
  )
    ? (categoryRaw as TransactionCategory)
    : "other";

  const statusRaw = safeString(obj.status).trim();
  const status: TransactionStatus = TRANSACTION_STATUSES.includes(
    statusRaw as TransactionStatus
  )
    ? (statusRaw as TransactionStatus)
    : "completed";

  if (!date || !concept) return null;

  return {
    id: ensureId(obj.id),
    type,
    amount,
    date,
    concept,
    description: safeString(obj.description) || undefined,
    paymentMethod: safeString(obj.paymentMethod) || undefined,
    category,
    status,
    eventId:
      safeString(obj.eventId) || safeString(obj.relatedEventId) || undefined,
    contactId:
      safeString(obj.contactId) || safeString(obj.relatedContactId) || undefined,
    createdAt: safeString(obj.createdAt) || nowIso(),
  };
}

function normalizeSocialPost(value: unknown): SocialPost | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  const channels = splitList(obj.channels);

  const statusRaw = safeString(obj.status).trim();
  const status: SocialPostStatus = SOCIAL_POST_STATUSES.includes(
    statusRaw as SocialPostStatus
  )
    ? (statusRaw as SocialPostStatus)
    : "draft";

  const mediaUrls = splitList(obj.mediaUrls);

  return {
    id: ensureId(obj.id),
    content: safeString(obj.content),
    channels: channels.length ? channels : ["Instagram"],
    status,
    mediaUrls: mediaUrls.length ? mediaUrls : undefined,
    scheduledAt: safeString(obj.scheduledAt) || undefined,
    createdAt: safeString(obj.createdAt) || nowIso(),
  };
}

function escapeCsv(value: string) {
  const mustQuote = /[",\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return mustQuote ? `"${escaped}"` : escaped;
}

function stringifyCell(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => safeString(v)).join(";");
  return safeString(value);
}

function toCsv<T extends Record<string, unknown>>(
  columns: readonly string[],
  rows: T[]
) {
  const header = columns.join(",");
  const lines = rows.map((row) =>
    columns.map((col) => escapeCsv(stringifyCell(row[col]))).join(",")
  );
  return [header, ...lines].join("\r\n");
}

function associationProfileToCsvRows(association: AssociationProfile | null) {
  if (!association) return [];
  return [
    {
      ...association,
      representatives: serializeRepresentativesForCsv(
        association.representatives
      ),
    },
  ] as Record<string, unknown>[];
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length) ?? "";

  let commas = 0;
  let semicolons = 0;
  let inQuotes = false;

  for (let i = 0; i < firstLine.length; i += 1) {
    const char = firstLine[i];
    if (char === '"') {
      const next = firstLine[i + 1];
      if (inQuotes && next === '"') {
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && char === ",") commas += 1;
    if (!inQuotes && char === ";") semicolons += 1;
  }

  return semicolons > commas ? ";" : ",";
}

function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const content = text.replace(/^\uFEFF/, "");

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    if (row.length === 1 && row[0].trim() === "") {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === delimiter) {
      pushField();
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      pushField();
      pushRow();
      if (char === "\r" && next === "\n") i += 1;
      continue;
    }

    field += char;
  }

  pushField();
  pushRow();

  return rows;
}

function parseCsvObjects(text: string) {
  const delimiter = detectDelimiter(text);
  const rows = parseCsvRows(text, delimiter).filter((r) =>
    r.some((cell) => cell.trim().length > 0)
  );

  const headers = (rows[0] ?? []).map((h) => h.trim());
  const items = rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((key, idx) => {
      obj[key] = cells[idx] ?? "";
    });
    return obj;
  });
  return { headers, items };
}

function inferCsvScope(headers: string[]): DataScope | null {
  const keys = headers.map((h) => h.trim());
  const has = (k: string) => keys.includes(k);

  if (has("name") && (has("taxId") || has("contactEmail") || has("phone"))) {
    return "associationProfile";
  }
  if (has("dni") && has("types")) return "contacts";
  if (has("startDate") && has("participantIds")) return "events";
  if (has("amount") && has("concept") && has("category")) return "transactions";
  if (has("channels") && has("status") && has("content")) return "socialPosts";
  return null;
}

function downloadTextFile(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function MigrationSettingsPage() {
  const router = useRouter();
  const hydrated = useSessionStore((s) => s.hydrated);
  const association = useSessionStore((s) => s.association);
  const setAssociation = useSessionStore((s) => s.setAssociation);

  const [exportScope, setExportScope] = useState<DataScope>("all");
  const [exportFormat, setExportFormat] = useState<DataFormat>("json");

  const [importScope, setImportScope] = useState<DataScope>("all");
  const [importFormat, setImportFormat] = useState<DataFormat>("json");
  const [importMode, setImportMode] = useState<ImportMode>("merge");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importAccept = useMemo(() => {
    return importFormat === "json" ? "application/json,.json" : ".csv,text/csv";
  }, [importFormat]);

  const importMultiple = useMemo(() => {
    return importFormat === "csv" && importScope === "all";
  }, [importFormat, importScope]);

  const exportAllJson = async () => {
    const [contacts, events, transactions, socialPosts] = await Promise.all([
      db.contacts.toArray(),
      db.events.toArray(),
      db.transactions.toArray(),
      db.socialPosts.toArray(),
    ]);

    const payload: KoraExportPayloadV1 = {
      version: 1,
      exportedAt: nowIso(),
      associationProfile: association,
      contacts,
      events,
      transactions,
      socialPosts,
    };

    downloadTextFile(
      "kora-export.json",
      JSON.stringify(payload, null, 2),
      "application/json"
    );
  };

  const exportScopedJson = async (scope: Exclude<DataScope, "all">) => {
    const exportedAt = nowIso();

    if (scope === "associationProfile") {
      const payload = {
        version: 1 as const,
        exportedAt,
        associationProfile: association,
      };
      downloadTextFile(
        "kora-associationProfile.json",
        JSON.stringify(payload, null, 2),
        "application/json"
      );
      return;
    }

    if (scope === "contacts") {
      const contacts = await db.contacts.toArray();
      const payload = { version: 1 as const, exportedAt, contacts };
      downloadTextFile(
        "kora-contacts.json",
        JSON.stringify(payload, null, 2),
        "application/json"
      );
      return;
    }

    if (scope === "events") {
      const events = await db.events.toArray();
      const payload = { version: 1 as const, exportedAt, events };
      downloadTextFile(
        "kora-events.json",
        JSON.stringify(payload, null, 2),
        "application/json"
      );
      return;
    }

    if (scope === "transactions") {
      const transactions = await db.transactions.toArray();
      const payload = { version: 1 as const, exportedAt, transactions };
      downloadTextFile(
        "kora-transactions.json",
        JSON.stringify(payload, null, 2),
        "application/json"
      );
      return;
    }

    const socialPosts = await db.socialPosts.toArray();
    const payload = { version: 1 as const, exportedAt, socialPosts };
    downloadTextFile(
      "kora-socialPosts.json",
      JSON.stringify(payload, null, 2),
      "application/json"
    );
  };

  const exportAllCsv = async () => {
    const [contacts, events, transactions, socialPosts] = await Promise.all([
      db.contacts.toArray(),
      db.events.toArray(),
      db.transactions.toArray(),
      db.socialPosts.toArray(),
    ]);

    downloadTextFile(
      "kora-associationProfile.csv",
      toCsv(
        ASSOCIATION_PROFILE_COLUMNS,
        associationProfileToCsvRows(association)
      ),
      "text/csv"
    );
    downloadTextFile(
      "kora-contacts.csv",
      toCsv(CONTACTS_COLUMNS, contacts as unknown as Record<string, unknown>[]),
      "text/csv"
    );
    downloadTextFile(
      "kora-events.csv",
      toCsv(EVENTS_COLUMNS, events as unknown as Record<string, unknown>[]),
      "text/csv"
    );
    downloadTextFile(
      "kora-transactions.csv",
      toCsv(
        TRANSACTIONS_COLUMNS,
        transactions as unknown as Record<string, unknown>[]
      ),
      "text/csv"
    );
    downloadTextFile(
      "kora-socialPosts.csv",
      toCsv(
        SOCIAL_POSTS_COLUMNS,
        socialPosts as unknown as Record<string, unknown>[]
      ),
      "text/csv"
    );
  };

  const exportScopedCsv = async (scope: Exclude<DataScope, "all">) => {
    if (scope === "associationProfile") {
      downloadTextFile(
        "kora-associationProfile.csv",
        toCsv(
          ASSOCIATION_PROFILE_COLUMNS,
          associationProfileToCsvRows(association)
        ),
        "text/csv"
      );
      return;
    }

    if (scope === "contacts") {
      const contacts = await db.contacts.toArray();
      downloadTextFile(
        "kora-contacts.csv",
        toCsv(CONTACTS_COLUMNS, contacts as unknown as Record<string, unknown>[]),
        "text/csv"
      );
      return;
    }

    if (scope === "events") {
      const events = await db.events.toArray();
      downloadTextFile(
        "kora-events.csv",
        toCsv(EVENTS_COLUMNS, events as unknown as Record<string, unknown>[]),
        "text/csv"
      );
      return;
    }

    if (scope === "transactions") {
      const transactions = await db.transactions.toArray();
      downloadTextFile(
        "kora-transactions.csv",
        toCsv(
          TRANSACTIONS_COLUMNS,
          transactions as unknown as Record<string, unknown>[]
        ),
        "text/csv"
      );
      return;
    }

    const socialPosts = await db.socialPosts.toArray();
    downloadTextFile(
      "kora-socialPosts.csv",
      toCsv(
        SOCIAL_POSTS_COLUMNS,
        socialPosts as unknown as Record<string, unknown>[]
      ),
      "text/csv"
    );
  };

  const handleExport = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      if (exportFormat === "json") {
        if (exportScope === "all") {
          await exportAllJson();
        } else {
          await exportScopedJson(exportScope);
        }
        setMessage("Exportación JSON completada.");
        return;
      }

      if (exportScope === "all") {
        await exportAllCsv();
      } else {
        await exportScopedCsv(exportScope);
      }
      setMessage("Exportación CSV completada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar.");
    } finally {
      setBusy(false);
    }
  };

  const applyImport = async (payload: Partial<KoraExportPayloadV1>) => {
    const profile = payload.associationProfile
      ? normalizeAssociationProfile(payload.associationProfile)
      : null;

    const contacts = (payload.contacts ?? [])
      .map(normalizeContact)
      .filter(Boolean) as Contact[];
    const events = (payload.events ?? [])
      .map(normalizeEvent)
      .filter(Boolean) as Event[];
    const transactions = (payload.transactions ?? [])
      .map(normalizeTransaction)
      .filter(Boolean) as Transaction[];
    const socialPosts = (payload.socialPosts ?? [])
      .map(normalizeSocialPost)
      .filter(Boolean) as SocialPost[];

    await db.transaction(
      "rw",
      db.contacts,
      db.events,
      db.transactions,
      db.socialPosts,
      async () => {
        if (importMode === "replace") {
          if (importScope === "all" || importScope === "contacts") {
            await db.contacts.clear();
          }
          if (importScope === "all" || importScope === "events") {
            await db.events.clear();
          }
          if (importScope === "all" || importScope === "transactions") {
            await db.transactions.clear();
          }
          if (importScope === "all" || importScope === "socialPosts") {
            await db.socialPosts.clear();
          }
        }

        if (importScope === "all" || importScope === "contacts") {
          if (contacts.length) await db.contacts.bulkPut(contacts);
        }
        if (importScope === "all" || importScope === "events") {
          if (events.length) await db.events.bulkPut(events);
        }
        if (importScope === "all" || importScope === "transactions") {
          if (transactions.length) await db.transactions.bulkPut(transactions);
        }
        if (importScope === "all" || importScope === "socialPosts") {
          if (socialPosts.length) await db.socialPosts.bulkPut(socialPosts);
        }
      }
    );

    if (importScope === "all" || importScope === "associationProfile") {
      if (profile) setAssociation(profile);
    }

    return {
      profile: profile ? 1 : 0,
      contacts: contacts.length,
      events: events.length,
      transactions: transactions.length,
      socialPosts: socialPosts.length,
    };
  };

  const importJsonText = async (text: string) => {
    const data = JSON.parse(text) as unknown;
    const obj = data as Record<string, unknown>;

    if (importScope === "all") {
      return applyImport({
        associationProfile: (obj.associationProfile ??
          obj.association ??
          null) as AssociationProfile | null,
        contacts: Array.isArray(obj.contacts)
          ? (obj.contacts as Contact[])
          : Array.isArray(obj.members)
            ? (obj.members as Contact[])
            : [],
        events: Array.isArray(obj.events) ? (obj.events as Event[]) : [],
        transactions: Array.isArray(obj.transactions)
          ? (obj.transactions as Transaction[])
          : [],
        socialPosts: Array.isArray(obj.socialPosts)
          ? (obj.socialPosts as SocialPost[])
          : [],
      });
    }

    if (importScope === "associationProfile") {
      const profile =
        obj.associationProfile ??
        obj.association ??
        (data as AssociationProfile | null);
      return applyImport({
        associationProfile: profile as AssociationProfile | null,
      });
    }

    if (importScope === "contacts") {
      const contacts = Array.isArray(obj.contacts)
        ? (obj.contacts as Contact[])
        : Array.isArray(obj.members)
          ? (obj.members as Contact[])
          : Array.isArray(data)
            ? (data as Contact[])
            : [];
      return applyImport({ contacts });
    }

    if (importScope === "events") {
      const events = Array.isArray(obj.events)
        ? (obj.events as Event[])
        : Array.isArray(data)
          ? (data as Event[])
          : [];
      return applyImport({ events });
    }

    if (importScope === "transactions") {
      const transactions = Array.isArray(obj.transactions)
        ? (obj.transactions as Transaction[])
        : Array.isArray(data)
          ? (data as Transaction[])
          : [];
      return applyImport({ transactions });
    }

    const socialPosts = Array.isArray(obj.socialPosts)
      ? (obj.socialPosts as SocialPost[])
      : Array.isArray(data)
        ? (data as SocialPost[])
        : [];
    return applyImport({ socialPosts });
  };

  const importCsvFiles = async (files: FileList) => {
    const payload: Partial<KoraExportPayloadV1> = {};

    for (const file of Array.from(files)) {
      const text = await file.text();
      const { headers, items } = parseCsvObjects(text);
      const inferred = inferCsvScope(headers);
      if (!inferred) continue;
      if (importScope !== "all" && inferred !== importScope) continue;

      if (inferred === "associationProfile") {
        const first = items[0] ?? null;
        payload.associationProfile = first
          ? (normalizeAssociationProfile(first) as AssociationProfile | null)
          : null;
        continue;
      }

      if (inferred === "contacts") {
        payload.contacts = items.map(normalizeContact).filter(Boolean) as Contact[];
        continue;
      }

      if (inferred === "events") {
        payload.events = items.map(normalizeEvent).filter(Boolean) as Event[];
        continue;
      }

      if (inferred === "transactions") {
        payload.transactions = items
          .map(normalizeTransaction)
          .filter(Boolean) as Transaction[];
        continue;
      }

      payload.socialPosts = items
        .map(normalizeSocialPost)
        .filter(Boolean) as SocialPost[];
    }

    return applyImport(payload);
  };

  const handleImport = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const input = fileInputRef.current;
      const files = input?.files;
      if (!files || files.length === 0) {
        setError("Selecciona un archivo para importar.");
        return;
      }

      const result =
        importFormat === "json"
          ? await importJsonText(await files[0].text())
          : await importCsvFiles(files);

      setMessage(
        `Importación completada. Perfil: ${result.profile}, Contactos: ${result.contacts}, Eventos: ${result.events}, Contabilidad: ${result.transactions}, Redes: ${result.socialPosts}.`
      );

      if (input) input.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar.");
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated) {
    return <div className="min-h-screen bg-background-light" aria-busy="true" />;
  }

  return (
    <div className="space-y-8">
      <PageTopbar>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Configuración &nbsp;›&nbsp; Migración
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">
              Migración de datos
            </h1>
            <p className="text-sm text-gray-500">
              Exporta e importa el perfil de la asociación y los módulos en JSON
              o CSV (todo junto o por apartado).
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm"
          >
            ← Volver a configuración
          </button>
        </div>
      </PageTopbar>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Exportar</h2>
          <p className="mt-2 text-sm text-gray-500">
            Descarga tus datos en un archivo JSON o CSV. En CSV, las listas se
            separan con <span className="font-semibold">;</span> (por ejemplo:{" "}
            <span className="font-semibold">member;provider</span>).
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Apartado
              </label>
              <select
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value as DataScope)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              >
                <option value="all">Todo</option>
                <option value="associationProfile">Perfil de la asociación</option>
                <option value="contacts">Contactos</option>
                <option value="events">Eventos</option>
                <option value="transactions">Contabilidad</option>
                <option value="socialPosts">Redes sociales</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Formato
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as DataFormat)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={busy}
            className="mt-6 w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/50"
          >
            {busy ? "Procesando..." : "Exportar"}
          </button>

          <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
            <p className="font-semibold text-gray-700">
              Perfil actual:{" "}
              <span className="font-normal">
                {association?.name ?? "Sin perfil"}
              </span>
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Importar</h2>
          <p className="mt-2 text-sm text-gray-500">
            Importa datos desde JSON o CSV. Puedes combinar o reemplazar datos.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Apartado
              </label>
              <select
                value={importScope}
                onChange={(e) => setImportScope(e.target.value as DataScope)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              >
                <option value="all">Todo</option>
                <option value="associationProfile">Perfil de la asociación</option>
                <option value="contacts">Contactos</option>
                <option value="events">Eventos</option>
                <option value="transactions">Contabilidad</option>
                <option value="socialPosts">Redes sociales</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Formato
              </label>
              <select
                value={importFormat}
                onChange={(e) => setImportFormat(e.target.value as DataFormat)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Modo de importación
            </label>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setImportMode("merge")}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  importMode === "merge"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Combinar (recomendado)
              </button>
              <button
                type="button"
                onClick={() => setImportMode("replace")}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  importMode === "replace"
                    ? "border-rose-500 bg-rose-50 text-rose-600"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Reemplazar datos
              </button>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Archivo{importMultiple ? "s" : ""}
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={importAccept}
              multiple={importMultiple}
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm file:mr-4 file:rounded-xl file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-200"
            />
            {importMultiple ? (
              <p className="mt-2 text-xs text-gray-400">
                Importación CSV completa: selecciona varios CSV (perfil,
                contactos, eventos, transacciones y redes). El sistema los
                detecta por sus columnas.
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="mt-6 w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/50"
          >
            {busy ? "Importando..." : "Importar"}
          </button>

          {message ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
