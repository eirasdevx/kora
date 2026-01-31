"use client";

import { useState } from "react";
import {
  Transaction,
  TransactionCategoryLabels,
  TransactionStatusLabels,
} from "@/modules/accounting/transaction.types";
import Modal from "@/components/Modal";
import TransactionForm from "@/modules/accounting/TransactionForm";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";

interface Props {
  transactions: Transaction[];
}

function formatAmount(amount: number, type: "income" | "expense") {
  const value = type === "expense" ? -amount : amount;
  return value.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

export default function TransactionsTable({ transactions }: Props) {
  const updateTransaction = useTransactionsStore(
    (s) => s.updateTransaction
  );
  const deleteTransaction = useTransactionsStore(
    (s) => s.deleteTransaction
  );

  const [editingTx, setEditingTx] =
    useState<Transaction | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] =
    useState<string | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-6 text-gray-500">
        No hay transacciones registradas.
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-left">Fecha</th>
              <th className="p-4 text-left">Concepto</th>
              <th className="p-4 text-left">Categoría</th>
              <th className="p-4 text-left">Estado</th>
              <th className="p-4 text-right">Importe</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="border-b last:border-0 hover:bg-gray-50"
              >
                <td className="p-4">
                  {new Date(tx.date).toLocaleDateString("es-ES")}
                </td>

                <td className="p-4">
                  <div className="font-medium">
                    {tx.concept}
                  </div>
                  {tx.description && (
                    <div className="text-gray-500 text-xs">
                      {tx.description}
                    </div>
                  )}
                </td>

                <td className="p-4">
                  {TransactionCategoryLabels[tx.category]}
                </td>

                <td className="p-4">
                  {TransactionStatusLabels[tx.status]}
                </td>

                <td
                  className={`p-4 text-right font-medium ${
                    tx.type === "income"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatAmount(tx.amount, tx.type)}
                </td>

                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => setEditingTx(tx)}
                    className="text-primary hover:underline text-sm"
                  >
                    Editar
                  </button>

                  {confirmDeleteId === tx.id ? (
                    <span className="space-x-2">
                      <button
                        onClick={() =>
                          setConfirmDeleteId(null)
                        }
                        className="text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() =>
                          deleteTransaction(tx.id)
                        }
                        className="text-sm text-red-600 font-medium"
                      >
                        Confirmar
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        setConfirmDeleteId(tx.id)
                      }
                      className="text-red-600 hover:underline text-sm"
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal editar */}
      <Modal
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        title="Editar transacción"
      >
        {editingTx && (
          <TransactionForm
            key={editingTx.id}
            initialData={editingTx}
            onSubmit={async (tx) => {
              updateTransaction(tx);
              setEditingTx(null);
            }}
            onCancel={() => setEditingTx(null)}
          />
        )}
      </Modal>
    </>
  );
}
