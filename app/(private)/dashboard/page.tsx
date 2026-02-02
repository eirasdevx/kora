"use client";

import { useEffect, useMemo } from "react";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useEventsStore } from "@/modules/events/events.store";
import { useSocialPostsStore } from "@/modules/social/social.store";

const CATEGORY_LABELS: Record<string, string> = {
  membership: "Membresía",
  installations: "Instalaciones",
  events: "Eventos",
  subsidies: "Subvenciones",
  other: "Otros",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);

const formatPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

const toMonthLabel = (date: Date) =>
  date.toLocaleDateString("es-ES", { month: "short" }).toUpperCase();

export default function DashboardPage() {
  const { transactions, loadTransactions } = useTransactionsStore();
  const { contacts, loadContacts } = useContactsStore();
  const { events, loadEvents } = useEventsStore();
  const { posts, loadPosts } = useSocialPostsStore();

  useEffect(() => {
    loadTransactions();
    loadContacts();
    loadEvents();
    loadPosts();
  }, [loadTransactions, loadContacts, loadEvents, loadPosts]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const last7 = new Date(now);
  last7.setDate(now.getDate() - 7);
  const prev7 = new Date(now);
  prev7.setDate(now.getDate() - 14);

  const {
    balance,
    monthBalance,
    prevMonthBalance,
    balanceChange,
    totalIncome,
    totalExpense,
    monthlySeries,
    expenseBreakdown,
  } = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const net = income - expense;

    const inMonth = (dateStr: string, start: Date, end: Date) => {
      const date = new Date(dateStr);
      return date >= start && date <= end;
    };

    const monthNet = transactions.reduce((sum, t) => {
      const value = t.type === "income" ? t.amount : -t.amount;
      return inMonth(t.date, startOfMonth, now) ? sum + value : sum;
    }, 0);

    const prevNet = transactions.reduce((sum, t) => {
      const value = t.type === "income" ? t.amount : -t.amount;
      return inMonth(t.date, startOfPrevMonth, endOfPrevMonth)
        ? sum + value
        : sum;
    }, 0);

    const change =
      prevNet === 0 ? 0 : ((monthNet - prevNet) / Math.abs(prevNet)) * 100;

    const months = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + idx, 1);
      return date;
    });

    const series = months.map((month) => {
      const start = new Date(month.getFullYear(), month.getMonth(), 1);
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const monthIncome = transactions
        .filter((t) => t.type === "income")
        .reduce(
          (sum, t) => (inMonth(t.date, start, end) ? sum + t.amount : sum),
          0
        );
      const monthExpense = transactions
        .filter((t) => t.type === "expense")
        .reduce(
          (sum, t) => (inMonth(t.date, start, end) ? sum + t.amount : sum),
          0
        );
      return {
        label: toMonthLabel(month),
        income: monthIncome,
        expense: monthExpense,
      };
    });

    const expenseTotals = transactions
      .filter((t) => t.type === "expense")
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + t.amount;
        return acc;
      }, {});

    const breakdown = Object.entries(expenseTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    return {
      balance: net,
      monthBalance: monthNet,
      prevMonthBalance: prevNet,
      balanceChange: change,
      totalIncome: income,
      totalExpense: expense,
      monthlySeries: series,
      expenseBreakdown: breakdown,
    };
  }, [
    transactions,
    now,
    startOfMonth,
    startOfPrevMonth,
    endOfPrevMonth,
  ]);

  const newMembers = useMemo(() => {
    return contacts.filter(
      (c) => new Date(c.createdAt) >= startOfMonth
    ).length;
  }, [contacts, startOfMonth]);

  const activeEvents = useMemo(() => {
    return events.filter((event) => {
      const start = new Date(event.startDate);
      return event.status !== "draft" && start >= now;
    });
  }, [events, now]);

  const engagement = useMemo(() => {
    const total = posts.length || 1;
    const published = posts.filter((p) => p.status === "published").length;
    return (published / total) * 100;
  }, [posts]);

  const engagementDelta = useMemo(() => {
    const filterRange = (from: Date, to: Date) =>
      posts.filter((p) => {
        const date = new Date(p.createdAt);
        return date >= from && date < to;
      });

    const last = filterRange(last7, now);
    const prev = filterRange(prev7, last7);
    const lastRate =
      last.length === 0
        ? 0
        : (last.filter((p) => p.status === "published").length /
            last.length) *
          100;
    const prevRate =
      prev.length === 0
        ? 0
        : (prev.filter((p) => p.status === "published").length /
            prev.length) *
          100;
    return lastRate - prevRate;
  }, [posts, last7, prev7, now]);

  const upcomingEvents = useMemo(() => {
    return [...activeEvents]
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() -
          new Date(b.startDate).getTime()
      )
      .slice(0, 2);
  }, [activeEvents]);

  const socialHighlights = useMemo(() => {
    return posts
      .filter((p) => p.status === "published")
      .slice(0, 2)
      .map((post) => ({
        channel: post.channels[0] ?? "General",
        content: post.content || "Publicación sin texto",
        metrics: [
          { label: "Media", value: post.mediaUrls?.length ?? 0 },
          { label: "Canales", value: post.channels.length },
          { label: "Chars", value: post.content.length },
        ],
      }));
  }, [posts]);

  const pendingDocs = useMemo(() => {
    return transactions
      .filter((t) => t.status === "pending")
      .slice(0, 3);
  }, [transactions]);

  const maxBar = Math.max(
    ...monthlySeries.map((m) => Math.max(m.income, m.expense)),
    1
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Panel Integral 360°
          </h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-80">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </span>
            <input
              placeholder="Buscar en Kora..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
            </button>
            <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm">
              <div>
                <p className="text-xs text-gray-400">PLAN PREMIUM</p>
                <p className="font-semibold text-gray-900">Admin Kora</p>
              </div>
              <span className="h-9 w-9 rounded-full bg-emerald-200" />
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Saldo Total</p>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
              {formatPercent(balanceChange)}
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-gray-900">
            {formatCurrency(balance)}
          </p>
          <div className="mt-4 flex items-end gap-1">
            {monthlySeries.map((month) => (
              <div
                key={month.label}
                className="h-12 w-2 rounded-full bg-primary/20"
                style={{
                  height: `${(month.income / maxBar) * 48 + 8}px`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Nuevos Socios (Mes)</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              +
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-gray-900">
            {newMembers}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Meta: 150 (
            <span className="text-primary font-semibold">
              {Math.min((newMembers / 150) * 100, 100).toFixed(0)}%
            </span>
            )
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Eventos Activos</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
              !
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-gray-900">
            {activeEvents.length}
          </p>
          <div className="mt-4 h-2 rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-orange-500"
              style={{
                width: `${
                  events.length
                    ? (activeEvents.length / events.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Tasa de Engagement</p>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
              ♥
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-gray-900">
            {engagement.toFixed(1)}%
          </p>
          <p className="mt-2 text-sm text-emerald-600">
            {formatPercent(engagementDelta)} vs semana pasada
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Análisis de Flujo de Caja
              </h2>
              <p className="text-sm text-gray-500">
                Comparativa semestral de ingresos y gastos operativos
              </p>
            </div>
            <button className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600">
              Últimos 6 meses
            </button>
          </div>
          <div className="mt-6 grid grid-cols-6 items-end gap-4">
            {monthlySeries.map((month) => (
              <div key={month.label} className="text-center">
                <div className="flex h-32 items-end justify-center gap-2">
                  <div
                    className="w-3 rounded-full bg-primary/60"
                    style={{
                      height: `${(month.income / maxBar) * 120}px`,
                    }}
                  />
                  <div
                    className="w-3 rounded-full bg-orange-400/60"
                    style={{
                      height: `${(month.expense / maxBar) * 120}px`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-gray-500">
                  {month.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-6 text-xs text-gray-500">
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

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
            Desglose Gastos
          </h3>
          <div className="mt-6 space-y-4">
            {expenseBreakdown.length === 0 && (
              <p className="text-sm text-gray-400">
                No hay gastos registrados aún.
              </p>
            )}
            {expenseBreakdown.map((item) => {
              const percent =
                totalExpense === 0 ? 0 : (item.amount / totalExpense) * 100;
              return (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{CATEGORY_LABELS[item.category] ?? item.category}</span>
                    <span className="font-semibold">
                      {percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {expenseBreakdown.length > 0 && (
            <p className="mt-6 text-xs text-gray-500">
              Los gastos de{" "}
              {CATEGORY_LABELS[expenseBreakdown[0].category] ?? "la categoría"}{" "}
              representan el {Math.round(
                (expenseBreakdown[0].amount / totalExpense) * 100
              )}
              % del total este mes.
            </p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Próximos Eventos
            </h3>
            <span className="text-sm font-semibold text-primary">Agenda</span>
          </div>
          <div className="mt-6 space-y-4">
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
                  className="rounded-2xl border border-gray-200 p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-col items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
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
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>
                              Cupos: {used}/{capacity}
                            </span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-gray-100">
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
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Social Intelligence
            </h3>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
              Live
            </span>
          </div>
          <div className="mt-6 space-y-4">
            {socialHighlights.length === 0 && (
              <p className="text-sm text-gray-400">
                No hay publicaciones recientes.
              </p>
            )}
            {socialHighlights.map((item, idx) => (
              <div
                key={`${item.channel}-${idx}`}
                className="rounded-2xl border border-gray-200 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-xs font-semibold text-gray-600">
                    {item.channel.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-primary">
                      {item.channel.toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-700">
                      {item.content.slice(0, 60)}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-gray-500">
                      {item.metrics.map((metric) => (
                        <div
                          key={metric.label}
                          className="rounded-xl bg-gray-50 px-2 py-2"
                        >
                          <p className="text-sm font-semibold text-gray-800">
                            {metric.value}
                          </p>
                          <p>{metric.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Documentos
            </h3>
            <span className="text-sm font-semibold text-primary">Nuevo</span>
          </div>
          <div className="mt-6 space-y-4">
            {pendingDocs.length === 0 && (
              <div className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-400">
                No hay documentos pendientes.
              </div>
            )}
            {pendingDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-2xl border border-gray-200 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {doc.concept}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(doc.date).toLocaleDateString("es-ES")}
                  </p>
                </div>
                <button className="rounded-xl bg-primary px-3 py-1 text-xs font-semibold text-white">
                  Revisar
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
