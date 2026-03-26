"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageTopbar from "@/components/PageTopbar";
import BackLink from "@/components/shared/BackLink";
import SectionBlock from "@/components/shared/SectionBlock";
import SortableHeader from "@/components/shared/SortableHeader";
import {
  tableBodyStyles,
  tableEmptyCellStyles,
  tableFooterStyles,
  tableHeadCellStyles,
  tableHeadStyles,
  tableIconActionStyles,
  tableRowStyles,
  tableWrapperStyles,
} from "@/components/shared/tableStyles";
import { useLocale } from "@/core/i18n/use-locale";
import {
  applySortDirection,
  compareDate,
  compareNumber,
  compareText,
  SortState,
  toggleSort,
} from "@/lib/table-sorting";
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
import { useVolunteerActivitiesStore } from "@/modules/volunteers/volunteer-activities.store";
import {
  MemberPointRewardCategoryLabels,
  type MemberPointReward,
} from "@/modules/people/member-points.types";
import { useMemberPointsStore } from "@/modules/people/member-points.store";
import {
  getMemberPointsSummary,
  getRewardRemainingStock,
} from "@/modules/people/member-points.utils";
import {
  buildFixedWidthReportLines,
  downloadLinesAsPdf,
} from "@/modules/accounting/accounting-reports";

type PaymentStatus = "Pagado" | "Pendiente";
type MemberPaymentsSortKey = "date" | "category" | "amount" | "status";

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  Pagado: "bg-emerald-50 text-emerald-700",
  Pendiente: "bg-amber-50 text-amber-700",
};

const PAYMENTS_TABLE_SECTION_STYLES =
  "overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm";
const MARKETPLACE_PAGE_SIZE = 8;

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

