"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import { Contact } from "@/modules/contacts/contact.types";
import {
  formatMemberId,
  resolveFeeCycle,
  resolveMemberPermissions,
  resolveMemberTier,
  type MemberTier,
} from "@/modules/people/people.utils";

type MemberStatus = "Activo" | "Pendiente" | "Baja";
type PaymentStatus = "Al dia" | "Deuda" | "Vencido";

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

const TIER_FILTERS: Array<{ label: string; value: MemberTier | "all" }> = [
  { label: "Todos", value: "all" },
  { label: "Pleno", value: "Pleno" },
  { label: "Premium", value: "Premium" },
  { label: "Junior", value: "Junior" },
];

const PAGE_SIZE = 6;

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

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES", {
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
  const { contacts, loadContacts } = useContactsStore();
  const { transactions, loadTransactions } = useTransactionsStore();
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<
    "all" | "pending" | "overdue" | "paid"
  >("all");
  const [tierFilter, setTierFilter] = useState<MemberTier | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadContacts();
    loadTransactions();
  }, [loadContacts, loadTransactions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, paymentFilter, tierFilter]);

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
        paymentStatus = diffDays <= 45 ? "Al dia" : "Vencido";
      }

      return {
        member,
        status,
        paymentStatus,
        lastPaymentDate,
        tier: resolveMemberTier(member.id),
        feeCycle: resolveFeeCycle(member.id),
        permissions: resolveMemberPermissions(member.id),
      };
    });
  }, [members, membershipTransactions, now]);

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

    if (tierFilter !== "all" && item.tier !== tierFilter) return false;

    if (paymentFilter === "pending") return item.paymentStatus === "Deuda";
    if (paymentFilter === "overdue") return item.paymentStatus === "Vencido";
    if (paymentFilter === "paid") return item.paymentStatus === "Al dia";

    return true;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / PAGE_SIZE)
  );
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pageMembers = filteredMembers.slice(
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
              +{formatNumber(members.length || 0)}
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-gray-900">
            {formatNumber(members.length)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Activos</p>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
              {members.length
                ? `+${formatNumber(
                    Math.round((activeMembers / members.length) * 10)
                  )}%`
                : "+0%"}
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-gray-900">
            {formatNumber(activeMembers)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Pendientes de Pago</p>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
              {formatNumber(pendingMembers)} socios
            </span>
          </div>
          <p className="mt-4 text-3xl font-semibold text-gray-900">
            {formatCurrency(pendingAmount)}
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
            {formatCurrency(monthlyRevenue)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-center">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">
              <span className="material-symbols-outlined text-[18px]">
                search
              </span>
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar socio por nombre, ID o email..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-12 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <select
            value={paymentFilter}
            onChange={(event) =>
              setPaymentFilter(
                event.target.value as "all" | "pending" | "overdue" | "paid"
              )
            }
            className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          >
            {PAYMENT_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                Estado Pago: {filter.label}
              </option>
            ))}
          </select>
          <select
            value={tierFilter}
            onChange={(event) =>
              setTierFilter(event.target.value as MemberTier | "all")
            }
            className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          >
            {TIER_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                Tipo de Socio: {filter.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-white"
          >
            <span className="material-symbols-outlined text-[18px]">
              tune
            </span>
            Más Filtros
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-6 py-4">Socio</th>
              <th className="px-6 py-4">ID Socio</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Cuota</th>
              <th className="px-6 py-4">Último Pago</th>
              <th className="px-6 py-4">Saldo</th>
              <th className="px-6 py-4">Permisos</th>
              <th className="px-6 py-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
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
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
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
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.feeCycle}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {formatDate(item.lastPaymentDate)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PAYMENT_STYLES[paymentStatus]}`}
                      >
                        {paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {(["I", "V", "C"] as const).map((key) => {
                          const enabled = permissions[key];
                          return (
                            <span
                              key={`${member.id}-${key}`}
                              className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${
                                enabled
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {key}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/people/members/${member.id}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50"
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

        <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Mostrando{" "}
            {pageMembers.length === 0
              ? 0
              : (currentPageSafe - 1) * PAGE_SIZE + 1}{" "}
            a{" "}
            {Math.min(currentPageSafe * PAGE_SIZE, filteredMembers.length)}{" "}
            de {filteredMembers.length} socios
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.max(1, prev - 1))
              }
              disabled={currentPageSafe === 1}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                currentPageSafe === 1
                  ? "border-gray-100 text-gray-300"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Anterior
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
              {currentPageSafe}
            </span>
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPageSafe === totalPages}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                currentPageSafe === totalPages
                  ? "border-gray-100 text-gray-300"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
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
