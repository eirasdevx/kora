import { create } from "zustand";
import { Transaction } from "./transaction.types";
import { db } from "@/core/storage/kora.db";
import { useSessionStore } from "@/core/session/session.store";

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

export const useTransactionsStore = create<TransactionsState>(
  (set) => ({
    transactions: [],

    loadTransactions: async () => {
      if (!isAuthenticated()) return;
      const all = await db.transactions.toArray();
      set({ transactions: all });
    },

    addTransaction: async (tx) => {
      if (!isAuthenticated()) {
        set((state) => ({
          transactions: [...state.transactions, tx],
        }));
        return;
      }
      await db.transactions.put(tx);
      set((state) => ({
        transactions: [...state.transactions, tx],
      }));
    },

    updateTransaction: async (tx) => {
      if (!isAuthenticated()) {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === tx.id ? tx : t
          ),
        }));
        return;
      }
      await db.transactions.put(tx);
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === tx.id ? tx : t
        ),
      }));
    },

    deleteTransaction: async (id) => {
      if (!isAuthenticated()) {
        set((state) => ({
          transactions: state.transactions.filter(
            (t) => t.id !== id
          ),
        }));
        return;
      }
      await db.transactions.delete(id);
      set((state) => ({
        transactions: state.transactions.filter(
          (t) => t.id !== id
        ),
      }));
    },

    resetTransactions: () => set({ transactions: [] }),
  })
);
