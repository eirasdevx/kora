"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageTopbar from "@/components/PageTopbar";
import BackLink from "@/components/shared/BackLink";
import SectionBlock from "@/components/shared/SectionBlock";
import {
  tableBodyStyles,
  tableEmptyCellStyles,
  tableHeadCellStyles,
  tableHeadStyles,
  tableIconActionStyles,
  tableRowStyles,
  tableWrapperStyles,
} from "@/components/shared/tableStyles";
import { useLocale } from "@/core/i18n/use-locale";
import {
  getContactMembershipPlan,
  getMembershipExecutionLabel,
  getNextMembershipChargeDate,
} from "@/core/session/membership-settings";
import { useSessionStore } from "@/core/session/session.store";
import {
  areContactPrivacyPermissionsEqual,
  normalizeContactPrivacyPermissions,
} from "@/modules/contacts/contact-privacy";
import {
  Contact,
  ContactPrivacyPermissions,
} from "@/modules/contacts/contact.types";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import { useDocumentsStore } from "@/modules/documents/documents.store";
import {
  DocumentCategory,
  DocumentItem,
  DocumentSecurity,
  DocumentType,
} from "@/modules/documents/document.types";
import {
  formatMemberId,
  resolveMemberTier,
} from "@/modules/people/people.utils";

type PaymentStatus = "Pagado" | "Pendiente";

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  Pagado: "bg-emerald-50 text-emerald-700",
  Pendiente: "bg-amber-50 text-amber-700",
};

const CONSENT_FILE_ACCEPT =
  "application/pdf,image/*,.doc,.docx,.odt,.png,.jpg,.jpeg,.webp";

const PRIVACY_PERMISSION_ITEMS: Array<{
  key: keyof ContactPrivacyPermissions;
  label: string;
  title: string;
  subtitle: string;
  icon: string;
}> = [
  {
    key: "image",
    label: "I",
    title: "Imagen",
    subtitle: "Uso de fotografias y material audiovisual.",
    icon: "image",
  },
  {
    key: "voice",
    label: "V",
    title: "Voz",
    subtitle: "Grabaciones de audio en actividades y eventos.",
    icon: "mic",
  },
  {
    key: "communications",
    label: "C",
    title: "Comunicaciones",
    subtitle: "Avisos, boletines y comunicaciones informativas.",
    icon: "mail",
  },
  {
    key: "services",
    label: "S",
    title: "Servicios",
    subtitle: "Gestión de datos para acceso a servicios y actividades.",
    icon: "workspace_premium",
  },
];

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | undefined, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | undefined, locale: string) {
  if (!value) return "Sin registrar";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin registrar";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMonthDay(value: Date, locale: string) {
  return value.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
  });
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

function getDisplayName(
  firstName?: string,
  lastName?: string,
  fallback?: string
) {
  const composed = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  if (composed) return composed;
  return fallback ?? "Sin nombre";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTypeFromName(name: string): DocumentType {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "pdf") return "pdf";
  if (["doc", "docx", "odt"].includes(extension)) return "doc";
  if (["xls", "xlsx"].includes(extension)) return "sheet";
  if (extension === "csv") return "csv";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
    return "image";
  }
  return "other";
}

function getCategoryFromType(type: DocumentType): DocumentCategory {
  if (type === "pdf") return "PDF";
  if (type === "doc") return "Contratos";
  if (type === "sheet" || type === "csv") return "Hojas de Calculo";
  if (type === "image") return "Imagenes";
  return "PDF";
}

function buildConsentDocumentFromFile(
  file: File,
  locale: string,
  memberId: string,
  owner: string
): DocumentItem {
  const now = new Date();
  const type = getTypeFromName(file.name);
  const security: DocumentSecurity = "Privado";

  return {
    id: createId(),
    name: file.name,
    category: getCategoryFromType(type),
    security,
    type,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    location: `/Socios/${memberId}/Consentimientos`,
    owner,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    file,
    access: [`member:${memberId}`, "administracion"],
    versions: [
      {
        id: createId(),
        label: "v1.0 - Consentimiento subido",
        author: owner,
        time: new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit",
        }).format(now),
      },
    ],
  };
}

