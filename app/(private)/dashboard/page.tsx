"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageTopbar from "@/components/PageTopbar";
import { useSessionStore } from "@/core/session/session.store";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useEventsStore } from "@/modules/events/events.store";
import { useDocumentsStore } from "@/modules/documents/documents.store";

const CATEGORY_LABELS: Record<string, string> = {
  membership: "Membresía",
  installations: "Instalaciones",
  events: "Eventos",
  subsidies: "Subvenciones",
  other: "Otros",
};

const MONTH_OPTIONS = [3, 4, 5, 6];

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
  const [monthsRange, setMonthsRange] = useState(6);

  useEffect(() => {
    loadTransactions();
    loadContacts();
    loadEvents();
    loadDocuments();
  }, [loadTransactions, loadContacts, loadEvents, loadDocuments]);

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
  const socialViews = association?.socialStats?.views ?? 0;
  const socialLikes = association?.socialStats?.likes ?? 0;
  const socialEngagement =
    socialViews === 0 ? 0 : (socialLikes / socialViews) * 100;
  const hasSocialStats =
    socialFollowers > 0 || socialViews > 0 || socialLikes > 0;

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
      .slice(0, 2);
  }, [activeEvents]);

  const socialSummary = [
    {
      label: "Seguidores totales",
      value: formatNumber(socialFollowers),
      helper: "Total de seguidores en redes.",
    },
    {
      label: "Me gustas vs visualizaciones",
      value: `${socialEngagement.toFixed(1)}%`,
      helper: `${formatNumber(socialLikes)} me gustas registrados.`,
    },
    {
      label: "Visualizaciones totales",
      value: formatNumber(socialViews),
      helper: "Total de visualizaciones acumuladas.",
    },
  ];

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
          className="group block rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
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
        </Link>

        <Link
          href="/contacts"
          aria-label="Ir a contactos"
          className="group block rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Total de Socios</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              +
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {totalMembers}
          </p>
        </Link>

        <Link
          href="/events"
          aria-label="Ir a eventos"
          className="group block rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Total de Eventos</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
              !
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {totalEvents}
          </p>
        </Link>

        <Link
          href="/social"
          aria-label="Ir a redes sociales"
          className="group block rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Seguidores en redes</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
              ♥
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {formatNumber(socialFollowers)}
          </p>
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
              Social Intelligence
            </h3>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
              Live
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <div className="grid gap-3">
              {socialSummary.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-gray-200 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {metric.helper}
                  </p>
                </div>
              ))}
            </div>
            {!hasSocialStats && (
              <p className="text-xs text-gray-400">
                Completa las métricas en el perfil de la asociación para ver
                valores reales.
              </p>
            )}
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
