"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageTopbar from "@/components/PageTopbar";
import { useLocale } from "@/core/i18n/use-locale";
import { useSessionStore } from "@/core/session/session.store";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useEventsStore } from "@/modules/events/events.store";
import { useDocumentsStore } from "@/modules/documents/documents.store";
import { useMessagingSettingsStore } from "@/modules/messaging/messaging.settings.store";
import { useMessagingStore } from "@/modules/messaging/messaging.store";

const CATEGORY_LABELS: Record<string, string> = {
  membership: "Membresía",
  installations: "Instalaciones",
  events: "Eventos",
  subsidies: "Subvenciones",
  other: "Otros",
};

const MONTH_OPTIONS = [3, 4, 5, 6];


const formatCurrency = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);

const formatNumber = (value: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);

const formatPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

const toMonthLabel = (date: Date, locale: string) =>
  date.toLocaleDateString(locale, { month: "short" }).toUpperCase();

const formatShortDate = (value: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));


export default function DashboardPage() {
  const { formatLocale } = useLocale();
  const mode = useSessionStore((s) => s.mode);
  const association = useSessionStore((s) => s.association);
  const { transactions, loadTransactions } = useTransactionsStore();
  const { contacts, loadContacts } = useContactsStore();
  const { events, loadEvents } = useEventsStore();
  const { documents, loadDocuments } = useDocumentsStore();
  const { settings, loadSettings } = useMessagingSettingsStore();
  const { templates } = useMessagingStore();
  const [monthsRange, setMonthsRange] = useState(6);

  useEffect(() => {
    loadTransactions();
    loadContacts();
    loadEvents();
    loadDocuments();
  }, [loadTransactions, loadContacts, loadEvents, loadDocuments]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const {
    balance,
    monthBalance,
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
        label: toMonthLabel(month, formatLocale),
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
    formatLocale,
  ]);

  const totalMembers = useMemo(() => {
    return contacts.filter((c) => c.types.includes("member")).length;
  }, [contacts]);


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
  const senderName = settings.senderName || association?.name || "";
  const senderEmail = settings.emailAddress || association?.contactEmail || "";
  const safeRange = Math.min(6, Math.max(3, monthsRange));
  const isGuest = mode === "guest";
  const messagingReady = Boolean(
    senderName &&
      senderEmail &&
      (settings.hasEmailAppPassword || settings.emailAppPassword)
  );
  const recentTemplates = useMemo(() => {
    const sorted = [...templates].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
    return sorted.slice(0, 3);
  }, [templates]);
  const lastTemplateUpdate = recentTemplates[0]?.updatedAt;
  const totalTemplates = templates.length;

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageTopbar>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
              Panel de control
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">
              {associationName}
            </h1>
            <p className="text-sm text-gray-500">
              Resumen operativo y financiero en tiempo real.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm">
              Balance mensual: {formatCurrency(monthBalance, formatLocale)}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                balanceChange >= 0
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              {formatPercent(balanceChange)} vs mes anterior
            </span>
          </div>
        </div>
      </PageTopbar>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50 p-6 shadow-sm">
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
          <div className="absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-emerald-100/70 blur-2xl" />
          <div className="relative z-10 flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
                Pulso operativo
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                Acciones rápidas para hoy
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Gestiona socios, eventos y comunicaciones desde un solo lugar.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href="/contacts/new"
                className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <span className="material-symbols-outlined text-[18px]">
                    person_add
                  </span>
                </span>
                Nuevo socio
              </Link>
              <Link
                href="/events/new"
                className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <span className="material-symbols-outlined text-[18px]">
                    event
                  </span>
                </span>
                Nuevo evento
              </Link>
              <Link
                href="/documents"
                className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <span className="material-symbols-outlined text-[18px]">
                    upload_file
                  </span>
                </span>
                Subir documento
              </Link>
              {!isGuest ? (
                <Link
                  href="/messaging/templates/new"
                  className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <span className="material-symbols-outlined text-[18px]">
                      mail
                    </span>
                  </span>
                  Nueva plantilla
                </Link>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1">
                Ingresos: {formatCurrency(totalIncome, formatLocale)}
              </span>
              <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1">
                Gastos: {formatCurrency(totalExpense, formatLocale)}
              </span>
              <span className="rounded-full border border-white/80 bg-white/80 px-3 py-1">
                Rango: últimos {safeRange} meses
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Saldo total
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[18px]">
                  account_balance
                </span>
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-900">
              {formatCurrency(balance, formatLocale)}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
              <span
                className={`h-2 w-2 rounded-full ${
                  balanceChange >= 0 ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              <span
                className={
                  balanceChange >= 0 ? "text-emerald-600" : "text-rose-600"
                }
              >
                {formatPercent(balanceChange)} vs mes anterior
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Ingresos periodo
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <span className="material-symbols-outlined text-[18px]">
                  trending_up
                </span>
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-900">
              {formatCurrency(totalIncome, formatLocale)}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Últimos {safeRange} meses
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Gastos periodo
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <span className="material-symbols-outlined text-[18px]">
                  trending_down
                </span>
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-900">
              {formatCurrency(totalExpense, formatLocale)}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Últimos {safeRange} meses
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Socios activos
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <span className="material-symbols-outlined text-[18px]">
                  group
                </span>
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-gray-900">
              {formatNumber(totalMembers, formatLocale)}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {formatNumber(contacts.length, formatLocale)} contactos en total
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="flex h-full flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Flujo de caja
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
            className="mt-4 grid min-h-[240px] flex-1 gap-3"
            style={{
              gridTemplateColumns: `repeat(${Math.max(
                1,
                monthlySeries.length
              )}, minmax(0, 1fr))`,
            }}
          >
            {monthlySeries.map((month) => (
              <div
                key={month.label}
                className="flex h-full flex-col items-center text-center"
              >
                <div className="flex w-full flex-1 items-end justify-center gap-2">
                  <div
                    className="w-3 rounded-full bg-primary/60"
                    style={{
                      height: `${(month.income / maxBar) * 100}%`,
                    }}
                  />
                  <div
                    className="w-3 rounded-full bg-orange-400/60"
                    style={{
                      height: `${(month.expense / maxBar) * 100}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-gray-500">
                  {month.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary/60" />
              Ingresos
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-400/60" />
              Gastos
            </span>
            <span className="text-sm text-gray-400">
              Total ingresos: {formatCurrency(totalIncome, formatLocale)} / Total gastos:{" "}
              {formatCurrency(totalExpense, formatLocale)}
            </span>
          </div>
        </div>

        <div className="grid gap-4">
          <Link
            href="/accounting"
            aria-label="Ver desglose de gastos e ingresos"
            className="group block rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Desglose financiero
              </h3>
              <span className="text-sm font-semibold text-primary">
                Detalle
              </span>
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

          <Link
            href="/events"
            aria-label="Ir a eventos"
            className="group block rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Agenda activa
                </h3>
                <p className="text-sm text-gray-500">
                  {activeEvents.length} eventos en curso
                </p>
              </div>
              <span className="text-sm font-semibold text-primary">
                Ver agenda
              </span>
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
                          {date.toLocaleDateString(formatLocale, {
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
                          {event.location || "Ubicación por confirmar"} /{" "}
                          {date.toLocaleTimeString(formatLocale, {
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
        </div>
      </section>

      <section
        className={
          isGuest ? "grid gap-4" : "grid gap-4 lg:grid-cols-[1.6fr_1fr]"
        }
      >
        <Link
          href="/documents"
          aria-label="Ir a documentos"
          className="group block rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Documentos recientes
              </h3>
              <p className="text-sm text-gray-500">
                {documents.length} documentos en biblioteca
              </p>
            </div>
            <span className="text-sm font-semibold text-primary">
              Biblioteca
            </span>
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
                    {formatShortDate(doc.updatedAt, formatLocale)} - {doc.category}
                  </p>
                </div>
                <span className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Ver
                </span>
              </div>
            ))}
          </div>
        </Link>

        {!isGuest ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
                  Mensajería
                </p>
                <h3 className="text-lg font-semibold text-gray-900">
                  Centro de campañas
                </h3>
                <p className="text-sm text-gray-500">
                  Plantillas, segmentos y envíos masivos.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/messaging"
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Abrir
                </Link>
                <Link
                  href="/messaging/templates/new"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow"
                >
                  Nueva plantilla
                </Link>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase text-gray-400">
                  Estado del remitente
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">
                    {messagingReady
                      ? "Listo para enviar"
                      : "Pendiente de configuración"}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      messagingReady
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {messagingReady ? "Activo" : "Pendiente"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Remitente: {senderEmail || "Sin configurar"}
                </p>
                {!messagingReady ? (
                  <Link
                    href="/settings/messaging"
                    className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary"
                  >
                    Configurar mensajería
                    <span className="material-symbols-outlined text-[14px]">
                      arrow_forward
                    </span>
                  </Link>
                ) : null}
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase text-gray-400">
                  Plantillas activas
                </p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {totalTemplates}
                </p>
                <p className="text-xs text-gray-500">
                  Última actualización:{" "}
                  {lastTemplateUpdate
                    ? formatShortDate(lastTemplateUpdate, formatLocale)
                    : "-"}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Recientes
              </p>
              {recentTemplates.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 p-3 text-sm text-gray-400">
                  No hay plantillas recientes.
                </div>
              ) : (
                recentTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {template.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {template.subject || "Sin asunto"} /{" "}
                        {formatShortDate(template.updatedAt, formatLocale)}
                      </p>
                    </div>
                    <Link
                      href={`/messaging/templates/new?id=${template.id}`}
                      className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                    >
                      Ver
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
