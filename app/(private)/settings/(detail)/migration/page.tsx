"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageTopbar from "@/components/PageTopbar";
import { db } from "@/core/storage/kora.db";
import {
  type AssociationProfile,
  type AssociationRepresentative,
  useSessionStore,
} from "@/core/session/session.store";
import type {
  Contact,
  ContactKind,
  ContactType,
} from "@/modules/contacts/contact.types";
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

const DATA_SCOPE_OPTIONS: Array<{
  value: DataScope;
  label: string;
  description: string;
}> = [
  {
    value: "all",
    label: "Todos los módulos",
    description: "Perfil, contactos, eventos, contabilidad y redes.",
  },
  {
    value: "associationProfile",
    label: "Perfil de la asociación",
    description: "Datos legales, ubicación y representantes.",
  },
  {
    value: "contacts",
    label: "Contactos",
    description: "Miembros, proveedores y colaboradores.",
  },
  {
    value: "events",
    label: "Eventos",
    description: "Agenda, registros y asistencia.",
  },
  {
    value: "transactions",
    label: "Contabilidad",
    description: "Ingresos, gastos y transacciones.",
  },
  {
    value: "socialPosts",
    label: "Redes sociales",
    description: "Publicaciones y campañas.",
  },
];

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

  const kindRaw = safeString(obj.kind).trim().toLowerCase();
  const contactKindRaw = safeString(obj.contactKind).trim().toLowerCase();
  const isEntityFlag =
    kindRaw === "entity" ||
    contactKindRaw === "entity" ||
    safeString(obj.isEntity).trim().toLowerCase() === "true";
  const kind: ContactKind = isEntityFlag ? "entity" : "person";

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
    kind,
    firstName,
    lastName,
    representativeFirstName:
      safeString(obj.representativeFirstName).trim() || undefined,
    representativeLastName:
      safeString(obj.representativeLastName).trim() || undefined,
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

  const [importScope, setImportScope] = useState<DataScope>("all");
  const [importMode, setImportMode] = useState<ImportMode>("merge");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<"import" | "export" | null>(null);

  const importAccept = "application/json,.json";

  const isImportBusy = busy && lastAction === "import";
  const isExportBusy = busy && lastAction === "export";
  const importMessage = lastAction === "import" ? message : null;
  const exportMessage = lastAction === "export" ? message : null;
  const importError = lastAction === "import" ? error : null;
  const exportError = lastAction === "export" ? error : null;

  const isJsonFile = (file: File) => {
    const name = file.name.toLowerCase();
    return file.type === "application/json" || name.endsWith(".json");
  };

  const handleFilesSelected = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    if (fileList.length > 1) {
      setLastAction("import");
      setMessage(null);
      setError("Solo se permite un archivo JSON.");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const file = fileList[0];
    if (!file) return;

    if (!isJsonFile(file)) {
      setLastAction("import");
      setMessage(null);
      setError("Solo se permiten archivos JSON.");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    setError(null);
    if (lastAction === "import") setMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    handleFilesSelected(event.dataTransfer.files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isDragActive) setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

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

  const handleExport = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    setLastAction("export");

    try {
      if (exportScope === "all") {
        await exportAllJson();
      } else {
        await exportScopedJson(exportScope);
      }
      setMessage("Exportacion JSON completada.");
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

  const handleImport = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    setLastAction("import");

    try {
      const input = fileInputRef.current;
      const file = selectedFile ?? input?.files?.[0];
      if (!file) {
        setError("Selecciona un archivo JSON para importar.");
        return;
      }
      if (!isJsonFile(file)) {
        setError("Solo se permiten archivos JSON.");
        return;
      }

      const result = await importJsonText(await file.text());

      setMessage(
        `Importacion completada. Perfil: ${result.profile}, Contactos: ${result.contacts}, Eventos: ${result.events}, Contabilidad: ${result.transactions}, Redes: ${result.socialPosts}.`
      );

      if (input) input.value = "";
      setSelectedFile(null);
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
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[20px]">
                storage
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Configuración &nbsp;›&nbsp; Migración
              </p>
              <h1 className="text-2xl font-semibold text-gray-900">
                Gestión de Datos
              </h1>
              <p className="text-sm text-gray-500">
                Importa y exporta la información de tu organización de forma segura y
                rápida.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm"
          >
            ← Volver a configuracion
          </button>
        </div>
      </PageTopbar>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[20px]">
                upload
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Importar datos</h2>
              <p className="mt-1 text-sm text-gray-500">
                Sube tu archivo JSON para actualizar la base de datos de Kora.
              </p>
            </div>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`mt-6 rounded-3xl border-2 border-dashed p-8 text-center transition ${
              isDragActive
                ? "border-primary bg-primary/10"
                : "border-gray-200 bg-gray-50/60"
            }`}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
              <span className="material-symbols-outlined text-[20px]">
                cloud_upload
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold text-gray-900">
              Arrastra y suelta tu archivo aqui
            </p>
            <p className="mt-2 text-xs text-gray-400">Formato: JSON.</p>
            {selectedFile ? (
              <p className="mt-2 text-xs text-gray-500">
                Archivo seleccionado: {selectedFile.name}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50"
            >
              Explorar archivo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={importAccept}
              className="sr-only"
              onChange={(event) => handleFilesSelected(event.target.files)}
            />
          </div>
          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-900">
              Seleccionar módulos de destino
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DATA_SCOPE_OPTIONS.map((option) => {
                const isActive = importScope === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setImportScope(option.value)}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border ${
                        isActive
                          ? "border-primary bg-primary text-white"
                          : "border-gray-300 bg-white text-transparent"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        check
                      </span>
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-gray-900">
                        {option.label}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-900">Modo de importación</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="mt-6 w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/50"
          >
            {isImportBusy ? "Importando..." : "Iniciar importación"}
          </button>

          {importMessage ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {importMessage}
            </div>
          ) : null}

          {importError ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {importError}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[20px]">
                download
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Exportar datos</h2>
              <p className="mt-1 text-sm text-gray-500">
                Genera un respaldo o descarga tu informacion en JSON.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-900">
              ¿Qué datos deseas exportar?
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DATA_SCOPE_OPTIONS.map((option) => {
                const isActive = exportScope === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setExportScope(option.value)}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border ${
                        isActive
                          ? "border-primary bg-primary text-white"
                          : "border-gray-300 bg-white text-transparent"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        check
                      </span>
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-gray-900">
                        {option.label}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {option.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={busy}
            className="mt-6 w-full rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/50"
          >
            {isExportBusy ? "Descargando..." : "Descargar datos"}
          </button>

          <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
            <p className="font-semibold text-gray-700">
              Perfil actual:{" "}
              <span className="font-normal">
                {association?.name ?? "Sin perfil"}
              </span>
            </p>
          </div>

          {exportMessage ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {exportMessage}
            </div>
          ) : null}

          {exportError ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {exportError}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
