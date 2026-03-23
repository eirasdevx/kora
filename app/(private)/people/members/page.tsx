"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import SortableHeader from "@/components/shared/SortableHeader";
import {
  tableBodyStyles,
  tableFooterStyles,
  tableIconActionStyles,
  tablePagerButtonDisabledStyles,
  tablePagerButtonEnabledStyles,
  tablePagerButtonStyles,
  tablePagerCurrentStyles,
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
  getMembershipStatusWindowDays,
} from "@/core/session/membership-settings";
import { useSessionStore } from "@/core/session/session.store";
import { normalizeContactPrivacyPermissions } from "@/modules/contacts/contact-privacy";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import { Contact } from "@/modules/contacts/contact.types";
import {
  formatMemberId,
} from "@/modules/people/people.utils";

type MemberStatus = "Activo" | "Pendiente" | "Baja";
type PaymentStatus = "Al dia" | "Deuda" | "Vencido";
type MembersSortKey =
  | "member"
  | "memberId"
  | "status"
  | "feePlan"
  | "lastPayment"
  | "paymentStatus"
  | "permissions";

const STATUS_STYLES: Record<MemberStatus, string> = {
  Activo: "bg-emerald-50 text-emerald-700",
  Pendiente: "bg-amber-50 text-amber-700",
  Baja: "bg-slate-100 text-slate-600",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  "Al dia": "bg-blue-50 text-blue-700",
  Deuda: "bg-rose-50 text-rose-600",
  Vencido: "bg-slate-100 text-slate-600",
};

const PAYMENT_FILTERS: Array<{ label: string; value: "all" | "pending" | "overdue" | "paid" }> = [
  { label: "Todos", value: "all" },
  { label: "Pendiente", value: "pending" },
  { label: "Vencido", value: "overdue" },
  { label: "Al dia", value: "paid" },
];

const FEE_CYCLE_FILTERS: Array<{ label: string; value: "all" | "Mensual" | "Anual" }> = [
  { label: "Todos", value: "all" },
  { label: "Mensual", value: "Mensual" },
  { label: "Anual", value: "Anual" },
];

const PAGE_SIZE = 6;
const filterControlStyles =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
const membersTableSectionStyles =
  "rounded-[26px] border border-slate-200 bg-white shadow-sm";
const membersTableHeadStyles =
  "border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.08em] text-slate-400";
const membersTableHeadCellStyles = "px-6 py-4 font-semibold";
const membersTableRowStyles = "border-b border-slate-100 last:border-b-0";

function getDisplayName(contact: Contact) {
  const composed = `${contact.firstName} ${contact.lastName}`.trim();
  if (composed) return composed;
  return contact.fullName ?? "Sin nombre";
}

function getInitials(contact: Contact) {
  return getDisplayName(contact)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
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

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
}

function isOnOrAfter(dateValue: string | undefined, start: Date) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start;
}

