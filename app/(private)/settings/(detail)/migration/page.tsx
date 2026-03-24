"use client";

import { useRef, useState } from "react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
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
  saveAssociationModuleRecordsInBatches,
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
import type {
  DocumentCategory,
  DocumentItem,
  DocumentSecurity,
  DocumentType,
} from "@/modules/documents/document.types";
import type {
  InventoryItem,
  InventoryStatus,
} from "@/modules/resources/inventory.types";
import type {
  VolunteerActivity,
  VolunteerProfileType,
} from "@/modules/volunteers/volunteer-activity.types";
import type { MessageTemplate } from "@/modules/messaging/messaging.types";

type DataScope =
  | "all"
  | "associationProfile"
  | "contacts"
  | "events"
  | "transactions"
  | "documents"
  | "inventory"
  | "volunteerActivities"
  | "messagingTemplates";

type ImportMode = "merge" | "replace";

type KoraExportPayload = {
  version: 1 | 2;
  exportedAt: string;
  associationProfile: AssociationProfile | null;
  contacts: Contact[];
  events: Event[];
  transactions: Transaction[];
  documents: DocumentItem[];
  inventory: InventoryItem[];
  volunteerActivities: VolunteerActivity[];
  messagingTemplates: MessageTemplate[];
};

const EVENT_STATUSES: EventStatus[] = ["draft", "published"];
const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "PDF",
  "Imagenes",
  "Contratos",
  "Hojas de Calculo",
  "Carpetas",
];
const DOCUMENT_SECURITIES: DocumentSecurity[] = [
  "Privado",
  "Compartido",
  "Cifrado",
];
const DOCUMENT_TYPES: DocumentType[] = [
  "pdf",
  "doc",
  "sheet",
  "folder",
  "csv",
  "image",
  "other",
];
const INVENTORY_STATUSES: InventoryStatus[] = [
  "available",
  "in_use",
  "maintenance",
  "retired",
];
const VOLUNTEER_PROFILE_TYPES: VolunteerProfileType[] = [
  "member",
  "contact",
];
const TRANSACTION_IMPORT_KEYS = [
  "transactions",
  "movements",
  "movement",
  "accounting",
  "entries",
  "gastos",
  "expenses",
  "ingresos",
  "income",
];

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
    description:
      "Perfil, contactos, eventos, contabilidad, documentos, inventario, voluntariado y mensajer\u00eda.",
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
  {
    value: "documents",
    label: "Documentos",
    description: "Metadatos, accesos y versiones.",
    icon: "description",
    eyebrow: "Archivo",
    iconClassName: "bg-cyan-50 text-cyan-700",
  },
  {
    value: "inventory",
    label: "Inventario",
    description: "Activos, estados y asignaciones.",
    icon: "inventory_2",
    eyebrow: "Recursos",
    iconClassName: "bg-orange-50 text-orange-700",
  },
  {
    value: "volunteerActivities",
    label: "Voluntariado",
    description: "Horas, actividades y participaciones.",
    icon: "volunteer_activism",
    eyebrow: "Equipo",
    iconClassName: "bg-indigo-50 text-indigo-700",
  },
  {
    value: "messagingTemplates",
    label: "Mensajer\u00eda",
    description: "Plantillas y contenido reutilizable.",
    icon: "mail",
    eyebrow: "Comunicaci\u00f3n",
    iconClassName: "bg-sky-50 text-sky-700",
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
    DATA_SCOPE_OPTIONS.find((option) => option.value === value) ??
    DATA_SCOPE_OPTIONS[0]
  );
}

function getImportModeOption(value: ImportMode) {
  return (
    IMPORT_MODE_OPTIONS.find((option) => option.value === value) ??
    IMPORT_MODE_OPTIONS[0]
  );
}

