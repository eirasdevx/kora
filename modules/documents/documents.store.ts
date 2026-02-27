import { create } from "zustand";
import { db } from "@/core/storage/kora.db";
import { DocumentItem } from "./document.types";
import { useSessionStore } from "@/core/session/session.store";
import { useNotificationsStore } from "@/core/notifications/notifications.store";

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

export const useDocumentsStore = create<DocumentsState>((set, get) => ({
  documents: [],

  loadDocuments: async () => {
    if (!isAuthenticated()) return;
    const all = await db.documents.toArray();
    set({ documents: all });
  },

  upsertDocument: async (doc) => {
    const exists = get().documents.some((item) => item.id === doc.id);
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
      useNotificationsStore.getState().addNotification({
        category: "documents",
        title: exists ? "Documento actualizado" : "Documento agregado",
        description: doc.name
          ? `Se ${exists ? "actualizo" : "agrego"} ${doc.name}.`
          : "Se guardo un documento.",
        href: "/documents",
        actionLabel: "Ver documento",
        icon: "description",
        tone: "bg-blue-50 text-blue-600",
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
    useNotificationsStore.getState().addNotification({
      category: "documents",
      title: exists ? "Documento actualizado" : "Documento agregado",
      description: doc.name
        ? `Se ${exists ? "actualizo" : "agrego"} ${doc.name}.`
        : "Se guardo un documento.",
      href: "/documents",
      actionLabel: "Ver documento",
      icon: "description",
      tone: "bg-blue-50 text-blue-600",
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
    const target = get().documents.find((item) => item.id === id);
    if (!isAuthenticated()) {
      set((state) => ({
        documents: state.documents.filter((item) => item.id !== id),
      }));
      useNotificationsStore.getState().addNotification({
        category: "documents",
        title: "Documento eliminado",
        description: target?.name
          ? `Se elimino ${target.name}.`
          : "Se elimino un documento.",
        href: "/documents",
        actionLabel: "Ver documentos",
        icon: "delete",
        tone: "bg-rose-50 text-rose-600",
      });
      return;
    }
    await db.documents.delete(id);
    set((state) => ({
      documents: state.documents.filter((item) => item.id !== id),
    }));
    useNotificationsStore.getState().addNotification({
      category: "documents",
      title: "Documento eliminado",
      description: target?.name
        ? `Se elimino ${target.name}.`
        : "Se elimino un documento.",
      href: "/documents",
      actionLabel: "Ver documentos",
      icon: "delete",
      tone: "bg-rose-50 text-rose-600",
    });
  },

  resetDocuments: () => set({ documents: [] }),
}));
