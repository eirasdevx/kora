"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import ModuleTopbar, {
  moduleTopbarButtonStyles,
} from "@/components/shared/ModuleTopbar";
import SectionBlock from "@/components/shared/SectionBlock";
import DataTable from "@/components/shared/DataTable";
import { useLocale } from "@/core/i18n/use-locale";
import { downloadXlsx } from "@/lib/exporters";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import {
  TransactionCategoryLabels,
  TransactionStatusLabels,
  Transaction,
} from "@/modules/accounting/transaction.types";

const STATUS_STYLES: Record<keyof typeof TransactionStatusLabels, string> =
  {
    completed: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
  };

const FINANCE_MODULE_TITLE = "Finanzas";
const FINANCE_PAGE_TITLE = "Centro financiero";
const FINANCE_MODULE_DESCRIPTION =
  "Cuotas, ingresos, gastos y contabilidad general.";

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

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatSignedAmount(
  amount: number,
  type: Transaction["type"],
  locale: string
) {
  const value = type === "expense" ? -amount : amount;
  return formatCurrency(value, locale);
}

export default function FinancePage() {
  const { formatLocale } = useLocale();
  const { transactions, loadTransactions } = useTransactionsStore();

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const feeTransactions = useMemo(
    () =>
      transactions.filter(
        (tx) => tx.category === "membership" && tx.type === "income"
      ),
    [transactions, formatLocale]
  );

  const feePaidCount = feeTransactions.filter(
    (tx) => tx.status === "completed"
  ).length;
  const feePendingCount = feeTransactions.filter(
    (tx) => tx.status === "pending"
  ).length;
  const feeCollectedAmount = feeTransactions
    .filter((tx) => tx.status === "completed")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const accountingTotals = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const tx of transactions) {
      if (tx.status !== "completed") continue;
      if (tx.type === "income") income += tx.amount;
      else expense += tx.amount;
    }

    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, 6);
  }, [transactions]);

  const exportRows = useMemo(
    () =>
      transactions.map((tx) => [
        formatDate(tx.date, formatLocale),
        tx.concept,
        TransactionCategoryLabels[tx.category],
        formatSignedAmount(tx.amount, tx.type, formatLocale),
        TransactionStatusLabels[tx.status],
      ]),
    [transactions]
  );

  const handleExport = () => {
    if (transactions.length === 0) return;
    downloadXlsx("finanzas-transacciones.xlsx", "Transacciones", [
      ["Fecha", "Concepto", "Categoria", "Importe", "Estado"],
      ...exportRows,
    ]);
  };

  const rows = recentTransactions.map((tx) => ({
    key: tx.id,
    cells: [
      <div key={`${tx.id}-concept`}>
        <p className="font-semibold text-gray-900">{tx.concept}</p>
        {tx.description ? (
          <p className="text-xs text-gray-500">{tx.description}</p>
        ) : null}
      </div>,
      <span
        key={`${tx.id}-category`}
        className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600"
      >
        {TransactionCategoryLabels[tx.category]}
      </span>,
      <span
        key={`${tx.id}-amount`}
        className={`font-semibold ${
          tx.type === "income" ? "text-emerald-600" : "text-rose-600"
        }`}
      >
        {formatSignedAmount(tx.amount, tx.type, formatLocale)}
      </span>,
      <span key={`${tx.id}-date`} className="text-sm text-gray-600">
        {formatDate(tx.date, formatLocale)}
      </span>,
      <span
        key={`${tx.id}-status`}
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[tx.status]}`}
      >
        {TransactionStatusLabels[tx.status]}
      </span>,
    ],
    className: "hover:bg-gray-50",
  }));

  return (
    <div className="space-y-6 lg:space-y-8">
      <ModuleTopbar
        module={FINANCE_MODULE_TITLE}
        title={FINANCE_PAGE_TITLE}
        description={FINANCE_MODULE_DESCRIPTION}
        actions={
          <>
            <button
              type="button"
              onClick={handleExport}
              disabled={transactions.length === 0}
              className={`${moduleTopbarButtonStyles.secondary} inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span className="material-symbols-outlined text-[18px]">
                download
              </span>
              Exportar
            </button>
            <Link
              href="/accounting/new"
              className={`${moduleTopbarButtonStyles.primary} inline-flex items-center gap-2`}
            >
              <span className="material-symbols-outlined text-[18px]">
                add
              </span>
              Nuevo registro
            </Link>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <SectionBlock
          title="Gestión de cuotas"
          subtitle="Estado de cuotas y pagos"
          actions={
            <Link
              href="/finance/fees"
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow"
            >
              Ver cuotas
            </Link>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Pagadas
              </p>
              <p className="mt-2 text-xl font-semibold text-gray-900">
                {formatNumber(feePaidCount, formatLocale)}
              </p>
              <p className="text-xs text-gray-500">Cuotas completadas</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Pendientes
              </p>
              <p className="mt-2 text-xl font-semibold text-gray-900">
                {formatNumber(feePendingCount, formatLocale)}
              </p>
              <p className="text-xs text-gray-500">Cuotas en curso</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Total recaudado
              </p>
              <p className="mt-2 text-xl font-semibold text-emerald-600">
                {formatCurrency(feeCollectedAmount, formatLocale)}
              </p>
              <p className="text-xs text-gray-500">Ingresos confirmados</p>
            </div>
          </div>
        </SectionBlock>

        <SectionBlock
          title="Contabilidad general"
          subtitle="Ingresos y gastos operativos"
          actions={
            <Link
              href="/finance/accounting"
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Ver contabilidad
            </Link>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Ingresos
              </p>
              <p className="mt-2 text-xl font-semibold text-emerald-600">
                {formatCurrency(accountingTotals.income, formatLocale)}
              </p>
              <p className="text-xs text-gray-500">Ingresos realizados</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Gastos
              </p>
              <p className="mt-2 text-xl font-semibold text-rose-600">
                {formatCurrency(accountingTotals.expense, formatLocale)}
              </p>
              <p className="text-xs text-gray-500">Gastos confirmados</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Balance
              </p>
              <p className="mt-2 text-xl font-semibold text-gray-900">
                {formatCurrency(accountingTotals.balance, formatLocale)}
              </p>
              <p className="text-xs text-gray-500">Saldo neto</p>
            </div>
          </div>
        </SectionBlock>
      </section>

      <SectionBlock
        title="Transacciones recientes"
        subtitle="Movimientos financieros recientes"
        actions={
          <Link
            href="/accounting"
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Ver contabilidad
          </Link>
        }
      >
        <DataTable
          columns={[
            { key: "concept", label: "Concepto" },
            { key: "category", label: "Categoría" },
            { key: "amount", label: "Importe", align: "right" },
            { key: "date", label: "Fecha" },
            { key: "status", label: "Estado", align: "right" },
          ]}
          rows={rows}
          emptyLabel="No hay transacciones recientes."
        />
      </SectionBlock>
    </div>
  );
}