function getExportFilename(scope: DataScope) {
  if (scope === "all") return "kora-export.json";
  if (scope === "associationProfile") return "kora-associationProfile.json";
  if (scope === "contacts") return "kora-contacts.json";
  if (scope === "events") return "kora-events.json";
  if (scope === "transactions") return "kora-transactions.json";
  if (scope === "documents") return "kora-documents.json";
  if (scope === "inventory") return "kora-inventory.json";
  if (scope === "volunteerActivities") return "kora-volunteerActivities.json";
  return "kora-messagingTemplates.json";
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
    .split(/[;,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeOptionalText(value: unknown): string | undefined {
  const normalized = safeString(value).trim();
  return normalized || undefined;
}

function normalizeContactKindValue(value: unknown): ContactKind | null {
  const raw = safeString(value).trim().toLowerCase();
  if (!raw) return null;
  if (raw === "entity" || raw === "entidad" || raw === "empresa") {
    return "entity";
  }
  if (raw === "person" || raw === "persona") {
    return "person";
  }
  return null;
}

function normalizeContactTypeValue(value: unknown): ContactType | null {
  const raw = safeString(value).trim().toLowerCase();
  if (!raw) return null;

  if (raw === "member" || raw === "miembro" || raw === "socio") {
    return "member";
  }
  if (raw === "provider" || raw === "proveedor") {
    return "provider";
  }
  if (raw === "collaborator" || raw === "colaborador") {
    return "collaborator";
  }
  if (
    raw === "sponsor" ||
    raw === "patrocinador" ||
    raw === "patrocinio"
  ) {
    return "sponsor";
  }
  if (raw === "other" || raw === "otro" || raw === "contacto") {
    return "other";
  }

  return null;
}

function normalizeDateString(value: unknown): string | undefined {
  const raw = safeString(value).trim();
  if (!raw) return undefined;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function normalizeIsoDateOnly(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const excelDate = new Date(Date.UTC(1899, 11, 30));
    excelDate.setUTCDate(excelDate.getUTCDate() + Math.floor(value));
    return excelDate.toISOString().slice(0, 10);
  }

  const raw = safeString(value).trim();
  if (!raw) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const dayFirstMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayFirstMatch) {
    const day = Number(dayFirstMatch[1]);
    const month = Number(dayFirstMatch[2]);
    const year = Number(dayFirstMatch[3]);

    if (
      Number.isInteger(day) &&
      Number.isInteger(month) &&
      Number.isInteger(year) &&
      day >= 1 &&
      day <= 31 &&
      month >= 1 &&
      month <= 12
    ) {
      return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
    }
  }

  if (/^\d+(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (Number.isFinite(serial) && serial > 0) {
      const excelDate = new Date(Date.UTC(1899, 11, 30));
      excelDate.setUTCDate(excelDate.getUTCDate() + Math.floor(serial));
      return excelDate.toISOString().slice(0, 10);
    }
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function normalizeTransactionTypeValue(value: unknown): TransactionType | null {
  const raw = safeString(value).trim().toLowerCase();
  if (!raw) return null;

  if (
    raw === "income" ||
    raw === "ingreso" ||
    raw === "ingresos" ||
    raw === "entrada" ||
    raw === "cobro"
  ) {
    return "income";
  }

  if (
    raw === "expense" ||
    raw === "gasto" ||
    raw === "gastos" ||
    raw === "salida" ||
    raw === "compra" ||
    raw === "coste" ||
    raw === "cost"
  ) {
    return "expense";
  }

  return null;
}

function normalizeTransactionCategoryValue(
  value: unknown
): TransactionCategory | null {
  const raw = safeString(value).trim().toLowerCase();
  if (!raw) return null;

  if (
    raw === "membership" ||
    raw === "membresia" ||
    raw === "membresía" ||
    raw === "cuota" ||
    raw === "cuotas" ||
    raw === "socio" ||
    raw === "socios"
  ) {
    return "membership";
  }

  if (raw === "installations" || raw === "instalaciones") {
    return "installations";
  }

  if (
    raw === "events" ||
    raw === "event" ||
    raw === "evento" ||
    raw === "eventos"
  ) {
    return "events";
  }

  if (
    raw === "subsidies" ||
    raw === "subsidy" ||
    raw === "subvencion" ||
    raw === "subvención" ||
    raw === "subvenciones"
  ) {
    return "subsidies";
  }

  if (raw === "other" || raw === "otro" || raw === "otros" || raw === "general") {
    return "other";
  }

  return null;
}

function normalizeTransactionStatusValue(
  value: unknown
): TransactionStatus | null {
  const raw = safeString(value).trim().toLowerCase();
  if (!raw) return null;

  if (raw === "completed" || raw === "completado" || raw === "pagado") {
    return "completed";
  }

  if (raw === "pending" || raw === "pendiente") {
    return "pending";
  }

  return null;
}

function normalizeAddress(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return normalizeOptionalText(value);
  }

  const address = value as Record<string, unknown>;
  const street = normalizeOptionalText(address.street);
  const line1 = normalizeOptionalText(address.line1);
  const line2 = normalizeOptionalText(address.line2);
  const postalCode = normalizeOptionalText(address.postalCode);
  const city = normalizeOptionalText(address.city);
  const region = normalizeOptionalText(address.region);
  const country = normalizeOptionalText(address.country);

  const parts = [street, line1, line2, postalCode, city, region, country].filter(
    Boolean
  );

  return parts.length ? parts.join(", ") : undefined;
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
    accountingSettings: normalizeAssociationAccountingSettings(
      obj.accountingSettings ?? obj.accountingCatalog
    ),
    membershipSettings: normalizeAssociationMembershipSettings(
      obj.membershipSettings ?? {
        cycle:
          obj.membershipCycle ??
          obj.feeCycle ??
          obj.membershipBillingCycle,
        amount:
          obj.membershipFeeAmount ??
          obj.feeAmount ??
          obj.membershipAmount,
        monthlyChargeDay:
          obj.monthlyChargeDay ?? obj.membershipMonthlyChargeDay,
        annualChargeMonth:
          obj.annualChargeMonth ?? obj.membershipAnnualChargeMonth,
        annualChargeDay:
          obj.annualChargeDay ?? obj.membershipAnnualChargeDay,
      }
    ),
    representatives: representatives.length ? representatives : undefined,
  };
}

function normalizeContact(value: unknown): Contact | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  const fullNameRaw =
    safeString(obj.fullName).trim() ||
    safeString(obj.name).trim() ||
    safeString(obj.contactName).trim() ||
    safeString(obj.companyName).trim() ||
    safeString(obj.businessName).trim() ||
    safeString(obj.legalName).trim();

  let firstName =
    safeString(obj.firstName).trim() ||
    safeString(obj.givenName).trim() ||
    safeString(obj.nombre).trim();
  let lastName =
    safeString(obj.lastName).trim() ||
    safeString(obj.familyName).trim() ||
    safeString(obj.apellidos).trim();

  if ((!firstName || !lastName) && fullNameRaw) {
    const parts = fullNameRaw.split(" ").filter(Boolean);
    if (!firstName) firstName = parts[0] ?? "";
    if (!lastName) lastName = parts.slice(1).join(" ");
  }

  if (!firstName && lastName) {
    firstName = lastName;
    lastName = "";
  }

  if (!firstName) {
    return null;
  }

  const dni =
    safeString(obj.dni).trim() ||
    safeString(obj.nationalId).trim() ||
    safeString(obj.document).trim() ||
    safeString(obj.nif).trim() ||
    safeString(obj.cif).trim();

  const kindRaw = normalizeContactKindValue(obj.kind);
  const contactKindRaw = normalizeContactKindValue(obj.contactKind);
  const isEntityFlag =
    kindRaw === "entity" ||
    contactKindRaw === "entity" ||
    safeString(obj.isEntity).trim().toLowerCase() === "true";
  const kind: ContactKind = isEntityFlag ? "entity" : "person";

  const types = splitList(obj.types)
    .map((entry) => normalizeContactTypeValue(entry))
    .filter((entry): entry is ContactType => !!entry);

  const role = safeString(obj.role).trim().toLowerCase();
  const inferredType =
    normalizeContactTypeValue(role) ??
    normalizeContactTypeValue(obj.contactType) ??
    normalizeContactTypeValue(obj.profileType);
  const normalizedTypes = Array.from(
    new Set<ContactType>(types.length > 0 ? types : inferredType ? [inferredType] : [])
  );

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
    obj.consentDocumentIds ?? obj.privacyDocumentIds ?? obj.consentDocs
  );

  return {
    id: ensureId(obj.id),
    kind,
    firstName,
    lastName,
    representativeFirstName:
      normalizeOptionalText(obj.representativeFirstName) ??
      normalizeOptionalText(obj.representativeName),
    representativeLastName:
      normalizeOptionalText(obj.representativeLastName),
    dni,
    fullName: fullNameRaw || `${firstName} ${lastName}`.trim() || undefined,
    email:
      normalizeOptionalText(obj.email) ??
      normalizeOptionalText(obj.emailAddress),
    phone:
      normalizeOptionalText(obj.phone) ??
      normalizeOptionalText(obj.mobile) ??
      normalizeOptionalText(obj.telephone),
    secondaryPhone:
      normalizeOptionalText(obj.secondaryPhone) ??
      normalizeOptionalText(obj.phone2),
    website:
      normalizeOptionalText(obj.website) ??
      normalizeOptionalText(obj.web),
    postalCode:
      normalizeOptionalText(obj.postalCode) ??
      normalizeOptionalText(obj.zipCode),
    address: normalizeAddress(obj.address),
    city: normalizeOptionalText(obj.city),
    region: normalizeOptionalText(obj.region),
    birthDate:
      normalizeDateString(obj.birthDate) ??
      normalizeDateString(obj.dateOfBirth),
    photoUrl: normalizeOptionalText(obj.photoUrl),
    types: normalizedTypes,
    membershipPlanId:
      normalizeOptionalText(obj.membershipPlanId) ??
      normalizeOptionalText(obj.feePlanId) ??
      normalizeOptionalText(obj.membershipTypeId),
    accountingAccountType:
      normalizeContactTypeValue(obj.accountingAccountType) ?? undefined,
    accountingAccountCode: normalizeOptionalText(obj.accountingAccountCode),
    accountingAccountLabel: normalizeOptionalText(obj.accountingAccountLabel),
    privacyPermissions: normalizeContactPrivacyPermissions({
      image:
        parseBoolean(
          privacySource.image ??
            obj.imageConsent ??
            obj.imagePermission ??
            obj.imageAuthorized
        ) ?? undefined,
      voice:
        parseBoolean(
          privacySource.voice ??
            obj.voiceConsent ??
            obj.voicePermission ??
            obj.voiceAuthorized
        ) ?? undefined,
      communications:
        parseBoolean(
          privacySource.communications ??
            obj.communicationConsent ??
            obj.communicationsConsent ??
            obj.newsletterConsent
        ) ?? undefined,
      services:
        parseBoolean(
          privacySource.services ??
            obj.serviceConsent ??
            obj.servicesConsent ??
            obj.servicesAuthorized
        ) ?? undefined,
    }),
    privacyUpdatedAt:
      normalizeDateString(obj.privacyUpdatedAt) ??
      normalizeDateString(obj.consentUpdatedAt),
    consentDocumentIds: consentDocumentIds.length
      ? consentDocumentIds
      : undefined,
    tags: tags.length ? tags : undefined,
    notes: normalizeOptionalText(obj.notes),
    createdAt:
      normalizeDateString(obj.createdAt) ??
      normalizeDateString(obj.joinedAt) ??
      nowIso(),
    deactivatedAt:
      normalizeDateString(obj.deactivatedAt) ??
      normalizeDateString(obj.archivedAt) ??
      normalizeDateString(obj.inactiveAt),
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
  const contactIds = splitList(obj.contactIds ?? obj.relatedContactIds);

  const amountSource =
    obj.amount ??
    obj.importe ??
    obj.importeTotal ??
    obj.precio ??
    obj.price ??
    obj.cuantia ??
    obj.cantidad ??
    obj.total ??
    obj.value;
  const rawAmount = parseNumber(amountSource) ?? 0;
  const amount = Math.abs(rawAmount);
  const explicitType = normalizeTransactionTypeValue(
    obj.type ??
      obj.transactionType ??
      obj.tipo ??
      obj.kind ??
      obj.movementType
  );
  const type: TransactionType =
    explicitType ??
    (rawAmount < 0 ||
    "precio" in obj ||
    "price" in obj ||
    "cost" in obj ||
    "coste" in obj ||
    "gasto" in obj ||
    "especificaciones" in obj
      ? "expense"
      : "income");

  const date =
    normalizeIsoDateOnly(
      obj.date ??
        obj.fecha ??
        obj.transactionDate ??
        obj.paidAt ??
        obj.createdAt
    ) ?? "";
  const concept =
    safeString(obj.concept).trim() ||
    safeString(obj.concepto).trim() ||
    safeString(obj.title).trim() ||
    safeString(obj.name).trim() ||
    safeString(obj.nombre).trim() ||
    safeString(obj.entity).trim() ||
    safeString(obj.entidad).trim() ||
    safeString(obj.contactName).trim() ||
    safeString(obj.description).trim();

  const description =
    safeString(obj.description).trim() ||
    safeString(obj.descripcion).trim() ||
    safeString(obj.especificaciones).trim() ||
    safeString(obj.details).trim() ||
    undefined;

  const category =
    normalizeTransactionCategoryValue(
      obj.category ?? obj.categoria ?? obj.categoryName
    ) ??
    normalizeTransactionCategoryValue(concept) ??
    normalizeTransactionCategoryValue(description) ??
    "other";

  const status =
    normalizeTransactionStatusValue(
      obj.status ?? obj.estado ?? obj.paymentStatus
    ) ?? "completed";

  if (!date || !concept || amount <= 0) return null;

  return {
    id: ensureId(obj.id),
    type,
    amount,
    date,
    concept,
    description,
    paymentMethod:
      safeString(obj.paymentMethod).trim() ||
      safeString(obj.metodoPago).trim() ||
      safeString(obj.formaPago).trim() ||
      undefined,
    category,
    status,
    eventId:
      safeString(obj.eventId) || safeString(obj.relatedEventId) || undefined,
    contactId:
      safeString(obj.contactId) ||
      safeString(obj.relatedContactId) ||
      contactIds[0] ||
      undefined,
    contactIds: contactIds.length ? contactIds : undefined,
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

function getFileExtension(value: string) {
  const parts = value.split(".");
  if (parts.length <= 1) return "";
  return parts.pop()?.toLowerCase() ?? "";
}

function inferDocumentType(name: string): DocumentType {
  const extension = getFileExtension(name);

  if (extension === "pdf") return "pdf";
  if (["doc", "docx", "odt"].includes(extension)) return "doc";
  if (["xls", "xlsx"].includes(extension)) return "sheet";
  if (extension === "csv") return "csv";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
    return "image";
  }

  return "other";
}

function inferDocumentCategory(type: DocumentType): DocumentCategory {
  if (type === "pdf") return "PDF";
  if (type === "doc") return "Contratos";
  if (type === "sheet" || type === "csv") return "Hojas de Calculo";
  if (type === "image") return "Imagenes";
  if (type === "folder") return "Carpetas";
  return "PDF";
}

function normalizeDocument(value: unknown): DocumentItem | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  const name =
    safeString(obj.name).trim() || safeString(obj.title).trim();

  if (!name) return null;

  const typeRaw = safeString(obj.type).trim();
  const type: DocumentType = DOCUMENT_TYPES.includes(typeRaw as DocumentType)
    ? (typeRaw as DocumentType)
    : inferDocumentType(name);

  const categoryRaw = safeString(obj.category).trim();
  const category: DocumentCategory = DOCUMENT_CATEGORIES.includes(
    categoryRaw as DocumentCategory
  )
    ? (categoryRaw as DocumentCategory)
    : inferDocumentCategory(type);

  const securityRaw = safeString(obj.security).trim();
  const security: DocumentSecurity = DOCUMENT_SECURITIES.includes(
    securityRaw as DocumentSecurity
  )
    ? (securityRaw as DocumentSecurity)
    : "Privado";

  const versions = Array.isArray(obj.versions)
    ? obj.versions
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const version = entry as Record<string, unknown>;
          const label = safeString(version.label).trim();
          const author = safeString(version.author).trim();
          const time = safeString(version.time).trim();

          if (!label && !author && !time) return null;

          return {
            id: ensureId(version.id),
            label: label || "Version",
            author: author || "Kora",
            time: time || nowIso(),
          };
        })
        .filter(
          (entry): entry is NonNullable<typeof entry> =>
            entry !== null
        )
    : [];

  return {
    id: ensureId(obj.id),
    name,
    category,
    security,
    type,
    size: Math.max(0, parseNumber(obj.size) ?? 0),
    mimeType:
      safeString(obj.mimeType).trim() || "application/octet-stream",
    location: safeString(obj.location).trim() || "/Documentos",
    owner: safeString(obj.owner).trim() || "Kora",
    createdAt: safeString(obj.createdAt).trim() || nowIso(),
    updatedAt:
      safeString(obj.updatedAt).trim() ||
      safeString(obj.createdAt).trim() ||
      nowIso(),
    access: splitList(obj.access),
    versions: versions.length ? versions : undefined,
  };
}

