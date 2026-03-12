"use client";

import { useRouter } from "next/navigation";
import TransactionForm from "@/modules/accounting/TransactionForm";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";

export default function NewTransactionPage() {
  const router = useRouter();
  const addTransaction = useTransactionsStore(
    (s) => s.addTransaction
  );

  return (
    <TransactionForm
      backHref="/accounting"
      backLabel="Volver a Contabilidad"
      onSubmit={async (tx) => {
        await addTransaction(tx);
        router.push("/accounting");
      }}
      onCancel={() => router.push("/accounting")}
    />
  );
}
