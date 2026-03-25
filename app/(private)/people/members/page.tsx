"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import {
  moduleTopbarButtonIconStyles,
  moduleTopbarButtonStyles,
} from "@/components/shared/ModuleTopbar";
import SortableHeader from "@/components/shared/SortableHeader";
import { useLocale } from "@/core/i18n/use-locale";
import {
  applySortDirection,
  compareDate,
  compareNumber,
  compareText,
  type SortState,
  toggleSort,
} from "@/lib/table-sorting";
import {
  getContactMembershipPlan,
  getMembershipStatusWindowDays,
} from "@/core/session/membership-settings";
import { useSessionStore } from "@/core/session/session.store";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import type { Contact } from "@/modules/contacts/contact.types";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import { useVolunteerActivitiesStore } from "@/modules/volunteers/volunteer-activities.store";
import { useMemberPointsStore } from "@/modules/people/member-points.store";
import { getMemberPointsSummary } from "@/modules/people/member-points.utils";
import { formatMemberId } from "@/modules/people/people.utils";

type MemberStatus = "Activo" | "Pendiente" | "Baja";
type PaymentStatus = "Al dia" | "Con deuda" | "Vencido";
type MembersSortKey =
  | "member"
  | "memberId"
  | "status"
  | "feePlan"
  | "lastPayment"
  | "balance";

type MembersFilterStatus = "all" | "active" | "pending" | "inactive";
type MembersFilterPayment = "all" | "paid" | "pending" | "overdue";
type MembersFilterCycle = "all" | "Mensual" | "Anual";

type MemberRow = {
  member: Contact;
  displayName: string;
  initials: string;
  status: MemberStatus;
  paymentStatus: PaymentStatus;
  feePlan: ReturnType<typeof getContactMembershipPlan>;
  lastPaymentDate?: string;
  pendingAmount: number;
  volunteerHours: number;
  earnedPoints: number;
  spentPoints: number;
  availablePoints: number;
};

const PAGE_SIZE = 8;
const TOOLBAR_BUTTON_STYLES =
  "inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";
const SEARCH_INPUT_STYLES =
  "w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const FILTER_FIELD_STYLES =
  "mt-2 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10";
const TABLE_HEAD_STYLES =
  "border-y border-slate-100 bg-slate-50/90 text-[11px] uppercase tracking-[0.12em] text-slate-400";
const TABLE_HEAD_CELL_STYLES = "px-6 py-4 font-semibold";
const TABLE_BODY_STYLES = "divide-y divide-slate-100 text-slate-700";
const TABLE_ROW_STYLES = "transition-colors hover:bg-slate-50/70";
const TABLE_FOOTER_STYLES =
  "flex flex-col gap-3 border-t border-slate-100 px-6 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between";
const TABLE_PAGER_BUTTON_STYLES =
  "rounded-xl border px-4 py-1.5 text-xs font-semibold shadow-sm transition";
const TABLE_PAGER_BUTTON_ENABLED_STYLES =
  "border-slate-200 bg-white text-slate-600 hover:bg-slate-50";
const TABLE_PAGER_BUTTON_DISABLED_STYLES =
  "border-slate-100 bg-slate-50 text-slate-300 shadow-none";
const TABLE_PAGER_NUMBER_STYLES =
  "flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50";
const TABLE_PAGER_CURRENT_STYLES =
  "flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary";
const TABLE_WRAPPER_STYLES = "overflow-x-auto";

const STATUS_STYLES: Record<MemberStatus, string> = {
  Activo: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100",
  Pendiente: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100",
  Baja: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  "Al dia": "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100",
  "Con deuda": "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100",
  Vencido: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100",
};

function getDisplayName(contact: Contact) {
  const composed = `${contact.firstName} ${contact.lastName}`.trim();
  if (composed) return composed;
  return contact.fullName ?? "Sin nombre";
}

function getInitials(label: string) {
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

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

function isOnOrAfter(dateValue: string | undefined, start: Date) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start;
}

