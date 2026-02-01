"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import TransactionForm from "@/modules/accounting/TransactionForm";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";

export default function EditTransactionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { transactions, loadTransactions, updateTransaction } =
    useTransactionsStore();

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const transactionId =
    typeof params.id === "string" ? params.id : params.id?.[0];

  const transaction = useMemo(
    () => transactions.find((t) => t.id === transactionId),
    [transactions, transactionId]
  );

  if (!transaction) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500">
        Cargando transacción...
      </div>
    );
  }

  return (
    <TransactionForm
      initialData={transaction}
      onSubmit={async (tx) => {
        await updateTransaction(tx);
        router.push("/accounting");
      }}
      onCancel={() => router.push("/accounting")}
    />
  );
}
