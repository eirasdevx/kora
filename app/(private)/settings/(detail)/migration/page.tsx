"use client";

import { useRef, useState } from "react";
import SettingsPageHeader from "@/components/shared/SettingsPageHeader";
import { normalizeAssociationAccountingSettings } from "@/core/session/accounting-settings";
import { normalizeAssociationMembershipSettings } from "@/core/session/membership-settings";
import type { SessionBootstrapPayload } from "@/core/session/session-payload";
import {
  type AssociationProfile,
  type AssociationRepresentative,
  useSessionStore,
} from "@/core/session/session.store";
import {
  applySessionPayload,
  parseApiResponse,
  reloadAssociationScopedStores,
} from "@/lib/client/session-client";
import {
  listAssociationModuleRecords,
  saveAssociationModuleRecords,
} from "@/lib/client/association-data-client";
import type {
  Contact,
  ContactKind,
  ContactType,
} from "@/modules/contacts/contact.types";
import { normalizeContactPrivacyPermissions } from "@/modules/contacts/contact-privacy";
import type { Event, EventStatus } from "@/modules/events/event.types";
import type {
  Transaction,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
} from "@/modules/accounting/transaction.types";

type DataScope =
  | "all"
  | "associationProfile"
  | "contacts"
  | "events"
  | "transactions";

type ImportMode = "merge" | "replace";

type KoraExportPayloadV1 = {
  version: 1;
  exportedAt: string;
  associationProfile: AssociationProfile | null;
  contacts: Contact[];
  events: Event[];
  transactions: Transaction[];
};

const CONTACT_TYPES: ContactType[] = [
  "member",
  "provider",
  "collaborator",
  "sponsor",
  "other",
];
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

const DATA_SCOPE_OPTIONS: Array<{
  value: DataScope;
  label: string;
  description: string;
  icon: string;
  eyebrow: string;
  iconClassName: string;
}> = [
  {
    value: "all",
    label: "Todos los módulos",
    description: "Perfil, contactos, eventos, contabilidad.",
    icon: "deployed_code",
    eyebrow: "Paquete completo",
    iconClassName: "bg-blue-50 text-blue-600",
  },
  {
    value: "associationProfile",
    label: "Perfil de la asociación",
    description: "Datos legales, ubicación y representantes.",
    icon: "apartment",
    eyebrow: "Identidad",
    iconClassName: "bg-amber-50 text-amber-700",
  },
  {
    value: "contacts",
    label: "Contactos",
    description: "Miembros, proveedores y colaboradores.",
    icon: "groups",
    eyebrow: "Personas",
    iconClassName: "bg-emerald-50 text-emerald-700",
  },
  {
    value: "events",
    label: "Eventos",
    description: "Agenda, registros y asistencia.",
    icon: "event",
    eyebrow: "Actividad",
    iconClassName: "bg-violet-50 text-violet-700",
  },
  {
    value: "transactions",
    label: "Contabilidad",
    description: "Ingresos, gastos y transacciones.",
    icon: "receipt_long",
    eyebrow: "Finanzas",
    iconClassName: "bg-slate-100 text-slate-700",
  },
];