export default function MemberDetailPageView() {
  const { formatLocale } = useLocale();
  const params = useParams();
  const memberId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { contacts, loadContacts, addContact } = useContactsStore();
  const { transactions, loadTransactions } = useTransactionsStore();
  const { documents, loadDocuments, upsertDocuments, deleteDocument } =
    useDocumentsStore();
  const association = useSessionStore((state) => state.association);
  const consentInputRef = useRef<HTMLInputElement | null>(null);
  const [permissionDraft, setPermissionDraft] =
    useState<ContactPrivacyPermissions>(
      normalizeContactPrivacyPermissions()
    );
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [isUploadingConsents, setIsUploadingConsents] = useState(false);
  const [deletingConsentId, setDeletingConsentId] = useState("");

  useEffect(() => {
    void loadContacts();
    void loadTransactions();
    void loadDocuments();
  }, [loadContacts, loadTransactions, loadDocuments]);

  const member = useMemo(
    () => contacts.find((contact) => contact.id === memberId),
    [contacts, memberId]
  );

  const storedPermissions = useMemo(
    () => normalizeContactPrivacyPermissions(member?.privacyPermissions),
    [member?.privacyPermissions]
  );

  const feePlan = useMemo(
    () => getContactMembershipPlan(member, association),
    [association, member]
  );

  const membershipTransactions = useMemo(() => {
    if (!memberId) return [];
    return transactions.filter(
      (tx) =>
        tx.category === "membership" &&
        (tx.contactId === memberId || tx.contactIds?.includes(memberId))
    );
  }, [transactions, memberId]);

  const paymentHistory = useMemo(
    () =>
      [...membershipTransactions]
        .filter((tx) => tx.status === "completed")
        .sort(
          (left, right) =>
            new Date(right.date).getTime() - new Date(left.date).getTime()
        )
        .slice(0, 4),
    [membershipTransactions]
  );

  const pendingAmount = useMemo(
    () =>
      membershipTransactions
        .filter((tx) => tx.status === "pending")
        .reduce((sum, tx) => sum + tx.amount, 0),
    [membershipTransactions]
  );

  const consentDocuments = useMemo(() => {
    if (!member) return [];
    const linkedIds = new Set(member.consentDocumentIds ?? []);
    return documents
      .filter(
        (doc) =>
          linkedIds.has(doc.id) ||
          doc.access?.includes(`member:${member.id}`) ||
          doc.access?.includes(member.id)
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [documents, member]);

  useEffect(() => {
    setPermissionDraft({
      image: storedPermissions.image,
      voice: storedPermissions.voice,
      communications: storedPermissions.communications,
      services: storedPermissions.services,
    });
  }, [
    memberId,
    storedPermissions.image,
    storedPermissions.voice,
    storedPermissions.communications,
    storedPermissions.services,
  ]);

  if (!member) {
    return (
      <div className="space-y-6">
        <PageTopbar>
          <div className="space-y-4">
            <BackLink href="/people/members" label="Volver a Socios" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Socio no encontrado
              </h1>
              <p className="text-sm text-gray-500">
                No pudimos localizar este perfil.
              </p>
            </div>
          </div>
        </PageTopbar>
      </div>
    );
  }

  const tier = resolveMemberTier(member.id);
  const memberIdLabel = formatMemberId(member.id);
  const displayName = getDisplayName(
    member.firstName,
    member.lastName,
    member.fullName
  );
  const initials = getInitials(displayName);
  const memberSince = formatDate(member.createdAt, formatLocale);
  const memberSinceYear = member.createdAt
    ? new Date(member.createdAt).getFullYear()
    : new Date().getFullYear();
  const years = Math.max(0, new Date().getFullYear() - memberSinceYear);
  const nextChargeDate = getNextMembershipChargeDate(feePlan);
  const currentBalanceLabel = pendingAmount > 0 ? "Pendiente" : "Al día";
  const hasUnsavedPermissionChanges = !areContactPrivacyPermissionsEqual(
    permissionDraft,
    storedPermissions
  );

  const persistMember = async (updates: Partial<Contact>) => {
    await addContact({
      ...member,
      ...updates,
    });
  };

  const handlePermissionToggle = (key: keyof ContactPrivacyPermissions) => {
    setPermissionDraft((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleSavePermissions = async () => {
    setIsSavingPermissions(true);
    try {
      await persistMember({
        privacyPermissions: permissionDraft,
        privacyUpdatedAt: new Date().toISOString(),
      });
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleConsentFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploadingConsents(true);
    try {
      const nextDocuments = Array.from(files).map((file) =>
        buildConsentDocumentFromFile(file, formatLocale, member.id, displayName)
      );
      await upsertDocuments(nextDocuments);

      const nextDocumentIds = new Set(member.consentDocumentIds ?? []);
      nextDocuments.forEach((doc) => {
        nextDocumentIds.add(doc.id);
      });

      await persistMember({
        consentDocumentIds: Array.from(nextDocumentIds),
      });
    } finally {
      if (consentInputRef.current) {
        consentInputRef.current.value = "";
      }
      setIsUploadingConsents(false);
    }
  };

  const handleDownloadConsent = (doc: DocumentItem) => {
    if (!doc.file) return;
    const url = URL.createObjectURL(doc.file);
    const link = document.createElement("a");
    link.href = url;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDeleteConsent = async (doc: DocumentItem) => {
    setDeletingConsentId(doc.id);
    try {
      await deleteDocument(doc.id);
      await persistMember({
        consentDocumentIds: (member.consentDocumentIds ?? []).filter(
          (id) => id !== doc.id
        ),
      });
    } finally {
      setDeletingConsentId("");
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageTopbar>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <BackLink href="/people/members" label="Volver a Socios" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Ficha de Socio: {displayName}
              </h1>
              <p className="text-sm text-gray-500">
                Datos, pagos y permisos del socio.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                <span className="material-symbols-outlined text-[18px]">
                  search
                </span>
              </span>
              <input
                type="text"
                placeholder="Buscar socio..."
                className="w-64 rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600">
              <span className="material-symbols-outlined text-[20px]">
                notifications
              </span>
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials || "JD"}
            </span>
          </div>
        </div>
      </PageTopbar>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-6">
            <div className="relative h-24 w-24">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-primary/10 text-xl font-semibold text-primary shadow-sm">
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {displayName}
                </h2>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  ACTIVO
                </span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {tier.toUpperCase()}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">ID: {memberIdLabel}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-gray-400">
                    calendar_today
                  </span>
                  Miembro desde {memberSince}
                </span>
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-gray-400">
                    military_tech
                  </span>
                  Antiguedad: {years} anos
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href={`/contacts/${member.id}/edit`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow"
              >
                <span className="material-symbols-outlined text-[18px]">
                  edit
                </span>
                Editar Perfil
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  download
                </span>
                Descargar Ficha
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 p-6 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
              <span className="material-symbols-outlined text-[20px]">
                groups
              </span>
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                Asociación
              </p>
              <p className="text-lg font-semibold">
                {association?.name || "Kora"}
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">{displayName}</p>
              <p className="text-sm text-white/80">Socio {tier}</p>
              <p className="text-sm text-white/80">{memberIdLabel}</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl font-semibold">
              {initials}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-white/70">Validez</p>
              <p className="text-lg font-semibold">{new Date().getFullYear()}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <span className="material-symbols-outlined text-[24px]">
                qr_code_2
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Saldo actual
              </p>
              <p className="mt-3 text-3xl font-semibold text-gray-900">
                {formatCurrency(pendingAmount, formatLocale)}
              </p>
              <p
                className={`mt-1 text-xs ${
                  pendingAmount > 0 ? "text-amber-600" : "text-emerald-600"
                }`}
              >
                {currentBalanceLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Proximo cobro
              </p>
              <p className="mt-3 text-3xl font-semibold text-gray-900">
                {formatMonthDay(nextChargeDate, formatLocale)}
              </p>
              <p className="mt-1 text-xs text-gray-500">{feePlan.name}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Plan asignado
              </p>
              <p className="mt-3 text-lg font-semibold text-gray-900">
                {formatCurrency(feePlan.amount, formatLocale)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {feePlan.name} · {getMembershipExecutionLabel(feePlan)}
              </p>
            </div>
          </div>

          <SectionBlock
            title="Historial de Pagos Recientes"
            subtitle="Últimos movimientos de cuota"
            actions={
              <Link href="/finance" className="text-xs font-semibold text-primary">
                Ver todo
              </Link>
            }
          >
            <div className={tableWrapperStyles}>
              <table className="w-full text-left text-sm">
                <thead className={tableHeadStyles}>
                  <tr>
                    <th className={tableHeadCellStyles}>Fecha</th>
                    <th className={tableHeadCellStyles}>Categoría</th>
                    <th className={tableHeadCellStyles}>Importe</th>
                    <th className={tableHeadCellStyles}>Estado</th>
                    <th className={`${tableHeadCellStyles} text-right`}>
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className={tableBodyStyles}>
                  {paymentHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={tableEmptyCellStyles}>
                        No hay pagos registrados todavia.
                      </td>
                    </tr>
                  ) : (
                    paymentHistory.map((tx) => (
                      <tr key={tx.id} className={tableRowStyles}>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(tx.date, formatLocale)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {tx.membershipPlanName ?? feePlan.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {feePlan.cycle} · {tier}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {formatCurrency(tx.amount, formatLocale)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              PAYMENT_STYLES[
                                tx.status === "completed"
                                  ? "Pagado"
                                  : "Pendiente"
                              ]
                            }`}
                          >
                            {tx.status === "completed" ? "Pagado" : "Pendiente"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            className={tableIconActionStyles}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              receipt_long
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionBlock>
        </div>

        <SectionBlock
          title="Privacidad y Servicios"
          subtitle="Permisos editables y documentos de consentimiento vinculados al socio."
          actions={
            <button
              type="button"
              onClick={handleSavePermissions}
              disabled={!hasUnsavedPermissionChanges || isSavingPermissions}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                save
              </span>
              {isSavingPermissions ? "Guardando..." : "Guardar"}
            </button>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                Última revisión
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {formatDateTime(member.privacyUpdatedAt, formatLocale)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Los cambios se guardan en la ficha del socio y se reutilizan en toda la app.
              </p>
            </div>

            <div className="space-y-3">
              {PRIVACY_PERMISSION_ITEMS.map((item) => {
                const enabled = permissionDraft[item.key];
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-600">
                        <span className="material-symbols-outlined text-[18px]">
                          {item.icon}
                        </span>
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">
                            {item.title}
                          </p>
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-gray-500">
                            {item.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          enabled
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {enabled ? "Autorizado" : "No autorizado"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePermissionToggle(item.key)}
                        aria-pressed={enabled}
                        className={`relative inline-flex h-7 w-12 rounded-full transition ${
                          enabled ? "bg-emerald-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                            enabled ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <div className="text-xs text-gray-500">
                {hasUnsavedPermissionChanges
                  ? "Hay cambios pendientes de guardar."
                  : "Permisos sincronizados con la ficha del socio."}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPermissionDraft(storedPermissions)}
                  disabled={!hasUnsavedPermissionChanges}
                  className="inline-flex items-center rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={!hasUnsavedPermissionChanges || isSavingPermissions}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    save
                  </span>
                  {isSavingPermissions ? "Guardando..." : "Guardar permisos"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Documentos de consentimiento
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Sube los consentimientos firmados del socio y quedan vinculados a su ficha.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/documents"
                    className="inline-flex items-center rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Biblioteca
                  </Link>
                  <button
                    type="button"
                    onClick={() => consentInputRef.current?.click()}
                    disabled={isUploadingConsents}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      upload_file
                    </span>
                    {isUploadingConsents ? "Subiendo..." : "Subir documento"}
                  </button>
                </div>
              </div>

              <input
                ref={consentInputRef}
                type="file"
                accept={CONSENT_FILE_ACCEPT}
                multiple
                className="sr-only"
                onChange={(event) =>
                  void handleConsentFilesSelected(event.target.files)
                }
              />

              {consentDocuments.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                  No hay consentimientos subidos todavia para este socio.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {consentDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {doc.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatBytes(doc.size)} - Actualizado{" "}
                          {formatDateTime(doc.updatedAt, formatLocale)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadConsent(doc)}
                          className={tableIconActionStyles}
                          aria-label={`Descargar ${doc.name}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            download
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteConsent(doc)}
                          disabled={deletingConsentId === doc.id}
                          className={tableIconActionStyles}
                          aria-label={`Eliminar ${doc.name}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionBlock>
      </section>
    </div>
  );
}
