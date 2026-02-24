"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import SectionBlock from "@/components/shared/SectionBlock";
import StatCard from "@/components/shared/StatCard";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/Modal";
import {
  RECENT_LOANS,
  type LoanRecord,
} from "@/modules/resources/resources.mock";
import { useInventoryStore } from "@/modules/resources/inventory.store";
import { InventoryItem } from "@/modules/resources/inventory.types";

const LOAN_STATUS_LABELS: Record<LoanRecord["status"], string> = {
  active: "En curso",
  overdue: "Vencido",
  returned: "Devuelto",
};

const LOAN_STATUS_STYLES: Record<LoanRecord["status"], string> = {
  active: "bg-blue-50 text-blue-600",
  overdue: "bg-rose-50 text-rose-600",
  returned: "bg-emerald-50 text-emerald-600",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function ResourcesInventoryPage() {
  const { items, loadItems, removeItem, clearItems } = useInventoryStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteFinal, setConfirmDeleteFinal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(
    null
  );

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const summary = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.quantity, 0);
    const borrowed = items.reduce((sum, item) => sum + item.borrowed, 0);
    return { total, borrowed, available: total - borrowed };
  }, [items]);

  const handleDelete = (item: InventoryItem) => {
    setSelectedItem(item);
    setConfirmDelete(true);
  };

  const handleClear = async () => {
    const confirmed = window.confirm(
      "¿Vaciar todo el inventario? Se eliminarán todos los activos."
    );
    if (!confirmed) return;
    await clearItems();
  };

  const rows = items.map((item) => {
    const available = Math.max(0, item.quantity - item.borrowed);
    return {
      key: item.id,
      cells: [
        <span key={`${item.id}-name`} className="font-semibold text-gray-900">
          {item.name}
        </span>,
        <span key={`${item.id}-category`} className="text-sm text-gray-600">
          {item.category}
        </span>,
        <span key={`${item.id}-qty`} className="text-sm text-gray-700">
          {formatNumber(item.quantity)}
        </span>,
        <span key={`${item.id}-borrowed`} className="text-sm text-gray-700">
          {formatNumber(item.borrowed)}
        </span>,
        <span
          key={`${item.id}-available`}
          className="text-sm font-semibold text-emerald-600"
        >
          {formatNumber(available)}
        </span>,
        <div
          key={`${item.id}-actions`}
          className="flex items-center justify-end gap-2"
        >
          <Link
            href={`/resources/inventory/${item.id}/edit`}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-primary/40 hover:text-primary"
          >
            Editar
            <span className="material-symbols-outlined text-[14px]">
              edit
            </span>
          </Link>
          <button
            type="button"
            onClick={() => handleDelete(item)}
            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:border-rose-300 hover:bg-rose-50"
          >
            Eliminar
            <span className="material-symbols-outlined text-[14px]">
              delete
            </span>
          </button>
        </div>,
      ],
      className: "hover:bg-gray-50",
    };
  });

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Inventario"
        subtitle="Control de activos y préstamos"
        backHref="/resources"
        backLabel="Volver a Recursos"
        actions={
          <>
            {items.length > 0 ? (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50"
              >
                Vaciar inventario
              </button>
            ) : null}
            <Link
              href="/resources/inventory/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-[18px]">
                add
              </span>
              Nuevo activo
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Artículos totales"
          value={`${formatNumber(summary.total)} artículos`}
          meta={`${formatNumber(summary.borrowed)} prestados`}
          icon="inventory_2"
          accentClassName="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Disponibles"
          value={`${formatNumber(summary.available)} artículos`}
          meta="Listos para uso"
          icon="task_alt"
          accentClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="En uso"
          value={`${formatNumber(summary.borrowed)} artículos`}
          meta="Préstamos activos"
          icon="handshake"
          accentClassName="bg-blue-50 text-blue-600"
        />
      </section>

      <SectionBlock title="Inventario" subtitle="Detalle de activos disponibles">
        {items.length === 0 ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-600">
            Todavía no hay activos registrados.
            <Link
              href="/resources/inventory/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-primary/90"
            >
              Registrar primer activo
            </Link>
          </div>
        ) : null}
        <DataTable
          columns={[
            { key: "item", label: "Artículo" },
            { key: "category", label: "Categoría" },
            { key: "qty", label: "Cantidad", align: "right" },
            { key: "borrowed", label: "Prestados", align: "right" },
            { key: "available", label: "Disponibles", align: "right" },
            { key: "actions", label: "Acciones", align: "right" },
          ]}
          rows={rows}
          emptyLabel="No hay artículos en inventario."
        />
      </SectionBlock>

      <SectionBlock
        title="Préstamos recientes"
        subtitle="Movimientos recientes de inventario"
        actions={
          <Link
            href="/resources"
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Ver resumen
          </Link>
        }
      >
        <div className="space-y-3">
          {RECENT_LOANS.map((loan) => (
            <div
              key={loan.id}
              className="flex items-center justify-between rounded-2xl border border-gray-200 p-3"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {loan.item}
                </p>
                <p className="text-xs text-gray-500">
                  {loan.borrower} · {formatDate(loan.dueDate)}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${LOAN_STATUS_STYLES[loan.status]}`}
              >
                {LOAN_STATUS_LABELS[loan.status]}
              </span>
            </div>
          ))}
        </div>
      </SectionBlock>

      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="¿Eliminar activo?"
      >
        <p className="mb-6">
          ¿Seguro que quieres eliminar{" "}
          <strong>{selectedItem?.name?.trim() || "este activo"}</strong>?
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-4 py-2 border rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              setConfirmDeleteFinal(true);
              setConfirmDelete(false);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            Sí, eliminar
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={confirmDeleteFinal}
        onClose={() => setConfirmDeleteFinal(false)}
        title="Confirmación final"
      >
        <p className="mb-6 text-red-600 font-medium">
          Esta acción no se puede deshacer.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDeleteFinal(false)}
            className="px-4 py-2 border rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              if (selectedItem) {
                await removeItem(selectedItem.id);
              }
              setConfirmDeleteFinal(false);
              setSelectedItem(null);
            }}
            className="px-4 py-2 bg-red-700 text-white rounded-lg"
          >
            Eliminar definitivamente
          </button>
        </div>
      </Modal>
    </div>
  );
}
