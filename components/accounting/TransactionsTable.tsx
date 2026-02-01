"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Transaction,
  TransactionCategoryLabels,
  TransactionStatusLabels,
} from "@/modules/accounting/transaction.types";
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

const STATUS_STYLES: Record<
  keyof typeof TransactionStatusLabels,
  string
> = {
  completed: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
};

export default function TransactionsTable({ transactions }: Props) {
  const deleteTransaction = useTransactionsStore(
    (s) => s.deleteTransaction
  );
  const [confirmDeleteId, setConfirmDeleteId] =
    useState<string | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500">
        No hay transacciones registradas.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
          <tr>
            <th className="px-6 py-4 text-left">Fecha</th>
            <th className="px-6 py-4 text-left">Concepto</th>
            <th className="px-6 py-4 text-left">Categoría</th>
            <th className="px-6 py-4 text-left">Estado</th>
            <th className="px-6 py-4 text-right">Importe</th>
            <th className="px-6 py-4 text-right">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx.id}
              className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
            >
              <td className="px-6 py-4 text-sm text-gray-600">
                {new Date(tx.date).toLocaleDateString("es-ES")}
              </td>

              <td className="px-6 py-4">
                <div className="font-semibold text-gray-900">
                  {tx.concept}
                </div>
                {tx.description && (
                  <div className="text-gray-500 text-xs">
                    {tx.description}
                  </div>
                )}
              </td>

              <td className="px-6 py-4">
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                  {TransactionCategoryLabels[tx.category]}
                </span>
              </td>

              <td className="px-6 py-4">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    STATUS_STYLES[tx.status]
                  }`}
                >
                  {TransactionStatusLabels[tx.status]}
                </span>
              </td>

              <td
                className={`px-6 py-4 text-right font-semibold ${
                  tx.type === "income"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatAmount(tx.amount, tx.type)}
              </td>

              <td className="px-6 py-4 text-right">
                {confirmDeleteId === tx.id ? (
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
                    >
                      Confirmar
                    </button>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2">
                    <Link
                      href={`/accounting/${tx.id}/edit`}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => setConfirmDeleteId(tx.id)}
                      className="rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
