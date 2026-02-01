import { create } from "zustand";
import { Transaction } from "./transaction.types";
import { db } from "@/core/storage/kora.db";

interface TransactionsState {
  transactions: Transaction[];
  loadTransactions: () => Promise<void>;
  addTransaction: (tx: Transaction) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const useTransactionsStore = create<TransactionsState>(
  (set) => ({
    transactions: [],

    loadTransactions: async () => {
      const all = await db.transactions.toArray();
      set({ transactions: all });
    },

    addTransaction: async (tx) => {
      await db.transactions.put(tx);
      set((state) => ({
        transactions: [...state.transactions, tx],
      }));
    },

    updateTransaction: async (tx) => {
      await db.transactions.put(tx);
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === tx.id ? tx : t
        ),
      }));
    },

    deleteTransaction: async (id) => {
      await db.transactions.delete(id);
      set((state) => ({
        transactions: state.transactions.filter(
          (t) => t.id !== id
        ),
      }));
    },
  })
);
