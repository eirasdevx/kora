"use client";

import { useEffect, useMemo } from "react";

import AccountingKPIs from "@/components/accounting/AccountingKPIs";
import TransactionsTable from "@/components/accounting/TransactionsTable";
import NewTransactionButton from "@/components/accounting/NewTransactionButton";
import PageHeader from "@/components/shared/PageHeader";

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
      <PageHeader
        title="Gestión de Contabilidad"
        subtitle="Supervisa el flujo de caja y mantén al día la salud financiera de tu asociación."
        backHref="/finance"
        backLabel="Volver a Finanzas"
        actions={<NewTransactionButton />}
      />

      <AccountingKPIs income={income} expense={expense} balance={balance} />

      <TransactionsTable transactions={transactions} />
    </div>
  );
}
