"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";

import AccountingKPIs from "@/components/accounting/AccountingKPIs";
import NewTransactionButton from "@/components/accounting/NewTransactionButton";
import TransactionsTable from "@/components/accounting/TransactionsTable";
import PageHeader from "@/components/shared/PageHeader";
import SectionBlock from "@/components/shared/SectionBlock";
import { useLocale } from "@/core/i18n/use-locale";
import { useSessionStore } from "@/core/session/session.store";
import {
  buildFixedWidthReportLines,
  buildJournalRows,
  buildLedgerGroups,
  downloadLinesAsPdf,
  downloadRowsAsXlsx,
} from "@/modules/accounting/accounting-reports";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string, locale: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function slugifyFileName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AccountingPage() {
  const { formatLocale } = useLocale();
  const association = useSessionStore((state) => state.association);
  const associationName = association?.name || "Kora";
  const accountingSettings = association?.accountingSettings;
  const { transactions, loadTransactions } = useTransactionsStore();

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const { income, expense, balance } = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    for (const transaction of transactions) {
      if (transaction.status !== "completed") continue;

      if (transaction.type === "income") totalIncome += transaction.amount;
      else totalExpense += transaction.amount;
    }

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [transactions]);

  const journalRows = useMemo(
    () => buildJournalRows(transactions, accountingSettings),
    [accountingSettings, transactions]
  );
  const ledgerGroups = useMemo(
    () => buildLedgerGroups(transactions, accountingSettings),
    [accountingSettings, transactions]
  );
  const ledgerFlatRows = useMemo(
    () =>
      ledgerGroups.flatMap((group) =>
        group.entries.map((entry) => ({
          accountCode: group.account.code,
          accountLabel: group.account.label,
          date: entry.date,
          concept: entry.concept,
          categoryLabel: entry.categoryLabel,
          debit: entry.debit,
          credit: entry.credit,
          balance: entry.balance,
        }))
      ),
    [ledgerGroups]
  );

  const postedEntries = journalRows.length;
  const fileNameBase = useMemo(
    () => slugifyFileName(associationName) || "kora",
    [associationName]
  );

  const handleDownloadJournalXlsx = () => {
    if (!journalRows.length) return;

    const rows = [
      ["Fecha", "Concepto", "Categoría", "Cuenta", "Debe", "Haber", "Saldo"],
      ...journalRows.map((row) => [
        formatDate(row.date, formatLocale),
        row.concept,
        row.categoryLabel,
        `${row.accountCode} · ${row.accountLabel}`,
        formatCurrency(row.debit, formatLocale),
        formatCurrency(row.credit, formatLocale),
        formatCurrency(row.runningBalance, formatLocale),
      ]),
    ];

    downloadRowsAsXlsx(`${fileNameBase}-libro-diario.xlsx`, "Libro diario", rows);
  };

  const handleDownloadJournalPdf = () => {
    if (!journalRows.length) return;

    const lines = buildFixedWidthReportLines(
      `Libro Diario · ${associationName}`,
      [
        { label: "Fecha", width: 12 },
        { label: "Cuenta", width: 18 },
        { label: "Concepto", width: 24 },
        { label: "Debe", width: 10 },
        { label: "Haber", width: 10 },
        { label: "Saldo", width: 10 },
      ],
      journalRows.map((row) => [
        formatDate(row.date, formatLocale),
        `${row.accountCode} ${row.accountLabel}`,
        row.concept,
        formatCurrency(row.debit, formatLocale),
        formatCurrency(row.credit, formatLocale),
        formatCurrency(row.runningBalance, formatLocale),
      ])
    );

    downloadLinesAsPdf(`${fileNameBase}-libro-diario.pdf`, lines);
  };

  const handleDownloadLedgerXlsx = () => {
    if (!ledgerFlatRows.length) return;

    const rows = [
      ["Cuenta", "Fecha", "Concepto", "Categoría", "Debe", "Haber", "Saldo cuenta"],
      ...ledgerFlatRows.map((row) => [
        `${row.accountCode} · ${row.accountLabel}`,
        formatDate(row.date, formatLocale),
        row.concept,
        row.categoryLabel,
        formatCurrency(row.debit, formatLocale),
        formatCurrency(row.credit, formatLocale),
        formatCurrency(row.balance, formatLocale),
      ]),
    ];

    downloadRowsAsXlsx(`${fileNameBase}-libro-mayor.xlsx`, "Libro mayor", rows);
  };

  const handleDownloadLedgerPdf = () => {
    if (!ledgerFlatRows.length) return;

    const lines = buildFixedWidthReportLines(
      `Libro Mayor · ${associationName}`,
      [
        { label: "Cuenta", width: 18 },
        { label: "Fecha", width: 12 },
        { label: "Concepto", width: 24 },
        { label: "Debe", width: 10 },
        { label: "Haber", width: 10 },
        { label: "Saldo", width: 10 },
      ],
      ledgerFlatRows.map((row) => [
        `${row.accountCode} ${row.accountLabel}`,
        formatDate(row.date, formatLocale),
        row.concept,
        formatCurrency(row.debit, formatLocale),
        formatCurrency(row.credit, formatLocale),
        formatCurrency(row.balance, formatLocale),
      ])
    );

    downloadLinesAsPdf(`${fileNameBase}-libro-mayor.pdf`, lines);
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Contabilidad"
        title="Centro contable"
        subtitle="Genera libros y mantén trazabilidad sobre todos los movimientos."
        backHref="/finance"
        backLabel="Volver a Finanzas"
        actions={
          <>
            <Link
              href="/accounting/accounts"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Elementos contables
            </Link>
            <Link
              href="/accounting/fees"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Gestionar cuotas
            </Link>
            <NewTransactionButton />
          </>
        }
      />

      <AccountingKPIs income={income} expense={expense} balance={balance} />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Asientos contabilizados
          </p>
          <p className="mt-3 text-3xl font-semibold text-gray-900">{postedEntries}</p>
          <p className="mt-1 text-sm text-gray-500">
            Movimientos completados incluidos en libros.
          </p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Cuentas activas
          </p>
          <p className="mt-3 text-3xl font-semibold text-gray-900">
            {ledgerGroups.length}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Cuentas con movimientos completados.
          </p>
        </div>
      </section>

      <SectionBlock
        title="Libros contables"
        subtitle="Descarga el libro diario y el libro mayor con los códigos configurados para esta asociación."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Libro diario
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  Secuencia cronológica de asientos
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Incluye fecha, cuenta afectada, debe, haber y saldo acumulado.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                {postedEntries} asiento(s)
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadJournalPdf}
                disabled={!journalRows.length}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Descargar PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadJournalXlsx}
                disabled={!journalRows.length}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Descargar XLSX
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Libro mayor
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  Desglose por cuenta contable
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Agrupa movimientos por cuenta operativa y muestra la evolución de su saldo.
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                {ledgerGroups.length} cuenta(s)
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadLedgerPdf}
                disabled={!ledgerFlatRows.length}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Descargar PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadLedgerXlsx}
                disabled={!ledgerFlatRows.length}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Descargar XLSX
              </button>
            </div>
          </div>
        </div>
      </SectionBlock>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Transacciones contables
            </h2>
            <p className="text-sm text-gray-500">
              Tabla operativa completa con filtros, exportación y acciones.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/accounting/accounts"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Abrir elementos contables
            </Link>
            <Link
              href="/accounting/fees"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Abrir gestión de cuotas
            </Link>
          </div>
        </div>

        <TransactionsTable transactions={transactions} />
      </section>
    </div>
  );
}
