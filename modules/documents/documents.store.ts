import { create } from "zustand";
import { db } from "@/core/storage/kora.db";
import { DocumentItem } from "./document.types";
import { useSessionStore } from "@/core/session/session.store";

interface DocumentsState {
  documents: DocumentItem[];
  loadDocuments: () => Promise<void>;
  upsertDocument: (doc: DocumentItem) => Promise<void>;
  upsertDocuments: (docs: DocumentItem[]) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  resetDocuments: () => void;
}

const isAuthenticated = () =>
  useSessionStore.getState().mode === "authenticated";

export const useDocumentsStore = create<DocumentsState>((set) => ({
  documents: [],

  loadDocuments: async () => {
    if (!isAuthenticated()) return;
    const all = await db.documents.toArray();
    set({ documents: all });
  },

  upsertDocument: async (doc) => {
    if (!isAuthenticated()) {
      set((state) => {
        const exists = state.documents.some((item) => item.id === doc.id);
        return {
          documents: exists
            ? state.documents.map((item) =>
                item.id === doc.id ? doc : item
              )
            : [doc, ...state.documents],
        };
      });
      return;
    }
    await db.documents.put(doc);
    set((state) => {
      const exists = state.documents.some((item) => item.id === doc.id);
      return {
        documents: exists
          ? state.documents.map((item) =>
              item.id === doc.id ? doc : item
            )
          : [doc, ...state.documents],
      };
    });
  },

  upsertDocuments: async (docs) => {
    if (docs.length === 0) return;
    if (!isAuthenticated()) {
      set((state) => {
        const map = new Map(
          state.documents.map((item) => [item.id, item])
        );
        docs.forEach((item) => {
          map.set(item.id, item);
        });
        return { documents: Array.from(map.values()) };
      });
      return;
    }
    await db.documents.bulkPut(docs);
    set((state) => {
      const map = new Map(state.documents.map((item) => [item.id, item]));
      docs.forEach((item) => {
        map.set(item.id, item);
      });
      return { documents: Array.from(map.values()) };
    });
  },

  deleteDocument: async (id) => {
    if (!isAuthenticated()) {
      set((state) => ({
        documents: state.documents.filter((item) => item.id !== id),
      }));
      return;
    }
    await db.documents.delete(id);
    set((state) => ({
      documents: state.documents.filter((item) => item.id !== id),
    }));
  },

  resetDocuments: () => set({ documents: [] }),
}));
