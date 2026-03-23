"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import ModuleTopbar, {
  moduleTopbarButtonStyles,
} from "@/components/shared/ModuleTopbar";
import SectionBlock from "@/components/shared/SectionBlock";
import TransactionsTable from "@/components/accounting/TransactionsTable";
import { useLocale } from "@/core/i18n/use-locale";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";

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
    [transactions]
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

  return (
    <div className="space-y-6 lg:space-y-8">
      <ModuleTopbar
        module={FINANCE_MODULE_TITLE}
        title={FINANCE_PAGE_TITLE}
        description={FINANCE_MODULE_DESCRIPTION}
        actions={
          <Link
            href="/accounting/new"
            className={moduleTopbarButtonStyles.primary}
          >
            Nueva transacción
          </Link>
        }
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <SectionBlock
          title="Gestión de cuotas"
          subtitle="Estado de cuotas y pagos"
          actions={
            <div className="flex items-center gap-2">
              <Link
                href="/settings/association"
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Configurar planes
              </Link>
              <Link
                href="/accounting/fees"
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Gestionar cuotas
              </Link>
            </div>
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
          <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            Los tipos de cuota, importes y periodicidades se configuran desde
            la ficha de la asociación.
          </div>
        </SectionBlock>

        <SectionBlock
          title="Contabilidad general"
          subtitle="Ingresos y gastos operativos"
          actions={
            <div className="flex items-center gap-2">
              <Link
                href="/accounting/accounts"
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Elementos contables
              </Link>
              <Link
                href="/accounting"
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Abrir contabilidad
              </Link>
            </div>
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

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Transacciones
            </h2>
            <p className="text-sm text-gray-500">
              Vista operativa con filtros, exportación y acciones rápidas.
            </p>
          </div>
          <Link
            href="/accounting"
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Abrir contabilidad
          </Link>
        </div>

        <TransactionsTable transactions={transactions} />
      </section>
    </div>
  );
}