export default function MembersPage() {
  const { formatLocale } = useLocale();
  const association = useSessionStore((state) => state.association);
  const contacts = useContactsStore((state) => state.contacts);
  const transactions = useTransactionsStore((state) => state.transactions);
  const activities = useVolunteerActivitiesStore((state) => state.activities);
  const redemptions = useMemberPointsStore((state) => state.redemptions);
  const hasLoadedRef = useRef(false);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MembersFilterStatus>("all");
  const [paymentFilter, setPaymentFilter] =
    useState<MembersFilterPayment>("all");
  const [cycleFilter, setCycleFilter] = useState<MembersFilterCycle>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortState, setSortState] = useState<SortState<MembersSortKey>>({
    key: "member",
    direction: "asc",
  });

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    void useContactsStore.getState().loadContacts();
    void useTransactionsStore.getState().loadTransactions();
    void useVolunteerActivitiesStore.getState().loadActivities();
    void useMemberPointsStore.getState().loadPointsData();
  }, []);

  const now = useMemo(() => new Date(), []);
  const startOfMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
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

  const memberRows = useMemo<MemberRow[]>(() => {
    return members.map((member) => {
      const displayName = getDisplayName(member);
      const memberTransactions = membershipTransactions.filter(
        (tx) => tx.contactId === member.id || tx.contactIds?.includes(member.id)
      );
      const pendingAmount = memberTransactions
        .filter((tx) => tx.status === "pending")
        .reduce((sum, tx) => sum + tx.amount, 0);
      const completedTransactions = memberTransactions
        .filter((tx) => tx.status === "completed")
        .sort(
          (left, right) =>
            new Date(right.date).getTime() - new Date(left.date).getTime()
        );
      const lastPaymentDate = completedTransactions[0]?.date;
      const feePlan = getContactMembershipPlan(member, association);
      const points = getMemberPointsSummary(member.id, activities, redemptions);

      const isActive = !member.deactivatedAt;
      const hasPendingDebt = pendingAmount > 0;
      const status: MemberStatus = !isActive
        ? "Baja"
        : hasPendingDebt
          ? "Pendiente"
          : "Activo";

      let paymentStatus: PaymentStatus = "Vencido";
      if (hasPendingDebt) {
        paymentStatus = "Con deuda";
      } else if (lastPaymentDate) {
        const diffDays = Math.floor(
          (now.getTime() - new Date(lastPaymentDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        paymentStatus =
          diffDays <= getMembershipStatusWindowDays(feePlan)
            ? "Al dia"
            : "Vencido";
      }

      return {
        member,
        displayName,
        initials: getInitials(displayName),
        status,
        paymentStatus,
        feePlan,
        lastPaymentDate,
        pendingAmount,
        volunteerHours: points.volunteerHours,
        earnedPoints: points.earnedPoints,
        spentPoints: points.spentPoints,
        availablePoints: points.availablePoints,
      };
    });
  }, [activities, association, members, membershipTransactions, now, redemptions]);

  const summary = useMemo(() => {
    const monthlyRevenue = membershipTransactions
      .filter((tx) => tx.status === "completed" && isOnOrAfter(tx.date, startOfMonth))
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      totalMembers: memberRows.length,
      pendingMembers: memberRows.filter((row) => row.pendingAmount > 0).length,
      pendingBalance: memberRows.reduce((sum, row) => sum + row.pendingAmount, 0),
      monthlyRevenue,
      volunteerHours: memberRows.reduce((sum, row) => sum + row.volunteerHours, 0),
      membersWithPoints: memberRows.filter((row) => row.availablePoints > 0).length,
    };
  }, [memberRows, membershipTransactions, startOfMonth]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    return memberRows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        row.displayName.toLowerCase().includes(normalizedQuery) ||
        formatMemberId(row.member.id).toLowerCase().includes(normalizedQuery) ||
        (row.member.email ?? "").toLowerCase().includes(normalizedQuery);

      if (!matchesQuery) return false;

      if (statusFilter === "active" && row.status !== "Activo") return false;
      if (statusFilter === "pending" && row.status !== "Pendiente") return false;
      if (statusFilter === "inactive" && row.status !== "Baja") return false;

      if (paymentFilter === "paid" && row.paymentStatus !== "Al dia") return false;
      if (paymentFilter === "pending" && row.paymentStatus !== "Con deuda") {
        return false;
      }
      if (paymentFilter === "overdue" && row.paymentStatus !== "Vencido") {
        return false;
      }

      if (cycleFilter !== "all" && row.feePlan.cycle !== cycleFilter) {
        return false;
      }

      return true;
    });
  }, [cycleFilter, memberRows, paymentFilter, search, statusFilter]);

  const sortedMembers = useMemo(() => {
    return [...filteredMembers].sort((left, right) => {
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
        case "balance":
          return applySortDirection(
            compareNumber(left.pendingAmount, right.pendingAmount),
            sortState.direction
          );
        case "member":
        default:
          return applySortDirection(
            compareText(left.displayName, right.displayName, formatLocale),
            sortState.direction
          );
      }
    });
  }, [filteredMembers, formatLocale, sortState]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedMembers.length / PAGE_SIZE)),
    [sortedMembers.length]
  );
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pagedMembers = useMemo(() => {
    const start = (currentPageSafe - 1) * PAGE_SIZE;
    return sortedMembers.slice(start, start + PAGE_SIZE);
  }, [currentPageSafe, sortedMembers]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    let start = Math.max(1, currentPageSafe - 1);
    const end = Math.min(totalPages, start + 2);
    if (end - start < 2) {
      start = Math.max(1, end - 2);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPageSafe, totalPages]);

  const activeFiltersCount =
    (statusFilter === "all" ? 0 : 1) +
    (paymentFilter === "all" ? 0 : 1) +
    (cycleFilter === "all" ? 0 : 1);

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Gestion de socios"
        subtitle="Seguimiento de cuotas, voluntariado y acceso al marketplace de puntos con una tabla alineada al modulo de contabilidad."
        backHref="/people"
        backLabel="Volver a Personas"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/people/members/points"
              className={moduleTopbarButtonStyles.secondary}
            >
              <span className={moduleTopbarButtonIconStyles.secondary}>
                <span className="material-symbols-outlined text-[16px]">
                  redeem
                </span>
              </span>
              Marketplace
            </Link>
            <Link
              href="/contacts/new"
              className={moduleTopbarButtonStyles.primary}
            >
              <span className={moduleTopbarButtonIconStyles.add}>
                <span className="material-symbols-outlined text-[16px]">
                  add
                </span>
              </span>
              Nuevo socio
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Socios
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatNumber(summary.totalMembers, formatLocale)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Base actual de miembros registrada
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Cuotas pendientes
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(summary.pendingBalance, formatLocale)}
          </p>
          <p className="mt-1 text-sm text-amber-600">
            {formatNumber(summary.pendingMembers, formatLocale)} socios con deuda
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Recaudacion mensual
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatCurrency(summary.monthlyRevenue, formatLocale)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Cuotas cobradas este mes
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Horas voluntarias
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatNumber(summary.volunteerHours, formatLocale, 1)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Acumuladas por socios en actividades
          </p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Socios con saldo
          </p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatNumber(summary.membersWithPoints, formatLocale)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Con puntos listos para usar en el marketplace
          </p>
        </article>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((current) => !current)}
                  aria-expanded={filtersOpen}
                  className={TOOLBAR_BUTTON_STYLES}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    tune
                  </span>
                  Filtros
                  {activeFiltersCount > 0 ? (
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                      {activeFiltersCount}
                    </span>
                  ) : null}
                </button>

                {filtersOpen ? (
                  <div className="absolute left-0 z-20 mt-2 w-[320px] rounded-3xl border border-slate-200 bg-white p-4 shadow-xl">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Estado del socio
                        </label>
                        <select
                          value={statusFilter}
                          onChange={(event) => {
                            setStatusFilter(
                              event.target.value as MembersFilterStatus
                            );
                            setCurrentPage(1);
                          }}
                          className={FILTER_FIELD_STYLES}
                        >
                          <option value="all">Todos</option>
                          <option value="active">Activos</option>
                          <option value="pending">Pendientes</option>
                          <option value="inactive">Baja</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Estado de cuota
                        </label>
                        <select
                          value={paymentFilter}
                          onChange={(event) => {
                            setPaymentFilter(
                              event.target.value as MembersFilterPayment
                            );
                            setCurrentPage(1);
                          }}
                          className={FILTER_FIELD_STYLES}
                        >
                          <option value="all">Todos</option>
                          <option value="paid">Al dia</option>
                          <option value="pending">Con deuda</option>
                          <option value="overdue">Vencidos</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Ciclo de cuota
                        </label>
                        <select
                          value={cycleFilter}
                          onChange={(event) => {
                            setCycleFilter(
                              event.target.value as MembersFilterCycle
                            );
                            setCurrentPage(1);
                          }}
                          className={FILTER_FIELD_STYLES}
                        >
                          <option value="all">Todos</option>
                          <option value="Mensual">Mensual</option>
                          <option value="Anual">Anual</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter("all");
                            setPaymentFilter("all");
                            setCycleFilter("all");
                            setCurrentPage(1);
                          }}
                          className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                        >
                          Limpiar filtros
                        </button>
                        <button
                          type="button"
                          onClick={() => setFiltersOpen(false)}
                          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                        >
                          Listo
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <span className="material-symbols-outlined text-[18px] leading-none">
                    search
                  </span>
                </span>
                <input
                  type="text"
                  placeholder="Buscar por socio, ID o correo..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                  className={SEARCH_INPUT_STYLES}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
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
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="member:asc">Socio A-Z</option>
                <option value="member:desc">Socio Z-A</option>
                <option value="balance:desc">Mayor deuda</option>
                <option value="lastPayment:desc">Ultimo pago reciente</option>
              </select>
            </div>
          </div>
        </div>

        {memberRows.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500">
            No hay socios registrados todavia.
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-500">
            No hay resultados con los filtros actuales.
          </div>
        ) : (
          <div className={TABLE_WRAPPER_STYLES}>
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className={TABLE_HEAD_STYLES}>
                <tr>
                  <SortableHeader
                    label="Socio"
                    active={sortState.key === "member"}
                    direction={sortState.direction}
                    onClick={() => {
                      setCurrentPage(1);
                      setSortState((current) => toggleSort(current, "member"));
                    }}
                    className={TABLE_HEAD_CELL_STYLES}
                  />
                  <SortableHeader
                    label="ID"
                    active={sortState.key === "memberId"}
                    direction={sortState.direction}
                    onClick={() => {
                      setCurrentPage(1);
                      setSortState((current) => toggleSort(current, "memberId"));
                    }}
                    className={TABLE_HEAD_CELL_STYLES}
                  />
                  <SortableHeader
                    label="Estado"
                    active={sortState.key === "status"}
                    direction={sortState.direction}
                    onClick={() => {
                      setCurrentPage(1);
                      setSortState((current) => toggleSort(current, "status"));
                    }}
                    className={TABLE_HEAD_CELL_STYLES}
                  />
                  <SortableHeader
                    label="Cuota"
                    active={sortState.key === "feePlan"}
                    direction={sortState.direction}
                    onClick={() => {
                      setCurrentPage(1);
                      setSortState((current) => toggleSort(current, "feePlan"));
                    }}
                    className={TABLE_HEAD_CELL_STYLES}
                  />
                  <SortableHeader
                    label="Ultimo pago"
                    active={sortState.key === "lastPayment"}
                    direction={sortState.direction}
                    onClick={() => {
                      setCurrentPage(1);
                      setSortState((current) =>
                        toggleSort(current, "lastPayment", "desc")
                      );
                    }}
                    className={TABLE_HEAD_CELL_STYLES}
                  />
                  <SortableHeader
                    label="Saldo cuota"
                    active={sortState.key === "balance"}
                    direction={sortState.direction}
                    onClick={() => {
                      setCurrentPage(1);
                      setSortState((current) =>
                        toggleSort(current, "balance", "desc")
                      );
                    }}
                    className={`${TABLE_HEAD_CELL_STYLES} text-right`}
                    align="right"
                  />
                  <th className={`${TABLE_HEAD_CELL_STYLES} text-right`}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className={TABLE_BODY_STYLES}>
                {pagedMembers.map((row) => (
                  <tr key={row.member.id} className={TABLE_ROW_STYLES}>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {row.member.photoUrl ? (
                            <img
                              src={row.member.photoUrl}
                              alt={row.displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            row.initials
                          )}
                        </div>
                        <div>
                          <div className="text-[15px] font-semibold text-slate-900">
                            {row.displayName}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {row.member.email?.trim() || "Sin correo"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-5 text-sm font-medium text-slate-700">
                      {formatMemberId(row.member.id)}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2">
                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[row.status]}`}
                        >
                          {row.status}
                        </span>
                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${PAYMENT_STYLES[row.paymentStatus]}`}
                        >
                          {row.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-[15px] font-semibold text-slate-900">
                        {row.feePlan.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatCurrency(row.feePlan.amount, formatLocale)} -{" "}
                        {row.feePlan.cycle}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-700">
                      {formatDate(row.lastPaymentDate, formatLocale)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-5 text-right text-[15px] font-semibold">
                      <span
                        className={
                          row.pendingAmount > 0 ? "text-amber-600" : "text-emerald-600"
                        }
                      >
                        {formatCurrency(row.pendingAmount, formatLocale)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/people/members/${row.member.id}`}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                        >
                          Ver ficha
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={TABLE_FOOTER_STYLES}>
          <span>
            Mostrando {pagedMembers.length} de {sortedMembers.length} socios
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, currentPageSafe - 1))}
              disabled={currentPageSafe === 1}
              className={`${TABLE_PAGER_BUTTON_STYLES} ${
                currentPageSafe === 1
                  ? TABLE_PAGER_BUTTON_DISABLED_STYLES
                  : TABLE_PAGER_BUTTON_ENABLED_STYLES
              }`}
            >
              Anterior
            </button>
            {pageNumbers.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={
                  page === currentPageSafe
                    ? TABLE_PAGER_CURRENT_STYLES
                    : TABLE_PAGER_NUMBER_STYLES
                }
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPageSafe + 1))
              }
              disabled={currentPageSafe === totalPages}
              className={`${TABLE_PAGER_BUTTON_STYLES} ${
                currentPageSafe === totalPages
                  ? TABLE_PAGER_BUTTON_DISABLED_STYLES
                  : TABLE_PAGER_BUTTON_ENABLED_STYLES
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
