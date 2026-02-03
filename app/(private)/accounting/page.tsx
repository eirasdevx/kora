"use client";

import { useEffect, useMemo } from "react";

import AccountingKPIs from "@/components/accounting/AccountingKPIs";
import TransactionsTable from "@/components/accounting/TransactionsTable";
import NewTransactionButton from "@/components/accounting/NewTransactionButton";
import PageTopbar from "@/components/PageTopbar";

import { useTransactionsStore } from "@/modules/accounting/transactions.store";

export default function AccountingPage() {
  const { transactions, loadTransactions } = useTransactionsStore();

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

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
      <PageTopbar>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Gestión de Tesorería</h1>
            <p className="text-sm text-gray-500">
              Supervisa el flujo de caja y mantén al día la salud financiera de tu asociación.
            </p>
          </div>
          <NewTransactionButton />
        </div>
      </PageTopbar>

      <AccountingKPIs income={income} expense={expense} balance={balance} />

      <TransactionsTable transactions={transactions} />
    </div>
  );
}
