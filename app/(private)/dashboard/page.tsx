"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageTopbar from "@/components/PageTopbar";
import { useSessionStore } from "@/core/session/session.store";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useEventsStore } from "@/modules/events/events.store";
import { useDocumentsStore } from "@/modules/documents/documents.store";
import { useSocialPostsStore } from "@/modules/social/social.store";
import { SocialPostStatus } from "@/modules/social/social.types";

const CATEGORY_LABELS: Record<string, string> = {
  membership: "Membresía",
  installations: "Instalaciones",
  events: "Eventos",
  subsidies: "Subvenciones",
  other: "Otros",
};

const MONTH_OPTIONS = [3, 4, 5, 6];

const POST_STATUS_LABELS: Record<SocialPostStatus, string> = {
  draft: "Borrador",
  scheduled: "Programado",
  published: "Publicado",
};

const POST_STATUS_STYLES: Record<SocialPostStatus, string> = {
  draft: "bg-amber-50 text-amber-700",
  scheduled: "bg-blue-50 text-blue-600",
  published: "bg-emerald-50 text-emerald-700",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

const toMonthLabel = (date: Date) =>
  date.toLocaleDateString("es-ES", { month: "short" }).toUpperCase();

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));

export default function DashboardPage() {
  const association = useSessionStore((s) => s.association);
  const { transactions, loadTransactions } = useTransactionsStore();
  const { contacts, loadContacts } = useContactsStore();
  const { events, loadEvents } = useEventsStore();
  const { documents, loadDocuments } = useDocumentsStore();
  const { posts, loadPosts } = useSocialPostsStore();
  const [monthsRange, setMonthsRange] = useState(6);

  useEffect(() => {
    loadTransactions();
    loadContacts();
    loadEvents();
    loadDocuments();
    loadPosts();
  }, [loadTransactions, loadContacts, loadEvents, loadDocuments, loadPosts]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const {
    balance,
    monthBalance,
    prevMonthBalance,
    balanceChange,
    totalIncome,
    totalExpense,
    monthlySeries,
    expenseBreakdown,
    incomeBreakdown,
  } = useMemo(() => {
    const overallIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const overallExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const net = overallIncome - overallExpense;

    const inRange = (dateStr: string, start: Date, end: Date) => {
      const date = new Date(dateStr);
      return date >= start && date <= end;
    };

    const monthNet = transactions.reduce((sum, t) => {
      const value = t.type === "income" ? t.amount : -t.amount;
      return inRange(t.date, startOfMonth, now) ? sum + value : sum;
    }, 0);

    const prevNet = transactions.reduce((sum, t) => {
      const value = t.type === "income" ? t.amount : -t.amount;
      return inRange(t.date, startOfPrevMonth, endOfPrevMonth)
        ? sum + value
        : sum;
    }, 0);

    const change =
      prevNet === 0 ? 0 : ((monthNet - prevNet) / Math.abs(prevNet)) * 100;

    const range = Math.min(6, Math.max(3, monthsRange));
    const months = Array.from({ length: range }, (_, idx) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - (range - 1) + idx,
        1
      );
      return date;
    });

    const rangeStart = new Date(
      now.getFullYear(),
      now.getMonth() - (range - 1),
      1
    );
    const rangeEnd = now;
    const rangeTransactions = transactions.filter((t) =>
      inRange(t.date, rangeStart, rangeEnd)
    );
    const rangeIncome = rangeTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const rangeExpense = rangeTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const series = months.map((month) => {
      const start = new Date(month.getFullYear(), month.getMonth(), 1);
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const monthIncome = transactions
        .filter((t) => t.type === "income")
        .reduce(
          (sum, t) => (inRange(t.date, start, end) ? sum + t.amount : sum),
          0
        );
      const monthExpense = transactions
        .filter((t) => t.type === "expense")
        .reduce(
          (sum, t) => (inRange(t.date, start, end) ? sum + t.amount : sum),
          0
        );
      return {
        label: toMonthLabel(month),
        income: monthIncome,
        expense: monthExpense,
      };
    });

    const expenseTotals = rangeTransactions
      .filter((t) => t.type === "expense")
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + t.amount;
        return acc;
      }, {});

    const breakdown = Object.entries(expenseTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    const incomeTotals = rangeTransactions
      .filter((t) => t.type === "income")
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + t.amount;
        return acc;
      }, {});

    const incomeBreakdown = Object.entries(incomeTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    return {
      balance: net,
      monthBalance: monthNet,
      prevMonthBalance: prevNet,
      balanceChange: change,
      totalIncome: rangeIncome,
      totalExpense: rangeExpense,
      monthlySeries: series,
      expenseBreakdown: breakdown,
      incomeBreakdown,
    };
  }, [
    transactions,
    now,
    startOfMonth,
    startOfPrevMonth,
    endOfPrevMonth,
    monthsRange,
  ]);

  const totalMembers = useMemo(() => {
    return contacts.filter((c) => c.types.includes("member")).length;
  }, [contacts]);

  const totalEvents = events.length;

  const socialFollowers = association?.socialStats?.followers ?? 0;

  const activeEvents = useMemo(() => {
    return events.filter((event) => {
      const start = new Date(event.startDate);
      return event.status !== "draft" && start >= now;
    });
  }, [events, now]);

  const upcomingEvents = useMemo(() => {
    return [...activeEvents]
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() -
          new Date(b.startDate).getTime()
      )
      .slice(0, 3);
  }, [activeEvents]);

  const recentPosts = useMemo(() => {
    const sorted = [...posts].sort((a, b) => {
      const aDate = new Date(a.scheduledAt ?? a.createdAt).getTime();
      const bDate = new Date(b.scheduledAt ?? b.createdAt).getTime();
      return bDate - aDate;
    });
    return sorted.slice(0, 3);
  }, [posts]);

  const recentDocuments = useMemo(() => {
    const sorted = [...documents].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
    );
    return sorted.slice(0, 3);
  }, [documents]);

  const maxBar = Math.max(
    ...monthlySeries.map((m) => Math.max(m.income, m.expense)),
    1
  );

  const associationName =
    association?.name?.trim() || "Panel Integral 360°";
  const logoUrl = association?.logoUrl;
  const logoInitials = associationName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="space-y-6 lg:space-y-5">
      <PageTopbar>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={associationName}
                className="h-10 w-10 rounded-xl object-cover"
              />
            ) : (
              <span className="text-sm font-semibold text-gray-600">
                {logoInitials || "KA"}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {associationName}
            </h1>
          </div>
        </div>
      </PageTopbar>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Link
          href="/accounting"
          aria-label="Ir a contabilidad"
          className="group relative block overflow-hidden rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 140 80"
            className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 text-primary/20"
            fill="none"
          >
            <path
              d="M6 60 C26 40, 44 68, 64 46 C84 24, 104 52, 130 30"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M8 70 H132"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="6 6"
              strokeLinecap="round"
              opacity="0.6"
            />
            <circle cx="26" cy="50" r="4" fill="currentColor" />
            <circle cx="64" cy="46" r="4" fill="currentColor" />
            <circle cx="104" cy="52" r="4" fill="currentColor" />
          </svg>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Saldo Total</p>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                {formatPercent(balanceChange)}
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {formatCurrency(balance)}
            </p>
            <div className="mt-3 flex items-end gap-1">
              {monthlySeries.map((month) => (
                <div
                  key={month.label}
                  className="h-10 w-2 rounded-full bg-primary/20"
                  style={{
                    height: `${(month.income / maxBar) * 40 + 6}px`,
                  }}
                />
              ))}
            </div>
          </div>
        </Link>

        <Link
          href="/contacts"
          aria-label="Ir a contactos"
          className="group relative block overflow-hidden rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 120 80"
            className="pointer-events-none absolute -right-5 -top-6 h-28 w-28 text-blue-400/20"
            fill="none"
          >
            <circle cx="78" cy="24" r="16" stroke="currentColor" strokeWidth="3" />
            <circle cx="52" cy="48" r="24" stroke="currentColor" strokeWidth="3" />
            <circle cx="98" cy="58" r="10" fill="currentColor" opacity="0.5" />
          </svg>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Total de Socios</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                +
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {totalMembers}
            </p>
          </div>
        </Link>

        <Link
          href="/events"
          aria-label="Ir a eventos"
          className="group relative block overflow-hidden rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 120 80"
            className="pointer-events-none absolute -right-5 -top-6 h-28 w-28 text-orange-400/20"
            fill="none"
          >
            <rect
              x="18"
              y="16"
              width="84"
              height="50"
              rx="12"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M18 32H102"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M38 16V8"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M82 16V8"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="40" cy="44" r="3.5" fill="currentColor" />
            <circle cx="60" cy="44" r="3.5" fill="currentColor" />
            <circle cx="80" cy="44" r="3.5" fill="currentColor" />
          </svg>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Total de Eventos</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                !
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {totalEvents}
            </p>
          </div>
        </Link>

        <Link
          href="/social"
          aria-label="Ir a redes sociales"
          className="group relative block overflow-hidden rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 120 80"
            className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 text-pink-400/20"
            fill="none"
          >
            <path
              d="M60 64 C60 64, 30 46, 30 30 C30 22, 36 16, 44 16 C50 16, 56 20, 60 26 C64 20, 70 16, 76 16 C84 16, 90 22, 90 30 C90 46, 60 64, 60 64 Z"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M20 60 C28 54, 36 54, 44 60 C52 66, 60 66, 68 60"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.6"
            />
            <circle cx="96" cy="18" r="4" fill="currentColor" opacity="0.6" />
          </svg>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Seguidores en redes</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                ♥
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {formatNumber(socialFollowers)}
            </p>
          </div>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Análisis de Flujo de Caja
              </h2>
              <p className="text-sm text-gray-500">
                Comparativa de ingresos y gastos operativos
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="cashflow-range" className="sr-only">
                Rango de meses
              </label>
              <select
                id="cashflow-range"
                value={monthsRange}
                onChange={(event) =>
                  setMonthsRange(Number(event.target.value))
                }
                className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {MONTH_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {`Últimos ${value} meses`}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div
            className="mt-4 grid items-end gap-3"
            style={{
              gridTemplateColumns: `repeat(${Math.max(
                1,
                monthlySeries.length
              )}, minmax(0, 1fr))`,
            }}
          >
            {monthlySeries.map((month) => (
              <div key={month.label} className="text-center">
                <div className="flex h-24 items-end justify-center gap-2">
                  <div
                    className="w-3 rounded-full bg-primary/60"
                    style={{
                      height: `${(month.income / maxBar) * 90}px`,
                    }}
                  />
                  <div
                    className="w-3 rounded-full bg-orange-400/60"
                    style={{
                      height: `${(month.expense / maxBar) * 90}px`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-gray-500">
                  {month.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary/60" />
              Ingresos
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-400/60" />
              Gastos
            </span>
            <span className="ml-auto text-sm text-gray-400">
              Total ingresos: {formatCurrency(totalIncome)} · Total gastos:{" "}
              {formatCurrency(totalExpense)}
            </span>
          </div>
        </div>

        <Link
          href="/accounting"
          aria-label="Ver desglose de gastos e ingresos"
          className="group block rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
              Desglose Gastos e Ingresos
            </h3>
          </div>
          <div className="mt-4 space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Gastos
              </p>
              {expenseBreakdown.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No hay gastos registrados aún.
                </p>
              ) : (
                expenseBreakdown.map((item) => {
                  const percent =
                    totalExpense === 0
                      ? 0
                      : (item.amount / totalExpense) * 100;
                  return (
                    <div key={item.category} className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>
                          {CATEGORY_LABELS[item.category] ?? item.category}
                        </span>
                        <span className="font-semibold">
                          {percent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-orange-400"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Ingresos
              </p>
              {incomeBreakdown.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No hay ingresos registrados aún.
                </p>
              ) : (
                incomeBreakdown.map((item) => {
                  const percent =
                    totalIncome === 0
                      ? 0
                      : (item.amount / totalIncome) * 100;
                  return (
                    <div key={item.category} className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>
                          {CATEGORY_LABELS[item.category] ?? item.category}
                        </span>
                        <span className="font-semibold">
                          {percent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Link
          href="/events"
          aria-label="Ir a eventos"
          className="group block rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Próximos Eventos
            </h3>
            <span className="text-sm font-semibold text-primary">Agenda</span>
          </div>
          <div className="mt-4 space-y-3">
            {upcomingEvents.length === 0 && (
              <p className="text-sm text-gray-400">
                No hay eventos activos.
              </p>
            )}
            {upcomingEvents.map((event) => {
              const capacity = event.capacity ?? 0;
              const used = event.participantIds?.length ?? 0;
              const progress = capacity ? (used / capacity) * 100 : 0;
              const date = new Date(event.startDate);
              return (
                <div
                  key={event.id}
                  className="rounded-2xl border border-gray-200 p-3"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <span className="text-xs font-semibold">
                        {date.toLocaleDateString("es-ES", {
                          month: "short",
                        })}
                      </span>
                      <span className="text-sm font-bold">
                        {date.getDate().toString().padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {event.location || "Ubicación por confirmar"} ·{" "}
                        {date.toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {capacity > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>
                              Cupos: {used}/{capacity}
                            </span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-gray-100">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Link>

        <Link
          href="/social"
          aria-label="Ir a redes sociales"
          className="group block rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Publicaciones recientes
            </h3>
            <span className="text-sm font-semibold text-primary">Ver todo</span>
          </div>
          <div className="mt-4 space-y-3">
            {recentPosts.length === 0 && (
              <div className="rounded-2xl border border-gray-200 p-3 text-sm text-gray-400">
                No hay publicaciones recientes.
              </div>
            )}
            {recentPosts.map((post) => (
              <div
                key={post.id}
                className="space-y-2 rounded-2xl border border-gray-200 p-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${POST_STATUS_STYLES[post.status]}`}
                  >
                    {POST_STATUS_LABELS[post.status]}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatShortDate(post.scheduledAt ?? post.createdAt)}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {post.content.slice(0, 72) || "Sin contenido"}
                </p>
                {post.channels.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.channels.map((channel) => (
                      <span
                        key={`${post.id}-${channel}`}
                        className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600"
                      >
                        {channel}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Link>

        <Link
          href="/documents"
          aria-label="Ir a documentos"
          className="group block rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Documentos
            </h3>
            <span className="text-sm font-semibold text-primary">Nuevo</span>
          </div>
          <div className="mt-4 space-y-3">
            {recentDocuments.length === 0 && (
              <div className="rounded-2xl border border-gray-200 p-3 text-sm text-gray-400">
                No hay documentos recientes.
              </div>
            )}
            {recentDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-2xl border border-gray-200 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {doc.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatShortDate(doc.updatedAt)} - {doc.category}
                  </p>
                </div>
                <span className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Ver
                </span>
              </div>
            ))}
          </div>
        </Link>
      </section>
    </div>
  );
}