function normalizeInventoryItem(value: unknown): InventoryItem | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  const name =
    safeString(obj.name).trim() || safeString(obj.title).trim();

  if (!name) return null;

  const quantity = Math.max(1, Math.round(parseNumber(obj.quantity) ?? 1));
  const borrowed = Math.max(
    0,
    Math.min(quantity, Math.round(parseNumber(obj.borrowed) ?? 0))
  );
  const statusRaw = safeString(obj.status).trim();
  const status: InventoryStatus = INVENTORY_STATUSES.includes(
    statusRaw as InventoryStatus
  )
    ? (statusRaw as InventoryStatus)
    : borrowed > 0
      ? "in_use"
      : "available";

  return {
    id: ensureId(obj.id),
    name,
    category: safeString(obj.category).trim() || "General",
    quantity,
    borrowed,
    status,
    serial: safeString(obj.serial).trim() || undefined,
    location: safeString(obj.location).trim() || undefined,
    assignee: safeString(obj.assignee).trim() || undefined,
    acquisitionDate:
      safeString(obj.acquisitionDate).trim() || undefined,
    value: parseNumber(obj.value),
    notes: safeString(obj.notes).trim() || undefined,
    photoUrl: safeString(obj.photoUrl).trim() || undefined,
    createdAt: safeString(obj.createdAt).trim() || nowIso(),
    updatedAt:
      safeString(obj.updatedAt).trim() ||
      safeString(obj.createdAt).trim() ||
      nowIso(),
  };
}