export default function MembersPage() {
  const { formatLocale } = useLocale();
  const association = useSessionStore((state) => state.association);
  const { contacts, loadContacts } = useContactsStore();
  const { transactions, loadTransactions } = useTransactionsStore();
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<
    "all" | "pending" | "overdue" | "paid"
  >("all");
  const [feeCycleFilter, setFeeCycleFilter] = useState<
    "all" | "Mensual" | "Anual"
  >("all");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortState, setSortState] = useState<SortState<MembersSortKey>>({
    key: "member",
    direction: "asc",
  });

  useEffect(() => {
    loadContacts();
    loadTransactions();
  }, [loadContacts, loadTransactions]);

  const now = useMemo(() => new Date(), []);
  const startOfMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
    [now]
  );
  const startOfPrevMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth() - 1, 1),
    [now]
  );
  const endOfPrevMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 0),
    [now]
  );

  const members = useMemo(
    () => contacts.filter((contact) => contact.types.includes("member")),
    [contacts]
  );

  const membershipTransactions = useMemo(
    () => transactions.filter((tx) => tx.category === "membership"),
    [transactions]
  );

  const monthlyRevenue = membershipTransactions
    .filter(
      (tx) =>
        tx.status === "completed" && isOnOrAfter(tx.date, startOfMonth)
    )
    .reduce((sum, tx) => sum + tx.amount, 0);

  const prevMonthlyRevenue = membershipTransactions
    .filter(
      (tx) =>
        tx.status === "completed" &&
        isOnOrAfter(tx.date, startOfPrevMonth) &&
        new Date(tx.date) <= endOfPrevMonth
    )
    .reduce((sum, tx) => sum + tx.amount, 0);

  const revenueChange =
    prevMonthlyRevenue === 0
      ? 0
      : ((monthlyRevenue - prevMonthlyRevenue) / prevMonthlyRevenue) *
        100;

  const pendingAmount = membershipTransactions
    .filter((tx) => tx.status === "pending")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const membersWithDetails = useMemo(() => {
    return members.map((member) => {
      const memberTx = membershipTransactions.filter(
        (tx) =>
          tx.contactId === member.id ||
          tx.contactIds?.includes(member.id)
      );
      const pendingTx = memberTx.filter((tx) => tx.status === "pending");
      const completedTx = memberTx.filter(
        (tx) => tx.status === "completed"
      );
      const lastCompleted = [...completedTx].sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      const lastPaymentDate = lastCompleted?.date;
      const feePlan = getContactMembershipPlan(member, association);

      const isActive = !member.deactivatedAt;
      const hasPending = pendingTx.length > 0;
      const status: MemberStatus = !isActive
        ? "Baja"
        : hasPending
          ? "Pendiente"
          : "Activo";

      let paymentStatus: PaymentStatus = "Vencido";
      if (hasPending) {
        paymentStatus = "Deuda";
        } else if (lastPaymentDate) {
          const last = new Date(lastPaymentDate);
          const diffDays = Math.floor(
            (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
          );
          paymentStatus =
            diffDays <= getMembershipStatusWindowDays(feePlan)
              ? "Al dia"
              : "Vencido";
        }

      return {
        member,
        status,
        paymentStatus,
        lastPaymentDate,
        feePlan,
        feeCycle: feePlan.cycle,
        permissions: normalizeContactPrivacyPermissions(
          member.privacyPermissions
        ),
      };
    });
  }, [association, members, membershipTransactions, now]);

  const activeMembers = membersWithDetails.filter(
    (item) => item.status === "Activo"
  ).length;
  const pendingMembers = membersWithDetails.filter(
    (item) => item.paymentStatus === "Deuda"
  ).length;

  const filteredMembers = membersWithDetails.filter((item) => {
    const name = getDisplayName(item.member).toLowerCase();
    const email = item.member.email?.toLowerCase() ?? "";
    const idLabel = formatMemberId(item.member.id).toLowerCase();
    const matchesQuery =
      !query.trim() ||
      name.includes(query.toLowerCase()) ||
      email.includes(query.toLowerCase()) ||
      idLabel.includes(query.toLowerCase());
    if (!matchesQuery) return false;

    if (feeCycleFilter !== "all" && item.feeCycle !== feeCycleFilter) {
      return false;
    }

    if (paymentFilter === "pending") return item.paymentStatus === "Deuda";
    if (paymentFilter === "overdue") return item.paymentStatus === "Vencido";
    if (paymentFilter === "paid") return item.paymentStatus === "Al dia";

    return true;
  });

  const activeFiltersCount = useMemo(() => {
    let total = 0;
    if (paymentFilter !== "all") total += 1;
    if (feeCycleFilter !== "all") total += 1;
    return total;
  }, [paymentFilter, feeCycleFilter]);

  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((left, right) => {
      const leftPermissionCount = [
        left.permissions.image,
        left.permissions.voice,
        left.permissions.communications,
        left.permissions.services,
      ].filter(Boolean).length;
      const rightPermissionCount = [
        right.permissions.image,
        right.permissions.voice,
        right.permissions.communications,
        right.permissions.services,
      ].filter(Boolean).length;

      switch (sortState.key) {
        case "memberId":
          return applySortDirection(
            compareText(
              formatMemberId(left.member.id),
              formatMemberId(right.member.id),
              formatLocale
            ),
            sortState.direction
          );
        case "status":
          return applySortDirection(
            compareText(left.status, right.status, formatLocale),
            sortState.direction
          );
        case "feePlan":
          return applySortDirection(
            compareText(left.feePlan.name, right.feePlan.name, formatLocale),
            sortState.direction
          );
        case "lastPayment":
          return applySortDirection(
            compareDate(left.lastPaymentDate, right.lastPaymentDate),
            sortState.direction
          );
        case "paymentStatus":
          return applySortDirection(
            compareText(left.paymentStatus, right.paymentStatus, formatLocale),
            sortState.direction
          );
        case "permissions":
          return applySortDirection(
            compareNumber(leftPermissionCount, rightPermissionCount),
            sortState.direction
          );
        case "member":
        default:
          return applySortDirection(
            compareText(
              getDisplayName(left.member),
              getDisplayName(right.member),
              formatLocale
            ),
            sortState.direction
          );
      }
    });
  }, [filteredMembers, formatLocale, sortState]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedMembers.length / PAGE_SIZE)
  );
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pageMembers = sortedMembers.slice(
    (currentPageSafe - 1) * PAGE_SIZE,
    currentPageSafe * PAGE_SIZE
  );

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Gestión de Socios y Cuotas"
        subtitle="Administra la base de datos de socios y el estado de sus pagos."
        backHref="/people"
        backLabel="Volver a Personas"
        actions={
          <Link
            href="/contacts/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
          >
            <span className="material-symbols-outlined text-[18px]">
              person_add
            </span>
            Nuevo Socio
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Total Socios</p>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
              +{formatNumber(members.length || 0, formatLocale)}
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-gray-900">
            {formatNumber(members.length, formatLocale)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Activos</p>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
              {members.length
                ? `+${formatNumber(
                    Math.round((activeMembers / members.length) * 10),
                    formatLocale
                  )}%`
                : "+0%"}
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-gray-900">
            {formatNumber(activeMembers, formatLocale)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Pendientes de Pago</p>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
              {formatNumber(pendingMembers, formatLocale)} socios
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-gray-900">
            {formatCurrency(pendingAmount, formatLocale)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Recaudación Mensual</p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                revenueChange >= 0
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              {revenueChange >= 0 ? "+" : ""}
              {revenueChange.toFixed(1)}%
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-gray-900">
            {formatCurrency(monthlyRevenue, formatLocale)}
          </p>
        </div>
      </section>

      <section className={membersTableSectionStyles}>
        <div className="border-b border-slate-100 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">
                <span className="material-symbols-outlined text-[18px]">
                  search
                </span>
              </span>
              <input
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar socio por nombre, ID o email..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-12 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <select
              value={`${sortState.key}:${sortState.direction}`}
              onChange={(event) => {
                const [key, direction] = event.target.value.split(":") as [
                  MembersSortKey,
                  "asc" | "desc",
                ];
                setSortState({ key, direction });
                setCurrentPage(1);
              }}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              aria-label="Ordenar socios"
            >
              <option value="member:asc">Socio A-Z</option>
              <option value="member:desc">Socio Z-A</option>
              <option value="memberId:asc">ID ascendente</option>
              <option value="feePlan:asc">Cuota A-Z</option>
              <option value="lastPayment:desc">Último pago reciente</option>
              <option value="lastPayment:asc">Último pago antiguo</option>
              <option value="paymentStatus:asc">Saldo A-Z</option>
              <option value="permissions:desc">Más permisos</option>
            </select>
            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              aria-expanded={showFilters}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-semibold shadow-sm transition ${
                showFilters || activeFiltersCount > 0
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                tune
              </span>
              Más Filtros
              {activeFiltersCount > 0 ? (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {activeFiltersCount}
                </span>
              ) : null}
            </button>
          </div>

          {showFilters ? (
            <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 lg:grid-cols-[1fr_1fr_auto]">
              <select
                value={paymentFilter}
                onChange={(event) => {
                  setPaymentFilter(
                    event.target.value as "all" | "pending" | "overdue" | "paid"
                  );
                  setCurrentPage(1);
                }}
                className={`${filterControlStyles} appearance-none`}
              >
                {PAYMENT_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    Saldo: {filter.label}
                  </option>
                ))}
              </select>
              <select
                value={feeCycleFilter}
                onChange={(event) => {
                  setFeeCycleFilter(
                    event.target.value as "all" | "Mensual" | "Anual"
                  );
                  setCurrentPage(1);
                }}
                className={`${filterControlStyles} appearance-none`}
              >
                {FEE_CYCLE_FILTERS.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    Cuota: {filter.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setPaymentFilter("all");
                  setFeeCycleFilter("all");
                  setCurrentPage(1);
                }}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          ) : null}
        </div>

        <div className={tableWrapperStyles}>
          <table className="min-w-[1180px] w-full text-left text-sm">
          <thead className={membersTableHeadStyles}>
            <tr>
              <SortableHeader
                label="Socio"
                active={sortState.key === "member"}
                direction={sortState.direction}
                onClick={() => {
                  setCurrentPage(1);
                  setSortState((current) => toggleSort(current, "member"));
                }}
                className={membersTableHeadCellStyles}
              />
              <SortableHeader
                label="ID Socio"
                active={sortState.key === "memberId"}
                direction={sortState.direction}
                onClick={() => {
                  setCurrentPage(1);
                  setSortState((current) => toggleSort(current, "memberId"));
                }}
                className={membersTableHeadCellStyles}
              />
              <SortableHeader
                label="Estado"
                active={sortState.key === "status"}
                direction={sortState.direction}
                onClick={() => {
                  setCurrentPage(1);
                  setSortState((current) => toggleSort(current, "status"));
                }}
                className={membersTableHeadCellStyles}
              />
              <SortableHeader
                label="Cuota"
                active={sortState.key === "feePlan"}
                direction={sortState.direction}
                onClick={() => {
                  setCurrentPage(1);
                  setSortState((current) => toggleSort(current, "feePlan"));
                }}
                className={membersTableHeadCellStyles}
              />
              <th className={membersTableHeadCellStyles}>Último Pago</th>
              <th className={membersTableHeadCellStyles}>Saldo</th>
              <th className={membersTableHeadCellStyles}>Permisos</th>
              <th className={`${membersTableHeadCellStyles} text-right`}>
                Acción
              </th>
            </tr>
          </thead>
          <tbody className={tableBodyStyles}>
            {pageMembers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-500">
                  No se encontraron socios con los filtros actuales.
                </td>
              </tr>
            ) : (
              pageMembers.map((item) => {
                const { member, status, paymentStatus, permissions } =
                  item;
                const displayName = getDisplayName(member);
                const email = member.email?.trim() || "Sin correo";
                return (
                  <tr
                    key={member.id}
                    className={membersTableRowStyles}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                          {member.photoUrl ? (
                            <img
                              src={member.photoUrl}
                              alt={displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            getInitials(member)
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {displayName}
                          </p>
                          <p className="text-xs text-gray-500">{email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-600">
                      {formatMemberId(member.id)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="font-semibold text-gray-900">
                        {item.feePlan.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(item.feePlan.amount, formatLocale)} ·{" "}
                        {item.feePlan.cycle}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(item.lastPaymentDate, formatLocale)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${PAYMENT_STYLES[paymentStatus]}`}
                      >
                        {paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {[
                          { key: "I", enabled: permissions.image },
                          { key: "V", enabled: permissions.voice },
                          { key: "C", enabled: permissions.communications },
                          { key: "S", enabled: permissions.services },
                        ].map((item) => (
                          <span
                            key={`${member.id}-${item.key}`}
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                              item.enabled
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {item.key}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/people/members/${member.id}`}
                        className={tableIconActionStyles}
                        aria-label={`Ver socio ${displayName}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          visibility
                        </span>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>

        <div className={tableFooterStyles}>
          <span>
            Mostrando{" "}
            {pageMembers.length === 0
              ? 0
              : (currentPageSafe - 1) * PAGE_SIZE + 1}{" "}
            a{" "}
            {Math.min(currentPageSafe * PAGE_SIZE, sortedMembers.length)}{" "}
            de {sortedMembers.length} socios
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.max(1, prev - 1))
              }
              disabled={currentPageSafe === 1}
              className={`${tablePagerButtonStyles} ${
                currentPageSafe === 1
                  ? tablePagerButtonDisabledStyles
                  : tablePagerButtonEnabledStyles
              }`}
            >
              Anterior
            </button>
            <span className={tablePagerCurrentStyles}>
              {currentPageSafe}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPageSafe === totalPages}
              className={`${tablePagerButtonStyles} ${
                currentPageSafe === totalPages
                  ? tablePagerButtonDisabledStyles
                  : tablePagerButtonEnabledStyles
              }`}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
