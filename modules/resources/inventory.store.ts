import { create } from "zustand";
import { db } from "@/core/storage/kora.db";
import { useSessionStore } from "@/core/session/session.store";
import {
  getActiveAssociationId,
  getAssociationScopedRecords,
  withActiveAssociation,
} from "@/core/storage/association-scope";
import { InventoryItem, InventoryStatus } from "./inventory.types";
import { useNotificationsStore } from "@/core/notifications/notifications.store";
import {
  deleteAssociationModuleRecord,
  listAssociationModuleRecords,
  saveAssociationModuleRecords,
  shouldLogAssociationDataError,
  upsertAssociationModuleRecord,
} from "@/lib/client/association-data-client";

interface InventoryState {
  items: InventoryItem[];
  loadItems: () => Promise<void>;
  upsertItem: (item: InventoryItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clearItems: () => Promise<void>;
  resetItems: () => void;
}

const isAuthenticated = () =>
  useSessionStore.getState().mode === "authenticated";

const normalizeStatus = (
  status: InventoryStatus | undefined,
  borrowed: number
) => {
  if (status) return status;
  if (borrowed > 0) return "in_use";
  return "available";
};

const normalizeItem = (item: InventoryItem): InventoryItem => {
  const quantity =
    Number.isFinite(item.quantity) && item.quantity > 0
      ? item.quantity
      : 1;
  const borrowed =
    Number.isFinite(item.borrowed) && item.borrowed >= 0
      ? Math.min(item.borrowed, quantity)
      : item.status === "in_use"
        ? Math.min(1, quantity)
        : 0;

  return {
    ...item,
    quantity,
    borrowed,
    status: normalizeStatus(item.status, borrowed),
    createdAt: item.createdAt ?? new Date().toISOString(),
  };
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],

  loadItems: async () => {
    if (!isAuthenticated()) return;

    const all = await db.inventory.toArray();
    const { scopedRecords, migratedRecords } = getAssociationScopedRecords(
      all,
      getActiveAssociationId()
    );

    try {
      const persisted =
        await listAssociationModuleRecords<InventoryItem>("inventory");
      const normalizedPersistedItems = persisted.map((item) =>
        normalizeItem(item)
      );

      if (normalizedPersistedItems.length > 0 || migratedRecords.length > 0) {
        await db.inventory.bulkPut(normalizedPersistedItems);
      }

      set({ items: normalizedPersistedItems });
      return;
    } catch (error) {
      if (shouldLogAssociationDataError(error)) {
        console.error(error);
      }
    }

    const normalizedItems = scopedRecords.map((item) => normalizeItem(item));

    if (migratedRecords.length > 0) {
      await db.inventory.bulkPut(normalizedItems);
    }

    set({ items: normalizedItems });
  },

  upsertItem: async (item) => {
    const exists = get().items.some((entry) => entry.id === item.id);
    const normalized = normalizeItem(withActiveAssociation(item));
    if (!isAuthenticated()) {
      set((state) => {
        const exists = state.items.some((entry) => entry.id === item.id);
        return {
          items: exists
            ? state.items.map((entry) =>
                entry.id === item.id ? normalized : entry
              )
            : [normalized, ...state.items],
        };
      });
      useNotificationsStore.getState().addNotification({
        category: "system",
        title: exists ? "Recurso actualizado" : "Nuevo recurso registrado",
        description: normalized.name
          ? `Se ${exists ? "actualizó" : "registró"} ${normalized.name}.`
          : exists
            ? "Se actualizó un recurso."
            : "Se registró un recurso.",
        href: "/resources",
        actionLabel: "Ver recursos",
        icon: "inventory_2",
        tone: "bg-slate-100 text-slate-600",
      });
      return;
    }

    await upsertAssociationModuleRecord<InventoryItem>("inventory", normalized);
    await db.inventory.put(normalized);
    set((state) => {
      const exists = state.items.some((entry) => entry.id === item.id);
      return {
        items: exists
          ? state.items.map((entry) =>
              entry.id === item.id ? normalized : entry
            )
          : [normalized, ...state.items],
      };
    });
    useNotificationsStore.getState().addNotification({
      category: "system",
      title: exists ? "Recurso actualizado" : "Nuevo recurso registrado",
      description: normalized.name
        ? `Se ${exists ? "actualizó" : "registró"} ${normalized.name}.`
        : exists
          ? "Se actualizó un recurso."
          : "Se registró un recurso.",
      href: "/resources",
      actionLabel: "Ver recursos",
      icon: "inventory_2",
      tone: "bg-slate-100 text-slate-600",
    });
  },

  removeItem: async (id) => {
    const target = get().items.find((entry) => entry.id === id);
    if (!isAuthenticated()) {
      set((state) => ({
        items: state.items.filter((entry) => entry.id !== id),
      }));
      useNotificationsStore.getState().addNotification({
        category: "system",
        title: "Recurso eliminado",
        description: target?.name
          ? `Se eliminó ${target.name}.`
          : "Se eliminó un recurso.",
        href: "/resources",
        actionLabel: "Ver recursos",
        icon: "delete",
        tone: "bg-rose-50 text-rose-600",
      });
      return;
    }

    await deleteAssociationModuleRecord("inventory", id);
    await db.inventory.delete(id);
    set((state) => ({
      items: state.items.filter((entry) => entry.id !== id),
    }));
    useNotificationsStore.getState().addNotification({
      category: "system",
      title: "Recurso eliminado",
      description: target?.name
        ? `Se eliminó ${target.name}.`
        : "Se eliminó un recurso.",
      href: "/resources",
      actionLabel: "Ver recursos",
      icon: "delete",
      tone: "bg-rose-50 text-rose-600",
    });
  },

  clearItems: async () => {
    if (!isAuthenticated()) {
      set({ items: [] });
      useNotificationsStore.getState().addNotification({
        category: "system",
        title: "Inventario limpiado",
        description: "Se eliminaron todos los recursos del inventario.",
        href: "/resources",
        actionLabel: "Ver recursos",
        icon: "delete_sweep",
        tone: "bg-rose-50 text-rose-600",
      });
      return;
    }

    await saveAssociationModuleRecords<InventoryItem>("inventory", [], "replace");
    const all = await db.inventory.toArray();
    const { scopedRecords } = getAssociationScopedRecords(
      all,
      getActiveAssociationId()
    );

    await db.inventory.bulkDelete(scopedRecords.map((item) => item.id));
    set({ items: [] });
    useNotificationsStore.getState().addNotification({
      category: "system",
      title: "Inventario limpiado",
      description: "Se eliminaron todos los recursos del inventario.",
      href: "/resources",
      actionLabel: "Ver recursos",
      icon: "delete_sweep",
      tone: "bg-rose-50 text-rose-600",
    });
  },

    resetItems: () => set({ items: [] }),
}));
