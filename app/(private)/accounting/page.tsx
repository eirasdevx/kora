"use client";

import { useEffect, useMemo } from "react";

import AccountingKPIs from "@/components/accounting/AccountingKPIs";
import TransactionsTable from "@/components/accounting/TransactionsTable";
import NewTransactionButton from "@/components/accounting/NewTransactionButton";

import { useTransactionsStore } from "@/modules/accounting/transactions.store";

export default function AccountingPage() {
  const { transactions, loadTransactions } =
    useTransactionsStore();

  // Cargar transacciones al entrar
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // KPIs calculados
  const { income, expense, balance } = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const tx of transactions) {
      if (tx.status !== "completed") continue;

      if (tx.type === "income") {
        income += tx.amount;
      } else {
        expense += tx.amount;
      }
    }

    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Gestión de Tesorería
          </h1>
          <p className="text-gray-500">
            Supervisa el flujo de caja y mantén al día la
            salud financiera de tu asociación.
          </p>
        </div>

        <NewTransactionButton />
      </div>

      {/* KPIs */}
      <AccountingKPIs
        income={income}
        expense={expense}
        balance={balance}
      />

      {/* Tabla */}
      <TransactionsTable transactions={transactions} />
    </div>
  );
}
