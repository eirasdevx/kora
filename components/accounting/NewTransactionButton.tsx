"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import TransactionForm from "@/modules/accounting/TransactionForm";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import { Transaction } from "@/modules/accounting/transaction.types";

export default function NewTransactionButton() {
  const [open, setOpen] = useState(false);

  const updateTransaction = useTransactionsStore(
    (s) => s.updateTransaction
  );

  const handleSubmit = async (tx: Transaction) => {
    updateTransaction(tx);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-primary text-white px-6 py-3 rounded-lg font-bold shadow"
      >
        + Nueva Transacción
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
      >
        <TransactionForm
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