const IMPORT_MODE_OPTIONS: Array<{
  value: ImportMode;
  label: string;
  description: string;
  note: string;
  icon: string;
  className: string;
  activeClassName: string;
}> = [
  {
    value: "merge",
    label: "Combinar",
    description:
      "Conserva los datos existentes y agrega o actualiza los registros del archivo.",
    note: "Recomendado para sincronizaciones parciales.",
    icon: "join",
    className: "bg-emerald-50 text-emerald-700",
    activeClassName:
      "border-emerald-300 bg-emerald-50/70 text-emerald-800",
  },
  {
    value: "replace",
    label: "Reemplazar datos",
    description:
      "Limpia los módulos seleccionados antes de importar el contenido del JSON.",
    note: "Úsalo solo si quieres sobrescribir todo.",
    icon: "warning",
    className: "bg-rose-50 text-rose-700",
    activeClassName: "border-rose-300 bg-rose-50/70 text-rose-800",
  },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const decimals = size >= 10 || unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

function getScopeOption(value: DataScope) {
  return (
    DATA_SCOPE_OPTIONS.find((option) => option.value === value) ?
    DATA_SCOPE_OPTIONS[0]
  );
}

function getImportModeOption(value: ImportMode) {
  return (
    IMPORT_MODE_OPTIONS.find((option) => option.value === value) ?
    IMPORT_MODE_OPTIONS[0]
  );
}

function getExportFilename(scope: DataScope) {
  if (scope === "all") return "kora-export.json";
  if (scope === "associationProfile") return "kora-associationProfile.json";
  if (scope === "contacts") return "kora-contacts.json";
  if (scope === "events") return "kora-events.json";
  return "kora-transactions.json";
}

type ScopeOptionCardProps = {
  option: (typeof DATA_SCOPE_OPTIONS)[number];
  active: boolean;
  onClick: () => void;
};

function ScopeOptionCard({
  option,
  active,
  onClick,
}: ScopeOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group flex items-start gap-4 rounded-2xl border px-4 py-4 text-left transition",
        active
          ? "border-primary bg-primary/5 shadow-[0_10px_30px_-24px_rgba(17,82,212,0.9)]"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <span
        className={cx(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
          option.iconClassName
        )}
      >
        <span className="material-symbols-outlined text-[19px]">
          {option.icon}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {option.eyebrow}
        </span>
        <span className="mt-1 block text-sm font-semibold text-slate-900">
          {option.label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {option.description}
        </span>
      </span>
      <span
        className={cx(
          "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition",
          active
            ? "border-primary bg-primary text-white"
            : "border-slate-300 bg-white text-transparent group-hover:border-slate-400"
        )}
      >
        <span className="material-symbols-outlined text-[14px]">check</span>
      </span>
    </button>
  );
}

type ImportModeCardProps = {
  option: (typeof IMPORT_MODE_OPTIONS)[number];
  active: boolean;
  onClick: () => void;
};

function ImportModeCard({
  option,
  active,
  onClick,
}: ImportModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-2xl border px-4 py-4 text-left transition",
        active
          ? option.activeClassName
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            option.className
          )}
        >
          <span className="material-symbols-outlined text-[18px]">
            {option.icon}
          </span>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{option.label}</p>
          <p className="mt-1 text-xs leading-5 text-inherit/80">
            {option.description}
          </p>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-inherit/70">
            {option.note}
          </p>
        </div>
      </div>
    </button>
  );
}

type FeedbackCardProps = {
  tone: "success" | "error";
  message: string;
};

