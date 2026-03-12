"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import {
  moduleTopbarButtonIconStyles,
  moduleTopbarButtonStyles,
} from "@/components/shared/ModuleTopbar";
import SectionBlock from "@/components/shared/SectionBlock";
import StatCard from "@/components/shared/StatCard";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/Modal";
import { useLocale } from "@/core/i18n/use-locale";
import { downloadPdf, downloadXlsx } from "@/lib/exporters";
import { useInventoryStore } from "@/modules/resources/inventory.store";
import { InventoryItem, InventoryStatus } from "@/modules/resources/inventory.types";

const ITEM_STATUS_LABELS: Record<InventoryStatus, string> = {
  available: "Disponible",
  in_use: "En uso",
  maintenance: "Mantenimiento",
  retired: "Retirado",
};

const ITEM_STATUS_STYLES: Record<InventoryStatus, string> = {
  available: "bg-emerald-50 text-emerald-600",
  in_use: "bg-blue-50 text-blue-600",
  maintenance: "bg-amber-50 text-amber-700",
  retired: "bg-slate-100 text-slate-500",
};

const INVENTORY_PDF_COLUMNS = [
  { label: "Item", width: 18 },
  { label: "Detalles", width: 70 },
];

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrency(value: number | undefined, locale: string) {
  if (value === undefined || value === null) return "-";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | undefined, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function ResourcesInventoryPage() {
  const { formatLocale } = useLocale();
  const { items, loadItems, removeItem } = useInventoryStore();
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

  const exportRowsXlsx = useMemo(() => {
    return items.map((item) => {
      const status =
        item.status ?? (item.borrowed > 0 ? "in_use" : "available");
      const available = Math.max(0, item.quantity - item.borrowed);
      return [
        item.name,
        item.category,
        formatNumber(item.quantity, formatLocale),
        formatNumber(item.borrowed, formatLocale),
        formatNumber(available, formatLocale),
        ITEM_STATUS_LABELS[status],
        item.serial ?? "-",
        item.location ?? "-",
        item.assignee ?? "-",
        formatDate(item.acquisitionDate, formatLocale),
        formatCurrency(item.value, formatLocale),
        item.notes ?? "-",
      ];
    });
  }, [items, formatLocale]);

  const exportRowsPdf = useMemo(() => {
    return items.map((item) => {
      const status =
        item.status ?? (item.borrowed > 0 ? "in_use" : "available");
      const available = Math.max(0, item.quantity - item.borrowed);
      const details = [
        `Categoría: ${item.category}`,
        `Cantidad: ${formatNumber(item.quantity, formatLocale)}`,
        `Prestados: ${formatNumber(item.borrowed, formatLocale)}`,
        `Disponibles: ${formatNumber(available, formatLocale)}`,
        `Estado: ${ITEM_STATUS_LABELS[status]}`,
        item.serial ? `Serie: ${item.serial}` : null,
        item.location ? `Ubicación: ${item.location}` : null,
        item.assignee ? `Asignado a: ${item.assignee}` : null,
        item.acquisitionDate
          ? `Adquisición: ${formatDate(item.acquisitionDate, formatLocale)}`
          : null,
        item.value !== undefined
          ? `Valor: ${formatCurrency(item.value, formatLocale)}`
          : null,
        item.notes ? `Notas: ${item.notes}` : null,
      ]
        .filter(Boolean)
        .join(" | ");
      return [item.name, details];
    });
  }, [items, formatLocale]);

  const handleExportXlsx = () => {
    if (items.length === 0) return;
    downloadXlsx("inventario.xlsx", "Inventario", [
      [
        "Nombre",
        "Categoría",
        "Cantidad",
        "Prestados",
        "Disponibles",
        "Estado",
        "Serie",
        "Ubicación",
        "Asignado a",
        "Fecha adquisición",
        "Valor",
        "Notas",
      ],
      ...exportRowsXlsx,
    ]);
  };

  const handleExportPdf = () => {
    if (items.length === 0) return;
    downloadPdf(
      "inventario.pdf",
      "Inventario - listado de activos",
      INVENTORY_PDF_COLUMNS,
      exportRowsPdf
    );
  };

  const handleDelete = (item: InventoryItem) => {
    setSelectedItem(item);
    setConfirmDelete(true);
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
          {formatNumber(item.quantity, formatLocale)}
        </span>,
        <span key={`${item.id}-borrowed`} className="text-sm text-gray-700">
          {formatNumber(item.borrowed, formatLocale)}
        </span>,
        <span
          key={`${item.id}-available`}
          className="text-sm font-semibold text-emerald-600"
        >
          {formatNumber(available, formatLocale)}
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

  const recentLoans = useMemo(() => {
    return [...items]
      .filter((item) => item.borrowed > 0)
      .map((item) => ({
        item,
        lastMove: item.updatedAt ?? item.createdAt,
        borrower:
          item.assignee?.trim() || item.location?.trim() || "Sin asignar",
      }))
      .sort((a, b) => {
        const aTime = a.lastMove ? new Date(a.lastMove).getTime() : 0;
        const bTime = b.lastMove ? new Date(b.lastMove).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [items]);

  const loanRows = recentLoans.map(({ item, lastMove, borrower }) => {
    const status =
      item.status ?? (item.borrowed > 0 ? "in_use" : "available");

    return {
      key: `loan-${item.id}`,
      cells: [
        <div key={`${item.id}-loan-item`}>
          <p className="font-semibold text-gray-900">{item.name}</p>
          <p className="text-xs text-gray-500">{item.category}</p>
        </div>,
        <span
          key={`${item.id}-loan-borrower`}
          className="text-sm text-gray-600"
        >
          {borrower}
        </span>,
        <span
          key={`${item.id}-loan-qty`}
          className="text-sm font-semibold text-gray-700"
        >
          {formatNumber(item.borrowed, formatLocale)}
        </span>,
        <span key={`${item.id}-loan-date`} className="text-sm text-gray-600">
          {formatDate(lastMove, formatLocale)}
        </span>,
        <span
          key={`${item.id}-loan-status`}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ITEM_STATUS_STYLES[status]}`}
        >
          {ITEM_STATUS_LABELS[status]}
        </span>,
        <div key={`${item.id}-loan-actions`} className="flex justify-end">
          <Link
            href={`/resources/inventory/${item.id}/edit`}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Ver activo
          </Link>
        </div>,
      ],
      className: "hover:bg-gray-50",
    };
  });

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Inventario"
        subtitle={"Control de activos y pr\u00e9stamos"}
        backHref="/resources"
        backLabel="Volver a Recursos"
        actions={
          <>
            <button
              type="button"
              onClick={handleExportXlsx}
              disabled={items.length === 0}
              aria-label="Exportar Excel"
              title="Exportar Excel"
              className={`${moduleTopbarButtonStyles.secondary} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span className={moduleTopbarButtonIconStyles.secondary}>
                <span className="material-symbols-outlined text-[16px]">
                  grid_on
                </span>
              </span>
              Exportar Excel
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={items.length === 0}
              aria-label="Exportar PDF"
              title="Exportar PDF"
              className={`${moduleTopbarButtonStyles.secondary} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span className={moduleTopbarButtonIconStyles.secondary}>
                <span className="material-symbols-outlined text-[16px]">
                  picture_as_pdf
                </span>
              </span>
              Exportar PDF
            </button>
            <Link
              href="/resources/inventory/new"
              className={moduleTopbarButtonStyles.primary}
            >
              <span className={moduleTopbarButtonIconStyles.add}>
                <span className="material-symbols-outlined text-[16px]">
                  add
                </span>
              </span>
              Nuevo activo
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Artículos totales"
          value={`${formatNumber(summary.total, formatLocale)} artículos`}
          meta={`${formatNumber(summary.borrowed, formatLocale)} prestados`}
          icon="inventory_2"
          accentClassName="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Disponibles"
          value={`${formatNumber(summary.available, formatLocale)} artículos`}
          meta="Listos para uso"
          icon="task_alt"
          accentClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="En uso"
          value={`${formatNumber(summary.borrowed, formatLocale)} artículos`}
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
        <DataTable
          columns={[
            { key: "item", label: "Activo" },
            { key: "borrower", label: "Responsable" },
            { key: "qty", label: "Prestados", align: "right" },
            { key: "date", label: "Último movimiento" },
            { key: "status", label: "Estado", align: "right" },
            { key: "actions", label: "Acciones", align: "right" },
          ]}
          rows={loanRows}
          emptyLabel="No hay préstamos recientes."
        />
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
