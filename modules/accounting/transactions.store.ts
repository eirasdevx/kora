import { create } from "zustand";
import { Transaction } from "./transaction.types";

interface TransactionsState {
  transactions: Transaction[];

  loadTransactions: () => void;
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
}

const STORAGE_KEY = "kora.transactions";

function canUseStorage() {
  return typeof window !== "undefined";
}

function readTransactions(): Transaction[] {
  if (!canUseStorage()) return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Transaction[];
  } catch {
    return [];
  }
}

function writeTransactions(data: Transaction[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const useTransactionsStore = create<TransactionsState>(
  (set, get) => ({
    transactions: [],

    loadTransactions: () => {
      set({ transactions: readTransactions() });
    },

    addTransaction: (tx) => {
      const updated = [...get().transactions, tx];
      writeTransactions(updated);
      set({ transactions: updated });
    },

    updateTransaction: (tx) => {
      const updated = get().transactions.map((t) =>
        t.id === tx.id ? tx : t
      );
      writeTransactions(updated);
      set({ transactions: updated });
    },

    deleteTransaction: (id) => {
      const updated = get().transactions.filter(
        (t) => t.id !== id
      );
      writeTransactions(updated);
      set({ transactions: updated });
    },
  })
);