function FeedbackCard({ tone, message }: FeedbackCardProps) {
  return (
    <div
      className={cx(
        "rounded-2xl border px-4 py-3 text-sm",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800"
      )}
    >
      {message}
    </div>
  );
}

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
    obj.representatives ? obj.boardMembers ? obj.committee
  );

  return {
    name,
    taxId: taxId || undefined,
    contactEmail: contactEmail || undefined,
    phone: phone || undefined,
    location: location || undefined,
    address: address || undefined,
    accountingSettings: normalizeAssociationAccountingSettings(
      obj.accountingSettings ? obj.accountingCatalog
    ),
    membershipSettings: normalizeAssociationMembershipSettings(
      obj.membershipSettings ? {
        cycle:
          obj.membershipCycle ?
          obj.feeCycle ?
          obj.membershipBillingCycle,
        amount:
          obj.membershipFeeAmount ?
          obj.feeAmount ?
          obj.membershipAmount,
        monthlyChargeDay:
          obj.monthlyChargeDay ? obj.membershipMonthlyChargeDay,
        annualChargeMonth:
          obj.annualChargeMonth ? obj.membershipAnnualChargeMonth,
        annualChargeDay:
          obj.annualChargeDay ? obj.membershipAnnualChargeDay,
      }
    ),
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
    if (!firstName) firstName = parts[0] ? "";
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

  const privacySource =
    obj.privacyPermissions && typeof obj.privacyPermissions === "object"
      ? (obj.privacyPermissions as Record<string, unknown>)
      : {};
  const consentDocumentIds = splitList(
    obj.consentDocumentIds ? obj.privacyDocumentIds ? obj.consentDocs
  );

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
    postalCode: safeString(obj.postalCode) || undefined,
    address: safeString(obj.address) || undefined,
    city: safeString(obj.city) || undefined,
    region: safeString(obj.region) || undefined,
    photoUrl: safeString(obj.photoUrl) || undefined,
    types: normalizedTypes,
    membershipPlanId:
      safeString(obj.membershipPlanId) ||
      safeString(obj.feePlanId) ||
      safeString(obj.membershipTypeId) ||
      undefined,
    accountingAccountType: CONTACT_TYPES.includes(
      safeString(obj.accountingAccountType) as ContactType
    )
      ? (safeString(obj.accountingAccountType) as ContactType)
      : undefined,
    accountingAccountCode: safeString(obj.accountingAccountCode) || undefined,
    accountingAccountLabel: safeString(obj.accountingAccountLabel) || undefined,
    privacyPermissions: normalizeContactPrivacyPermissions({
      image:
        parseBoolean(
          privacySource.image ?
            obj.imageConsent ?
            obj.imagePermission ?
            obj.imageAuthorized
        ) ? undefined,
      voice:
        parseBoolean(
          privacySource.voice ?
            obj.voiceConsent ?
            obj.voicePermission ?
            obj.voiceAuthorized
        ) ? undefined,
      communications:
        parseBoolean(
          privacySource.communications ?
            obj.communicationConsent ?
            obj.communicationsConsent ?
            obj.newsletterConsent
        ) ? undefined,
      services:
        parseBoolean(
          privacySource.services ?
            obj.serviceConsent ?
            obj.servicesConsent ?
            obj.servicesAuthorized
        ) ? undefined,
    }),
    privacyUpdatedAt:
      safeString(obj.privacyUpdatedAt) ||
      safeString(obj.consentUpdatedAt) ||
      undefined,
    consentDocumentIds: consentDocumentIds.length
      ? consentDocumentIds
      : undefined,
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

  const amount = parseNumber(obj.amount) ? 0;
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
    membershipPlanId: safeString(obj.membershipPlanId) || undefined,
    membershipPlanName: safeString(obj.membershipPlanName) || undefined,
    accountingAccountKey:
      (safeString(obj.accountingAccountKey) || undefined) as
        | Transaction["accountingAccountKey"]
        | undefined,
    accountCode: safeString(obj.accountCode) || undefined,
    accountLabel: safeString(obj.accountLabel) || undefined,
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
  const hydrated = useSessionStore((s) => s.hydrated);
  const association = useSessionStore((s) => s.association);

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
  const selectedImportScope = getScopeOption(importScope);
  const selectedExportScope = getScopeOption(exportScope);
  const selectedImportMode = getImportModeOption(importMode);
  const selectedFileSize = selectedFile ? formatBytes(selectedFile.size) : null;
  const exportFilename = getExportFilename(exportScope);

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

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const persistAssociationProfile = async (profile: AssociationProfile) => {
    const response = await fetch("/api/association", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: profile.name,
        logoUrl: profile.logoUrl,
        taxId: profile.taxId,
        phone: profile.phone,
        contactEmail: profile.contactEmail,
        location: profile.location,
        address: profile.address,
        membershipSettings: profile.membershipSettings,
        representatives: profile.representatives?.map((representative) => ({
          id: representative.id,
          role: representative.role,
          name: representative.name,
          email: representative.email,
          phone: representative.phone,
        })),
      }),
    });

    const session = await parseApiResponse<SessionBootstrapPayload>(response);
    applySessionPayload(session);
  };

  const exportAllJson = async () => {
    const [contacts, events, transactions] = await Promise.all([
      listAssociationModuleRecords<Contact>("contacts"),
      listAssociationModuleRecords<Event>("events"),
      listAssociationModuleRecords<Transaction>("transactions"),
    ]);

    const payload: KoraExportPayloadV1 = {
      version: 1,
      exportedAt: nowIso(),
      associationProfile: association,
      contacts,
      events,
      transactions,
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
      const contacts = await listAssociationModuleRecords<Contact>("contacts");
      const payload = { version: 1 as const, exportedAt, contacts };
      downloadTextFile(
        "kora-contacts.json",
        JSON.stringify(payload, null, 2),
        "application/json"
      );
      return;
    }

    if (scope === "events") {
      const events = await listAssociationModuleRecords<Event>("events");
      const payload = { version: 1 as const, exportedAt, events };
      downloadTextFile(
        "kora-events.json",
        JSON.stringify(payload, null, 2),
        "application/json"
      );
      return;
    }

    if (scope === "transactions") {
      const transactions =
        await listAssociationModuleRecords<Transaction>("transactions");
      const payload = { version: 1 as const, exportedAt, transactions };
      downloadTextFile(
        "kora-transactions.json",
        JSON.stringify(payload, null, 2),
        "application/json"
      );
      return;
    }
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
      setMessage("Exportación JSON completada.");
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

    const contacts = (payload.contacts ? [])
      .map(normalizeContact)
      .filter(Boolean) as Contact[];
    const events = (payload.events ? [])
      .map(normalizeEvent)
      .filter(Boolean) as Event[];
    const transactions = (payload.transactions ? [])
      .map(normalizeTransaction)
      .filter(Boolean) as Transaction[];
    const tasks: Array<Promise<unknown>> = [];

    if (importScope === "all" || importScope === "contacts") {
      tasks.push(
        saveAssociationModuleRecords<Contact>(
          "contacts",
          contacts,
          importMode
        )
      );
    }

    if (importScope === "all" || importScope === "events") {
      tasks.push(
        saveAssociationModuleRecords<Event>("events", events, importMode)
      );
    }

    if (importScope === "all" || importScope === "transactions") {
      tasks.push(
        saveAssociationModuleRecords<Transaction>(
          "transactions",
          transactions,
          importMode
        )
      );
    }

    if (
      (importScope === "all" || importScope === "associationProfile") &&
      profile
    ) {
      tasks.push(persistAssociationProfile(profile));
    }

    await Promise.all(tasks);
    await reloadAssociationScopedStores();

    return {
      profile: profile ? 1 : 0,
      contacts: contacts.length,
      events: events.length,
      transactions: transactions.length,
    };
  };

  const importJsonText = async (text: string) => {
    const data = JSON.parse(text) as unknown;
    const obj = data as Record<string, unknown>;

    if (importScope === "all") {
      return applyImport({
        associationProfile: (obj.associationProfile ?
          obj.association ?
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
      });
    }

    if (importScope === "associationProfile") {
      const profile =
        obj.associationProfile ?
        obj.association ?
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
    return applyImport({});
  };

  const handleImport = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    setLastAction("import");

    try {
      const input = fileInputRef.current;
      const file = selectedFile ? input?.files?.[0];
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
        `Importación completada. Perfil: ${result.profile}, Contactos: ${result.contacts}, Eventos: ${result.events}, Contabilidad: ${result.transactions}.`
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
      <SettingsPageHeader
        section={"Migraci\u00f3n"}
        title={"Gesti\u00f3n de datos"}
        subtitle={
          "Importa y exporta la informaci\u00f3n de tu organizaci\u00f3n de forma segura y r\u00e1pida."
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(17,82,212,0.12),_transparent_42%),linear-gradient(180deg,#ffffff,rgba(248,250,252,0.95))] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[22px]">
                    upload_file
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Entrada JSON
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    Importar datos
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Sube un archivo JSON para combinar o reemplazar la
                    información de Kora.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                Formato JSON seguro
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Destino actual
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedImportScope.label}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedImportScope.description}
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Modo
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedImportMode.label}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedImportMode.note}
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Archivo
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedFile ? "Listo para importar" : "Sin archivo"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedFile
                    ? selectedFile.name
                    : "Selecciona un JSON para continuar."}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cx(
                  "rounded-[28px] border-2 border-dashed px-6 py-8 text-center transition",
                  isDragActive
                    ? "border-primary bg-primary/10"
                    : "border-slate-200 bg-slate-50/70"
                )}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">
                    cloud_upload
                  </span>
                </div>
                <p className="mt-5 text-base font-semibold text-slate-900">
                  Arrastra y suelta tu archivo aquí
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Compatible con exportaciones JSON de Kora y lotes
                  equivalentes.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      upload
                    </span>
                    Explorar archivo
                  </button>
                  {selectedFile ? (
                    <button
                      type="button"
                      onClick={clearSelectedFile}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        close
                      </span>
                      Quitar archivo
                    </button>
                  ) : null}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={importAccept}
                  className="sr-only"
                  onChange={(event) => handleFilesSelected(event.target.files)}
                />
              </div>

              <aside className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Resumen de importación
                </p>

                {selectedFile ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-[18px]">
                          data_object
                        </span>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {selectedFile.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {selectedFileSize} · Archivo listo para procesar
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                    No has seleccionado ningún archivo todavía.
                  </div>
                )}

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Módulo de destino
                  </p>
                  <div className="mt-3 flex items-start gap-3">
                    <span
                      className={cx(
                        "flex h-10 w-10 items-center justify-center rounded-2xl",
                        selectedImportScope.iconClassName
                      )}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {selectedImportScope.icon}
                      </span>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedImportScope.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedImportScope.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={cx(
                    "mt-4 rounded-2xl border px-4 py-3 text-xs leading-5",
                    importMode === "replace"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  )}
                >
                  {importMode === "replace"
                    ? "Atención: se vaciarán los módulos seleccionados antes de cargar el JSON."
                    : "Los datos existentes se mantendrán y se añadirán los nuevos registros."}
                </div>
              </aside>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Seleccionar módulos de destino
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Elige qué bloque quieres actualizar con el archivo importado.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DATA_SCOPE_OPTIONS.map((option) => (
                  <ScopeOptionCard
                    key={option.value}
                    option={option}
                    active={importScope === option.value}
                    onClick={() => setImportScope(option.value)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Modo de importación
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Define si deseas fusionar registros o reemplazar el contenido
                del módulo.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {IMPORT_MODE_OPTIONS.map((option) => (
                  <ImportModeCard
                    key={option.value}
                    option={option}
                    active={importMode === option.value}
                    onClick={() => setImportMode(option.value)}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleImport}
              disabled={busy || !selectedFile}
              className="w-full rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/50"
            >
              {isImportBusy ? "Importando..." : "Iniciar importación"}
            </button>

            {importMessage ? (
              <FeedbackCard tone="success" message={importMessage} />
            ) : null}

            {importError ? (
              <FeedbackCard tone="error" message={importError} />
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(15,23,42,0.08),_transparent_40%),linear-gradient(180deg,#ffffff,rgba(248,250,252,0.92))] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[22px]">
                    download
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Salida JSON
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    Exportar datos
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Genera un respaldo descargable con el alcance exacto que
                    necesitas.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                Archivo listo para backup
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Archivo de salida
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {exportFilename}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Nombre sugerido según el bloque seleccionado.
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Perfil actual
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {association?.name ? "Sin perfil"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Se incluirá cuando exportes el perfil o el paquete completo.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                ¿Qué datos deseas exportar?
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Selecciona un único bloque para descargar un JSON limpio o usa
                el paquete completo.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DATA_SCOPE_OPTIONS.map((option) => (
                  <ScopeOptionCard
                    key={option.value}
                    option={option}
                    active={exportScope === option.value}
                    onClick={() => setExportScope(option.value)}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Vista previa de exportación
              </p>
              <div className="mt-4 flex items-start gap-4 rounded-2xl border border-white/80 bg-white p-4 shadow-sm">
                <span
                  className={cx(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                    selectedExportScope.iconClassName
                  )}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {selectedExportScope.icon}
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedExportScope.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedExportScope.description}
                  </p>
                  <div className="mt-3 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    {exportFilename}
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
                <p className="font-semibold text-slate-700">
                  Perfil actual:{" "}
                  <span className="font-normal">
                    {association?.name ? "Sin perfil"}
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={busy}
              className="w-full rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-white shadow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/50"
            >
              {isExportBusy ? "Descargando..." : "Descargar datos"}
            </button>

            {exportMessage ? (
              <FeedbackCard tone="success" message={exportMessage} />
            ) : null}

            {exportError ? (
              <FeedbackCard tone="error" message={exportError} />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
