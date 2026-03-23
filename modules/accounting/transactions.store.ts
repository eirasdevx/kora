import { create } from "zustand";
import { Transaction } from "./transaction.types";
import { db } from "@/core/storage/kora.db";
import {
  getActiveAssociationId,
  getAssociationScopedRecords,
  withActiveAssociation,
} from "@/core/storage/association-scope";
import { useSessionStore } from "@/core/session/session.store";
import { useNotificationsStore } from "@/core/notifications/notifications.store";
import { ensureTransactionAccountingCode } from "@/modules/accounting/accounting-codes";
import {
  deleteAssociationModuleRecord,
  listAssociationModuleRecords,
  upsertAssociationModuleRecord,
} from "@/lib/client/association-data-client";

interface TransactionsState {
  transactions: Transaction[];
  loadTransactions: () => Promise<void>;
  addTransaction: (tx: Transaction) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  resetTransactions: () => void;
}

const isAuthenticated = () =>
  useSessionStore.getState().mode === "authenticated";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);

export const useTransactionsStore = create<TransactionsState>(
  (set, get) => ({
    transactions: [],

    loadTransactions: async () => {
      if (!isAuthenticated()) return;

      try {
        const persisted =
          await listAssociationModuleRecords<Transaction>("transactions");
        const association = useSessionStore.getState().association;
        const normalizedTransactions = persisted.map((transaction) =>
          ensureTransactionAccountingCode(transaction, association)
        );

        set({
          transactions: normalizedTransactions,
        });
        return;
      } catch (error) {
        console.error(error);
      }

      const all = await db.transactions.toArray();
      const { scopedRecords, migratedRecords } = getAssociationScopedRecords(
        all,
        getActiveAssociationId()
      );
      const association = useSessionStore.getState().association;
      const normalizedTransactions = scopedRecords.map((transaction) =>
        ensureTransactionAccountingCode(transaction, association)
      );
      const shouldBackfill = normalizedTransactions.some((transaction, index) => {
        const source = scopedRecords[index];
        return (
          transaction.accountingAccountKey !== source.accountingAccountKey ||
          transaction.accountCode !== source.accountCode ||
          transaction.accountLabel !== source.accountLabel
        );
      });

      if (shouldBackfill || migratedRecords.length > 0) {
        await db.transactions.bulkPut(normalizedTransactions);
      }

      set({
        transactions: normalizedTransactions,
      });
    },

    addTransaction: async (tx) => {
      const association = useSessionStore.getState().association;
      const normalizedTx = ensureTransactionAccountingCode(
        withActiveAssociation(tx),
        association
      );
      if (!isAuthenticated()) {
        set((state) => ({
          transactions: [...state.transactions, normalizedTx],
        }));
        const isIncome = normalizedTx.type === "income";
        useNotificationsStore.getState().addNotification({
          category: "payments",
          title: isIncome ? "Ingreso registrado" : "Gasto registrado",
          description: `${normalizedTx.concept} por ${formatCurrency(normalizedTx.amount)}.`,
          href: "/finance",
          actionLabel: "Ver detalle",
          icon: isIncome ? "check_circle" : "receipt_long",
          tone: isIncome
            ? "bg-emerald-50 text-emerald-600"
            : "bg-amber-50 text-amber-600",
        });
        return;
      }
      await upsertAssociationModuleRecord<Transaction>(
        "transactions",
        normalizedTx
      );
      await db.transactions.put(normalizedTx);
      set((state) => ({
        transactions: [...state.transactions, normalizedTx],
      }));
      const isIncome = normalizedTx.type === "income";
      useNotificationsStore.getState().addNotification({
        category: "payments",
        title: isIncome ? "Ingreso registrado" : "Gasto registrado",
        description: `${normalizedTx.concept} por ${formatCurrency(normalizedTx.amount)}.`,
        href: "/finance",
        actionLabel: "Ver detalle",
        icon: isIncome ? "check_circle" : "receipt_long",
        tone: isIncome
          ? "bg-emerald-50 text-emerald-600"
          : "bg-amber-50 text-amber-600",
      });
    },

    updateTransaction: async (tx) => {
      const association = useSessionStore.getState().association;
      const normalizedTx = ensureTransactionAccountingCode(
        withActiveAssociation(tx),
        association
      );
      if (!isAuthenticated()) {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === normalizedTx.id ? normalizedTx : t
          ),
        }));
        const isIncome = normalizedTx.type === "income";
        useNotificationsStore.getState().addNotification({
          category: "payments",
          title: isIncome ? "Ingreso actualizado" : "Gasto actualizado",
          description: `${normalizedTx.concept} por ${formatCurrency(normalizedTx.amount)}.`,
          href: "/finance",
          actionLabel: "Ver detalle",
          icon: isIncome ? "edit" : "edit",
          tone: isIncome
            ? "bg-blue-50 text-blue-600"
            : "bg-blue-50 text-blue-600",
        });
        return;
      }
      await upsertAssociationModuleRecord<Transaction>(
        "transactions",
        normalizedTx
      );
      await db.transactions.put(normalizedTx);
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === normalizedTx.id ? normalizedTx : t
        ),
      }));
      const isIncome = normalizedTx.type === "income";
      useNotificationsStore.getState().addNotification({
        category: "payments",
        title: isIncome ? "Ingreso actualizado" : "Gasto actualizado",
        description: `${normalizedTx.concept} por ${formatCurrency(normalizedTx.amount)}.`,
        href: "/finance",
        actionLabel: "Ver detalle",
        icon: "edit",
        tone: "bg-blue-50 text-blue-600",
      });
    },

    deleteTransaction: async (id) => {
      const target = get().transactions.find((item) => item.id === id);
      if (!isAuthenticated()) {
        set((state) => ({
          transactions: state.transactions.filter(
            (t) => t.id !== id
          ),
        }));
        useNotificationsStore.getState().addNotification({
          category: "payments",
          title: "Movimiento eliminado",
          description: target
            ? `${target.concept} por ${formatCurrency(target.amount)}.`
            : "Se eliminó un movimiento.",
          href: "/finance",
          actionLabel: "Ver movimientos",
          icon: "delete",
          tone: "bg-rose-50 text-rose-600",
        });
        return;
      }
      await deleteAssociationModuleRecord("transactions", id);
      await db.transactions.delete(id);
      set((state) => ({
        transactions: state.transactions.filter(
          (t) => t.id !== id
        ),
      }));
      useNotificationsStore.getState().addNotification({
        category: "payments",
        title: "Movimiento eliminado",
        description: target
          ? `${target.concept} por ${formatCurrency(target.amount)}.`
          : "Se eliminó un movimiento.",
        href: "/finance",
        actionLabel: "Ver movimientos",
        icon: "delete",
        tone: "bg-rose-50 text-rose-600",
      });
    },

    resetTransactions: () => set({ transactions: [] }),
  })
);