function formatNumber(value: number, locale: string, decimals = 0) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatHours(value: number, locale: string) {
  return formatNumber(value, locale, Number.isInteger(value) ? 0 : 1);
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

function getPaymentStatus(status: string): PaymentStatus {
  return status === "completed" ? "Pagado" : "Pendiente";
}

function buildPageNumbers(totalPages: number, currentPage: number) {
  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = Math.max(1, currentPage - 1);
  const end = Math.min(totalPages, start + 2);
  if (end - start < 2) {
    start = Math.max(1, end - 2);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
  const activities = useVolunteerActivitiesStore((state) => state.activities);
  const loadActivities = useVolunteerActivitiesStore(
    (state) => state.loadActivities
  );
  const rewards = useMemberPointsStore((state) => state.rewards);
  const redemptions = useMemberPointsStore((state) => state.redemptions);
  const loadPointsData = useMemberPointsStore((state) => state.loadPointsData);
  const pointsHydrated = useMemberPointsStore((state) => state.hydrated);
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
  const [currentRewardsPage, setCurrentRewardsPage] = useState(1);
  const [paymentsSortState, setPaymentsSortState] =
    useState<SortState<MemberPaymentsSortKey>>({
      key: "date",
      direction: "desc",
    });

  useEffect(() => {
    void loadContacts();
    void loadTransactions();
    void loadDocuments();
    void loadActivities();
    void loadPointsData();
  }, [
    loadActivities,
    loadContacts,
    loadDocuments,
    loadPointsData,
    loadTransactions,
  ]);

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

  const sortedPaymentHistory = useMemo(() => {
    return [...membershipTransactions].sort((left, right) => {
      switch (paymentsSortState.key) {
        case "category":
          return applySortDirection(
            compareText(
              left.membershipPlanName ?? feePlan.name,
              right.membershipPlanName ?? feePlan.name,
              formatLocale
            ),
            paymentsSortState.direction
          );
        case "amount":
          return applySortDirection(
            compareNumber(left.amount, right.amount),
            paymentsSortState.direction
          );
        case "status":
          return applySortDirection(
            compareText(
              getPaymentStatus(left.status),
              getPaymentStatus(right.status),
              formatLocale
            ),
            paymentsSortState.direction
          );
        case "date":
        default:
          return applySortDirection(
            compareDate(left.date, right.date),
            paymentsSortState.direction
          );
      }
    });
  }, [feePlan.name, formatLocale, membershipTransactions, paymentsSortState]);

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

  const memberPointsSummary = useMemo(
    () => getMemberPointsSummary(member?.id ?? "", activities, redemptions),
    [activities, member?.id, redemptions]
  );

  const rewardRows = useMemo<
    Array<{
      reward: MemberPointReward;
      remainingStock: number | null;
      affordable: boolean;
      redeemable: boolean;
    }>
  >(() => {
    return rewards
      .filter((reward) => reward.active)
      .map((reward) => {
        const remainingStock = getRewardRemainingStock(reward, redemptions);
        const affordable =
          memberPointsSummary.availablePoints >= reward.pointsCost;
        const redeemable =
          affordable && (remainingStock === null || remainingStock > 0);

        return {
          reward,
          remainingStock,
          affordable,
          redeemable,
        };
      })
      .sort((left, right) => {
        if (left.redeemable !== right.redeemable) {
          return left.redeemable ? -1 : 1;
        }

        const leftOutOfStock = left.remainingStock === 0;
        const rightOutOfStock = right.remainingStock === 0;
        if (leftOutOfStock !== rightOutOfStock) {
          return leftOutOfStock ? 1 : -1;
        }

        const byCost = compareNumber(
          left.reward.pointsCost,
          right.reward.pointsCost
        );
        if (byCost !== 0) return byCost;

        return compareText(
          left.reward.title,
          right.reward.title,
          formatLocale
        );
      });
  }, [formatLocale, memberPointsSummary.availablePoints, redemptions, rewards]);

  const totalRewardPages = useMemo(
    () => Math.max(1, Math.ceil(rewardRows.length / MARKETPLACE_PAGE_SIZE)),
    [rewardRows.length]
  );
  const currentRewardsPageSafe = Math.min(currentRewardsPage, totalRewardPages);
  const pagedRewardRows = useMemo(() => {
    const start = (currentRewardsPageSafe - 1) * MARKETPLACE_PAGE_SIZE;
    return rewardRows.slice(start, start + MARKETPLACE_PAGE_SIZE);
  }, [currentRewardsPageSafe, rewardRows]);
  const rewardPageNumbers = useMemo(
    () => buildPageNumbers(totalRewardPages, currentRewardsPageSafe),
    [currentRewardsPageSafe, totalRewardPages]
  );
  const redeemableRewardsCount = useMemo(
    () => rewardRows.filter((row) => row.redeemable).length,
    [rewardRows]
  );
  const pointsMarketplaceLoading = !pointsHydrated && rewardRows.length === 0;

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

  useEffect(() => {
    setCurrentRewardsPage(1);
  }, [member?.id]);

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
  const memberStatusLabel = member.deactivatedAt ? "Inactivo" : "Activo";
  const memberSheetFileName = `ficha-socio-${memberIdLabel
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()}.pdf`;

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

  const buildMemberSheetLines = () => {
    const contactLines = [
      `Nombre: ${displayName}`,
      `ID socio: ${memberIdLabel}`,
      `Estado: ${memberStatusLabel}`,
      `Nivel: ${tier}`,
      `DNI: ${member.dni?.trim() || "-"}`,
      `Email: ${member.email?.trim() || "-"}`,
      `Telefono principal: ${member.phone?.trim() || "-"}`,
      `Telefono secundario: ${member.secondaryPhone?.trim() || "-"}`,
      `Direccion: ${member.address?.trim() || "-"}`,
      `Ciudad: ${member.city?.trim() || "-"}`,
      `Provincia/Region: ${member.region?.trim() || "-"}`,
      `Codigo postal: ${member.postalCode?.trim() || "-"}`,
      `Alta como socio: ${memberSince}`,
      `Fecha de nacimiento: ${formatDate(member.birthDate, formatLocale)}`,
      `Plan asignado: ${feePlan.name}`,
      `Cuota: ${formatCurrency(feePlan.amount, formatLocale)}`,
      `Periodicidad: ${getMembershipExecutionLabel(feePlan)}`,
      `Proximo cobro: ${formatMonthDay(nextChargeDate, formatLocale)}`,
      `Saldo actual: ${formatCurrency(pendingAmount, formatLocale)} (${currentBalanceLabel})`,
      `Permiso imagen: ${storedPermissions.image ? "Autorizado" : "No autorizado"}`,
      `Permiso voz: ${storedPermissions.voice ? "Autorizado" : "No autorizado"}`,
      `Permiso comunicaciones: ${
        storedPermissions.communications ? "Autorizado" : "No autorizado"
      }`,
      `Permiso servicios: ${storedPermissions.services ? "Autorizado" : "No autorizado"}`,
    ];

    const paymentRows = sortedPaymentHistory.map((tx) => [
      formatDate(tx.date, formatLocale),
      tx.membershipPlanName ?? feePlan.name,
      getPaymentStatus(tx.status),
      formatCurrency(tx.amount, formatLocale),
    ]);

    return [
      "Ficha de socio",
      "",
      `Asociacion: ${association?.name || "Kora"}`,
      `Emitido: ${formatDateTime(new Date().toISOString(), formatLocale)}`,
      "",
      "Datos generales",
      ...contactLines,
      "",
      ...buildFixedWidthReportLines(
        "Historial de pagos",
        [
          { label: "Fecha", width: 14 },
          { label: "Concepto", width: 30 },
          { label: "Estado", width: 14 },
          { label: "Importe", width: 14 },
        ],
        paymentRows
      ),
    ];
  };

  const handlePreviewMemberSheet = () => {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) return;

    const lines = buildMemberSheetLines();
    const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Ficha de socio ${escapeHtml(displayName)}</title>
    <style>
      body {
        margin: 0;
        background: #f8fafc;
        color: #0f172a;
        font-family: "Segoe UI", sans-serif;
      }
      .sheet {
        max-width: 960px;
        margin: 32px auto;
        padding: 32px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 24px;
        box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
      }
      h1 {
        margin: 0 0 8px;
        font-size: 28px;
      }
      p {
        margin: 0 0 20px;
        color: #475569;
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font: 14px/1.6 Consolas, "Courier New", monospace;
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <h1>Ficha de socio</h1>
      <p>${escapeHtml(displayName)} · ${escapeHtml(memberIdLabel)}</p>
      <pre>${escapeHtml(lines.join("\n"))}</pre>
    </main>
  </body>
</html>`;

    previewWindow.document.open();
    previewWindow.document.write(html);
    previewWindow.document.close();
    previewWindow.focus();
  };

  const handleDownloadMemberSheet = () => {
    downloadLinesAsPdf(memberSheetFileName, buildMemberSheetLines());
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
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    member.deactivatedAt
                      ? "bg-slate-100 text-slate-600"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {memberStatusLabel.toUpperCase()}
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
                onClick={handlePreviewMemberSheet}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  visibility
                </span>
                Ver Ficha
              </button>
              <button
                type="button"
                onClick={handleDownloadMemberSheet}
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

          <section className={PAYMENTS_TABLE_SECTION_STYLES}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Historial de Pagos Recientes
                </h2>
                <p className="text-sm text-gray-500">
                  Ultimos movimientos de cuota del socio.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/finance" className="text-xs font-semibold text-primary">
                  Ver todo
                </Link>
              </div>
            </div>

            <div className={tableWrapperStyles}>
              <table className="w-full text-left text-sm">
                <thead className={tableHeadStyles}>
                  <tr>
                    <SortableHeader
                      label="Fecha"
                      active={paymentsSortState.key === "date"}
                      direction={paymentsSortState.direction}
                      onClick={() =>
                        setPaymentsSortState((current) =>
                          toggleSort(current, "date")
                        )
                      }
                      className={tableHeadCellStyles}
                    />
                    <SortableHeader
                      label="Categoria"
                      active={paymentsSortState.key === "category"}
                      direction={paymentsSortState.direction}
                      onClick={() =>
                        setPaymentsSortState((current) =>
                          toggleSort(current, "category")
                        )
                      }
                      className={tableHeadCellStyles}
                    />
                    <SortableHeader
                      label="Importe"
                      active={paymentsSortState.key === "amount"}
                      direction={paymentsSortState.direction}
                      onClick={() =>
                        setPaymentsSortState((current) =>
                          toggleSort(current, "amount")
                        )
                      }
                      className={tableHeadCellStyles}
                    />
                    <SortableHeader
                      label="Estado"
                      active={paymentsSortState.key === "status"}
                      direction={paymentsSortState.direction}
                      onClick={() =>
                        setPaymentsSortState((current) =>
                          toggleSort(current, "status")
                        )
                      }
                      className={tableHeadCellStyles}
                    />
                    <th className={`${tableHeadCellStyles} text-right`}>
                      Accion
                    </th>
                  </tr>
                </thead>
                <tbody className={tableBodyStyles}>
                  {sortedPaymentHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={tableEmptyCellStyles}>
                        No hay pagos registrados todavia.
                      </td>
                    </tr>
                  ) : (
                    sortedPaymentHistory.map((tx) => (
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
                              PAYMENT_STYLES[getPaymentStatus(tx.status)]
                            }`}
                          >
                            {getPaymentStatus(tx.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            className={tableIconActionStyles}
                            aria-label={`Ver detalle del movimiento ${tx.id}`}
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

            <div className={tableFooterStyles}>
              <span>
                {sortedPaymentHistory.length} movimientos registrados en la ficha
                del socio
              </span>
            </div>
          </section>

          <section className={PAYMENTS_TABLE_SECTION_STYLES}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Marketplace de recompensas
                </h2>
                <p className="text-sm text-gray-500">
                  Catalogo activo de recompensas disponible para este socio.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={`/people/members/points?memberId=${member.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    redeem
                  </span>
                  Abrir marketplace
                </Link>
              </div>
            </div>

            <div className="grid gap-4 border-b border-slate-100 p-4 md:grid-cols-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-500">
                  Horas solidarias
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {formatHours(memberPointsSummary.volunteerHours, formatLocale)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Equivalen a{" "}
                  {formatNumber(memberPointsSummary.earnedPoints, formatLocale)}{" "}
                  puntos generados.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
                  Puntos disponibles
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {formatNumber(memberPointsSummary.availablePoints, formatLocale)} pts
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Tras{" "}
                  {formatNumber(memberPointsSummary.redemptionCount, formatLocale)}{" "}
                  canjes registrados.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600">
                  Recompensas canjeables
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {formatNumber(redeemableRewardsCount, formatLocale)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  De {formatNumber(rewardRows.length, formatLocale)} recompensas
                  activas en el catalogo.
                </p>
              </div>
            </div>

            <div className={tableWrapperStyles}>
              <table className="w-full text-left text-sm">
                <thead className={tableHeadStyles}>
                  <tr>
                    <th className={tableHeadCellStyles}>Recompensa</th>
                    <th className={tableHeadCellStyles}>Categoria</th>
                    <th className={`${tableHeadCellStyles} text-right`}>
                      Coste
                    </th>
                    <th className={`${tableHeadCellStyles} text-right`}>
                      Stock
                    </th>
                    <th className={`${tableHeadCellStyles} text-right`}>
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className={tableBodyStyles}>
                  {pointsMarketplaceLoading ? (
                    <tr>
                      <td colSpan={5} className={tableEmptyCellStyles}>
                        Cargando recompensas del marketplace...
                      </td>
                    </tr>
                  ) : rewardRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={tableEmptyCellStyles}>
                        No hay recompensas activas publicadas todavia.
                      </td>
                    </tr>
                  ) : (
                    pagedRewardRows.map((row) => (
                      <tr key={row.reward.id} className={tableRowStyles}>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {row.reward.title}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {row.reward.description?.trim()
                              ? row.reward.description
                              : "Sin descripcion adicional."}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {MemberPointRewardCategoryLabels[row.reward.category]}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {formatNumber(row.reward.pointsCost, formatLocale)} pts
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-600">
                          {row.remainingStock === null
                            ? "Ilimitado"
                            : `${formatNumber(row.remainingStock, formatLocale)} uds`}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              row.redeemable
                                ? "bg-emerald-50 text-emerald-700"
                                : row.remainingStock === 0
                                  ? "bg-rose-50 text-rose-600"
                                  : row.affordable
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {row.redeemable
                              ? "Canjeable"
                              : row.remainingStock === 0
                                ? "Agotada"
                                : row.affordable
                                  ? "No disponible"
                                  : "Saldo insuficiente"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={tableFooterStyles}>
              <span>
                Mostrando {pagedRewardRows.length} de {rewardRows.length} recompensas
                activas para este socio
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentRewardsPage(
                      Math.max(1, currentRewardsPageSafe - 1)
                    )
                  }
                  disabled={currentRewardsPageSafe === 1}
                  className={`rounded-xl border px-4 py-1.5 text-xs font-semibold shadow-sm transition ${
                    currentRewardsPageSafe === 1
                      ? "border-slate-100 bg-slate-50 text-slate-300 shadow-none"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Anterior
                </button>
                {rewardPageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentRewardsPage(page)}
                    className={
                      page === currentRewardsPageSafe
                        ? "flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary"
                        : "flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                    }
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentRewardsPage(
                      Math.min(totalRewardPages, currentRewardsPageSafe + 1)
                    )
                  }
                  disabled={currentRewardsPageSafe === totalRewardPages}
                  className={`rounded-xl border px-4 py-1.5 text-xs font-semibold shadow-sm transition ${
                    currentRewardsPageSafe === totalRewardPages
                      ? "border-slate-100 bg-slate-50 text-slate-300 shadow-none"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>
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
