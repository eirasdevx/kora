import { create } from "zustand";
import { db } from "@/core/storage/kora.db";
import { DocumentItem } from "./document.types";
import {
  getActiveAssociationId,
  getAssociationScopedRecords,
  withActiveAssociation,
} from "@/core/storage/association-scope";
import { useSessionStore } from "@/core/session/session.store";
import { useNotificationsStore } from "@/core/notifications/notifications.store";
import {
  deleteAssociationModuleRecord,
  listAssociationModuleRecords,
  saveAssociationModuleRecords,
  shouldLogAssociationDataError,
  upsertAssociationModuleRecord,
} from "@/lib/client/association-data-client";

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
    const { scopedRecords, migratedRecords } = getAssociationScopedRecords(
      all,
      getActiveAssociationId()
    );

    try {
      const persisted =
        await listAssociationModuleRecords<DocumentItem>("documents");
      const localById = new Map(scopedRecords.map((item) => [item.id, item]));
      const mergedDocuments = persisted.map((item) => {
        const cachedItem = localById.get(item.id);

        if (!cachedItem) {
          return item;
        }

        return {
          ...cachedItem,
          ...item,
          file: item.file ?? cachedItem.file,
        };
      });

      if (mergedDocuments.length > 0 || migratedRecords.length > 0) {
        await db.documents.bulkPut(mergedDocuments);
      }

      set({ documents: mergedDocuments });
      return;
    } catch (error) {
      if (shouldLogAssociationDataError(error)) {
        console.error(error);
      }
    }

    if (migratedRecords.length > 0) {
      await db.documents.bulkPut(scopedRecords);
    }

    set({ documents: scopedRecords });
  },

  upsertDocument: async (doc) => {
    const scopedDoc = withActiveAssociation(doc);
    const exists = get().documents.some((item) => item.id === scopedDoc.id);
    if (!isAuthenticated()) {
      set((state) => {
        const exists = state.documents.some((item) => item.id === scopedDoc.id);
        return {
          documents: exists
            ? state.documents.map((item) =>
                item.id === scopedDoc.id ? scopedDoc : item
              )
            : [scopedDoc, ...state.documents],
        };
      });
      useNotificationsStore.getState().addNotification({
        category: "documents",
        title: exists ? "Documento actualizado" : "Documento agregado",
        description: doc.name
          ? `Se ${exists ? "actualizó" : "agregó"} ${doc.name}.`
          : "Se guardó un documento.",
        href: "/documents",
        actionLabel: "Ver documento",
        icon: "description",
        tone: "bg-blue-50 text-blue-600",
      });
      return;
    }
    await upsertAssociationModuleRecord<DocumentItem>("documents", scopedDoc);
    await db.documents.put(scopedDoc);
    set((state) => {
      const exists = state.documents.some((item) => item.id === scopedDoc.id);
      return {
        documents: exists
          ? state.documents.map((item) =>
              item.id === scopedDoc.id ? scopedDoc : item
            )
          : [scopedDoc, ...state.documents],
      };
    });
    useNotificationsStore.getState().addNotification({
      category: "documents",
      title: exists ? "Documento actualizado" : "Documento agregado",
      description: doc.name
        ? `Se ${exists ? "actualizó" : "agregó"} ${doc.name}.`
        : "Se guardó un documento.",
      href: "/documents",
      actionLabel: "Ver documento",
      icon: "description",
      tone: "bg-blue-50 text-blue-600",
    });
  },

  upsertDocuments: async (docs) => {
    if (docs.length === 0) return;
    const scopedDocs = docs.map((doc) => withActiveAssociation(doc));
    if (!isAuthenticated()) {
      set((state) => {
        const map = new Map(
          state.documents.map((item) => [item.id, item])
        );
        scopedDocs.forEach((item) => {
          map.set(item.id, item);
        });
        return { documents: Array.from(map.values()) };
      });
      return;
    }
    await saveAssociationModuleRecords<DocumentItem>(
      "documents",
      scopedDocs,
      "merge"
    );
    await db.documents.bulkPut(scopedDocs);
    set((state) => {
      const map = new Map(state.documents.map((item) => [item.id, item]));
      scopedDocs.forEach((item) => {
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
          ? `Se eliminó ${target.name}.`
          : "Se eliminó un documento.",
        href: "/documents",
        actionLabel: "Ver documentos",
        icon: "delete",
        tone: "bg-rose-50 text-rose-600",
      });
      return;
    }
    await deleteAssociationModuleRecord("documents", id);
    await db.documents.delete(id);
    set((state) => ({
      documents: state.documents.filter((item) => item.id !== id),
    }));
    useNotificationsStore.getState().addNotification({
      category: "documents",
      title: "Documento eliminado",
      description: target?.name
        ? `Se eliminó ${target.name}.`
        : "Se eliminó un documento.",
      href: "/documents",
      actionLabel: "Ver documentos",
      icon: "delete",
      tone: "bg-rose-50 text-rose-600",
    });
  },

  resetDocuments: () => set({ documents: [] }),
}));