function normalizeVolunteerActivity(value: unknown): VolunteerActivity | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  const contactId =
    safeString(obj.contactId).trim() ||
    safeString(obj.memberId).trim() ||
    safeString(obj.volunteerId).trim();
  const date =
    safeString(obj.date).trim() || safeString(obj.activityDate).trim();
  const hours =
    parseNumber(obj.hours) ?? parseNumber(obj.durationHours) ?? 0;

  if (!contactId || !date || hours <= 0) return null;

  const profileTypeRaw = safeString(obj.profileType).trim();
  const profileType: VolunteerProfileType = VOLUNTEER_PROFILE_TYPES.includes(
    profileTypeRaw as VolunteerProfileType
  )
    ? (profileTypeRaw as VolunteerProfileType)
    : "contact";

  return {
    id: ensureId(obj.id),
    contactId,
    profileType,
    date,
    hours,
    eventId: safeString(obj.eventId).trim() || undefined,
    notes: safeString(obj.notes).trim() || undefined,
    createdAt: safeString(obj.createdAt).trim() || nowIso(),
  };
}

function normalizeMessageTemplate(value: unknown): MessageTemplate | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  const title =
    safeString(obj.title).trim() || safeString(obj.name).trim();
  const subject = safeString(obj.subject).trim();
  const html =
    safeString(obj.html).trim() || safeString(obj.body).trim();

  if (!title || !subject || !html) return null;

  return {
    id: ensureId(obj.id),
    title,
    channel: "email",
    subject,
    html,
    createdAt: safeString(obj.createdAt).trim() || nowIso(),
    updatedAt:
      safeString(obj.updatedAt).trim() ||
      safeString(obj.createdAt).trim() ||
      nowIso(),
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractImportArray(data: unknown, keys: string[]) {
  const candidates: unknown[] = [data];

  if (isObjectRecord(data)) {
    candidates.push(data.data, data.payload, data.export, data.result);
  }

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (!isObjectRecord(candidate)) {
      continue;
    }

    for (const key of keys) {
      const value = candidate[key];
      if (Array.isArray(value)) {
        return value;
      }
      if (isObjectRecord(value)) {
        if (Array.isArray(value.records)) return value.records;
        if (Array.isArray(value.items)) return value.items;
        if (Array.isArray(value.data)) return value.data;
      }
    }

    if (Array.isArray(candidate.records)) return candidate.records;
    if (Array.isArray(candidate.items)) return candidate.items;
  }

  return [];
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
    const [
      contacts,
      events,
      transactions,
      documents,
      inventory,
      volunteerActivities,
      messagingTemplates,
    ] = await Promise.all([
      listAssociationModuleRecords<Contact>("contacts"),
      listAssociationModuleRecords<Event>("events"),
      listAssociationModuleRecords<Transaction>("transactions"),
      listAssociationModuleRecords<DocumentItem>("documents"),
      listAssociationModuleRecords<InventoryItem>("inventory"),
      listAssociationModuleRecords<VolunteerActivity>("volunteerActivities"),
      listAssociationModuleRecords<MessageTemplate>("messagingTemplates"),
    ]);

    const payload: KoraExportPayload = {
      version: 2,
      exportedAt: nowIso(),
      associationProfile: association,
      contacts,
      events,
      transactions,
      documents,
      inventory,
      volunteerActivities,
      messagingTemplates,
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

    if (scope === "documents") {
      const documents =
        await listAssociationModuleRecords<DocumentItem>("documents");
      const payload = { version: 2 as const, exportedAt, documents };
      downloadTextFile(
        "kora-documents.json",
        JSON.stringify(payload, null, 2),
        "application/json"
      );
      return;
    }

    if (scope === "inventory") {
      const inventory =
        await listAssociationModuleRecords<InventoryItem>("inventory");
      const payload = { version: 2 as const, exportedAt, inventory };
      downloadTextFile(
        "kora-inventory.json",
        JSON.stringify(payload, null, 2),
        "application/json"
      );
      return;
    }

    if (scope === "volunteerActivities") {
      const volunteerActivities =
        await listAssociationModuleRecords<VolunteerActivity>(
          "volunteerActivities"
        );
      const payload = {
        version: 2 as const,
        exportedAt,
        volunteerActivities,
      };
      downloadTextFile(
        "kora-volunteerActivities.json",
        JSON.stringify(payload, null, 2),
        "application/json"
      );
      return;
    }

    if (scope === "messagingTemplates") {
      const messagingTemplates =
        await listAssociationModuleRecords<MessageTemplate>(
          "messagingTemplates"
        );
      const payload = {
        version: 2 as const,
        exportedAt,
        messagingTemplates,
      };
      downloadTextFile(
        "kora-messagingTemplates.json",
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

  const applyImport = async (payload: Partial<KoraExportPayload>) => {
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
    const documents = (payload.documents ?? [])
      .map(normalizeDocument)
      .filter(Boolean) as DocumentItem[];
    const inventory = (payload.inventory ?? [])
      .map(normalizeInventoryItem)
      .filter(Boolean) as InventoryItem[];
    const volunteerActivities = (payload.volunteerActivities ?? [])
      .map(normalizeVolunteerActivity)
      .filter(Boolean) as VolunteerActivity[];
    const messagingTemplates = (payload.messagingTemplates ?? [])
      .map(normalizeMessageTemplate)
      .filter(Boolean) as MessageTemplate[];
    const tasks: Array<Promise<unknown>> = [];

    if (importScope === "all" || importScope === "contacts") {
      tasks.push(
        saveAssociationModuleRecordsInBatches<Contact>(
          "contacts",
          contacts,
          importMode
        )
      );
    }

    if (importScope === "all" || importScope === "events") {
      tasks.push(
        saveAssociationModuleRecordsInBatches<Event>(
          "events",
          events,
          importMode
        )
      );
    }

    if (importScope === "all" || importScope === "transactions") {
      tasks.push(
        saveAssociationModuleRecordsInBatches<Transaction>(
          "transactions",
          transactions,
          importMode
        )
      );
    }

    if (importScope === "all" || importScope === "documents") {
      tasks.push(
        saveAssociationModuleRecordsInBatches<DocumentItem>(
          "documents",
          documents,
          importMode
        )
      );
    }

    if (importScope === "all" || importScope === "inventory") {
      tasks.push(
        saveAssociationModuleRecordsInBatches<InventoryItem>(
          "inventory",
          inventory,
          importMode
        )
      );
    }

    if (importScope === "all" || importScope === "volunteerActivities") {
      tasks.push(
        saveAssociationModuleRecordsInBatches<VolunteerActivity>(
          "volunteerActivities",
          volunteerActivities,
          importMode
        )
      );
    }

    if (importScope === "all" || importScope === "messagingTemplates") {
      tasks.push(
        saveAssociationModuleRecordsInBatches<MessageTemplate>(
          "messagingTemplates",
          messagingTemplates,
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
      documents: documents.length,
      inventory: inventory.length,
      volunteerActivities: volunteerActivities.length,
      messagingTemplates: messagingTemplates.length,
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
        contacts: extractImportArray(data, ["contacts", "members", "people"]) as Contact[],
        events: extractImportArray(data, ["events"]) as Event[],
        transactions: extractImportArray(data, TRANSACTION_IMPORT_KEYS) as Transaction[],
        documents: extractImportArray(data, ["documents"]) as DocumentItem[],
        inventory: extractImportArray(data, ["inventory", "resources"]) as InventoryItem[],
        volunteerActivities: extractImportArray(data, [
          "volunteerActivities",
          "activities",
        ]) as VolunteerActivity[],
        messagingTemplates: extractImportArray(data, [
          "messagingTemplates",
          "templates",
        ]) as MessageTemplate[],
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
      const contacts = extractImportArray(data, [
        "contacts",
        "members",
        "people",
      ]) as Contact[];
      return applyImport({ contacts });
    }

    if (importScope === "events") {
      const events = extractImportArray(data, ["events"]) as Event[];
      return applyImport({ events });
    }

    if (importScope === "transactions") {
      const transactions = extractImportArray(
        data,
        TRANSACTION_IMPORT_KEYS
      ) as Transaction[];
      return applyImport({ transactions });
    }

    if (importScope === "documents") {
      const documents = extractImportArray(data, ["documents"]) as DocumentItem[];
      return applyImport({ documents });
    }

    if (importScope === "inventory") {
      const inventory = extractImportArray(data, [
        "inventory",
        "resources",
      ]) as InventoryItem[];
      return applyImport({ inventory });
    }

    if (importScope === "volunteerActivities") {
      const volunteerActivities = extractImportArray(data, [
        "volunteerActivities",
        "activities",
      ]) as VolunteerActivity[];
      return applyImport({ volunteerActivities });
    }

    if (importScope === "messagingTemplates") {
      const messagingTemplates = extractImportArray(data, [
        "messagingTemplates",
        "templates",
      ]) as MessageTemplate[];
      return applyImport({ messagingTemplates });
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
        `Importación completada. Perfil: ${result.profile}, Contactos: ${result.contacts}, Eventos: ${result.events}, Contabilidad: ${result.transactions}, Documentos: ${result.documents}, Inventario: ${result.inventory}, Voluntariado: ${result.volunteerActivities}, Plantillas: ${result.messagingTemplates}.`
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
    return (
      <LoadingSpinner
        fullHeight
        label="Cargando migracion..."
        description="La configuracion de importacion y exportacion estara disponible enseguida."
        className="min-h-screen border-0 bg-background-light shadow-none"
      />
    );
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

      <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
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
                  {association?.name ?? "Sin perfil"}
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
                    {association?.name ?? "Sin perfil"}
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
