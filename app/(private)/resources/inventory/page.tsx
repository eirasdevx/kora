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
import Modal from "@/components/Modal";
import {
  tableBodyStyles,
  tableEmptyCellStyles,
  tableFooterStyles,
  tableHeadCellStyles,
  tableHeadStyles,
  tableMinWidthStyles,
  tableRowStyles,
  tableTextActionStyles,
  tableWrapperStyles,
} from "@/components/shared/tableStyles";
import { useLocale } from "@/core/i18n/use-locale";
import {
  applySortDirection,
  compareDate,
  compareNumber,
  compareText,
  SortState,
} from "@/lib/table-sorting";
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

type InventorySortKey = "name" | "category" | "quantity" | "borrowed" | "available";
type RecentLoansSortKey = "item" | "borrower" | "borrowed" | "lastMove" | "status";

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
  const [inventorySortState, setInventorySortState] =
    useState<SortState<InventorySortKey>>({
      key: "name",
      direction: "asc",
    });
  const [recentLoansSortState, setRecentLoansSortState] =
    useState<SortState<RecentLoansSortKey>>({
      key: "lastMove",
      direction: "desc",
    });

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const summary = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.quantity, 0);
    const borrowed = items.reduce((sum, item) => sum + item.borrowed, 0);
    return { total, borrowed, available: total - borrowed };
  }, [items]);

  const exportRowsXlsx = useMemo(() => {
    const orderedItems = [...items].sort((left, right) => {
      const leftAvailable = Math.max(0, left.quantity - left.borrowed);
      const rightAvailable = Math.max(0, right.quantity - right.borrowed);

      switch (inventorySortState.key) {
        case "category":
          return applySortDirection(
            compareText(left.category, right.category, formatLocale),
            inventorySortState.direction
          );
        case "quantity":
          return applySortDirection(
            compareNumber(left.quantity, right.quantity),
            inventorySortState.direction
          );
        case "borrowed":
          return applySortDirection(
            compareNumber(left.borrowed, right.borrowed),
            inventorySortState.direction
          );
        case "available":
          return applySortDirection(
            compareNumber(leftAvailable, rightAvailable),
            inventorySortState.direction
          );
        case "name":
        default:
          return applySortDirection(
            compareText(left.name, right.name, formatLocale),
            inventorySortState.direction
          );
      }
    });

    return orderedItems.map((item) => {
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
  }, [formatLocale, inventorySortState, items]);

  const exportRowsPdf = useMemo(() => {
    const orderedItems = [...items].sort((left, right) => {
      const leftAvailable = Math.max(0, left.quantity - left.borrowed);
      const rightAvailable = Math.max(0, right.quantity - right.borrowed);

      switch (inventorySortState.key) {
        case "category":
          return applySortDirection(
            compareText(left.category, right.category, formatLocale),
            inventorySortState.direction
          );
        case "quantity":
          return applySortDirection(
            compareNumber(left.quantity, right.quantity),
            inventorySortState.direction
          );
        case "borrowed":
          return applySortDirection(
            compareNumber(left.borrowed, right.borrowed),
            inventorySortState.direction
          );
        case "available":
          return applySortDirection(
            compareNumber(leftAvailable, rightAvailable),
            inventorySortState.direction
          );
        case "name":
        default:
          return applySortDirection(
            compareText(left.name, right.name, formatLocale),
            inventorySortState.direction
          );
      }
    });

    return orderedItems.map((item) => {
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
  }, [formatLocale, inventorySortState, items]);

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

  const sortedItems = useMemo(() => {
    return [...items].sort((left, right) => {
      const leftAvailable = Math.max(0, left.quantity - left.borrowed);
      const rightAvailable = Math.max(0, right.quantity - right.borrowed);

      switch (inventorySortState.key) {
        case "category":
          return applySortDirection(
            compareText(left.category, right.category, formatLocale),
            inventorySortState.direction
          );
        case "quantity":
          return applySortDirection(
            compareNumber(left.quantity, right.quantity),
            inventorySortState.direction
          );
        case "borrowed":
          return applySortDirection(
            compareNumber(left.borrowed, right.borrowed),
            inventorySortState.direction
          );
        case "available":
          return applySortDirection(
            compareNumber(leftAvailable, rightAvailable),
            inventorySortState.direction
          );
        case "name":
        default:
          return applySortDirection(
            compareText(left.name, right.name, formatLocale),
            inventorySortState.direction
          );
      }
    });
  }, [formatLocale, inventorySortState, items]);

  const sortedRecentLoans = useMemo(() => {
    return [...recentLoans].sort((left, right) => {
      const leftStatus =
        left.item.status ?? (left.item.borrowed > 0 ? "in_use" : "available");
      const rightStatus =
        right.item.status ??
        (right.item.borrowed > 0 ? "in_use" : "available");

      switch (recentLoansSortState.key) {
        case "borrower":
          return applySortDirection(
            compareText(left.borrower, right.borrower, formatLocale),
            recentLoansSortState.direction
          );
        case "borrowed":
          return applySortDirection(
            compareNumber(left.item.borrowed, right.item.borrowed),
            recentLoansSortState.direction
          );
        case "status":
          return applySortDirection(
            compareText(
              ITEM_STATUS_LABELS[leftStatus],
              ITEM_STATUS_LABELS[rightStatus],
              formatLocale
            ),
            recentLoansSortState.direction
          );
        case "lastMove":
          return applySortDirection(
            compareDate(left.lastMove, right.lastMove),
            recentLoansSortState.direction
          );
        case "item":
        default:
          return applySortDirection(
            compareText(left.item.name, right.item.name, formatLocale),
            recentLoansSortState.direction
          );
      }
    });
  }, [formatLocale, recentLoans, recentLoansSortState]);

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

      <SectionBlock
        title="Inventario"
        subtitle="Detalle de activos disponibles"
        actions={
          <>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
              {formatNumber(items.length, formatLocale)} activos
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
              {formatNumber(summary.borrowed, formatLocale)} prestados
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
              {formatNumber(summary.available, formatLocale)} disponibles
            </span>
          </>
        }
      >
        <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white">
          <div className="flex justify-end px-5 pt-5">
            <select
              value={`${inventorySortState.key}:${inventorySortState.direction}`}
              onChange={(event) => {
                const [key, direction] = event.target.value.split(":") as [
                  InventorySortKey,
                  "asc" | "desc",
                ];
                setInventorySortState({ key, direction });
              }}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              aria-label="Ordenar inventario"
            >
              <option value="name:asc">Nombre A-Z</option>
              <option value="name:desc">Nombre Z-A</option>
              <option value="category:asc">Categoría A-Z</option>
              <option value="quantity:desc">Más cantidad</option>
              <option value="borrowed:desc">Más prestados</option>
              <option value="available:desc">Más disponibles</option>
            </select>
          </div>
          {items.length === 0 ? (
            <div className="m-5 flex flex-col gap-4 rounded-3xl border border-dashed border-gray-200 bg-gradient-to-r from-gray-50 to-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <span className="material-symbols-outlined text-[22px]">
                    inventory_2
                  </span>
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {"Todav\u00eda no hay activos registrados"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {
                      "Registra el primer recurso para empezar a controlar cantidades, pr\u00e9stamos y disponibilidad."
                    }
                  </p>
                </div>
              </div>
              <Link
                href="/resources/inventory/new"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-primary/90"
              >
                Registrar primer activo
              </Link>
            </div>
          ) : null}

          <div className={tableWrapperStyles}>
            <table className={tableMinWidthStyles}>
              <thead className={tableHeadStyles}>
                <tr>
                  <th className={tableHeadCellStyles}>{"Art\u00edculo"}</th>
                  <th className={tableHeadCellStyles}>{"Categor\u00eda"}</th>
                  <th className={`${tableHeadCellStyles} text-right`}>
                    Cantidad
                  </th>
                  <th className={`${tableHeadCellStyles} text-right`}>
                    Prestados
                  </th>
                  <th className={`${tableHeadCellStyles} text-right`}>
                    Disponibles
                  </th>
                  <th className={`${tableHeadCellStyles} text-right`}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className={tableBodyStyles}>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={tableEmptyCellStyles}>
                      <div className="flex flex-col items-center gap-3 py-10">
                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                          <span className="material-symbols-outlined text-[24px]">
                            inventory
                          </span>
                        </span>
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-700">
                            {"A\u00fan no hay art\u00edculos en inventario"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {
                              "Los nuevos activos aparecer\u00e1n aqu\u00ed autom\u00e1ticamente."
                            }
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedItems.map((item) => {
                    const available = Math.max(0, item.quantity - item.borrowed);

                    return (
                      <tr key={item.id} className={tableRowStyles}>
                        <td className="px-6 py-5">
                          <div className="flex items-start gap-3">
                            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                              <span className="material-symbols-outlined text-[20px]">
                                inventory_2
                              </span>
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900">
                                {item.name}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                                <span>
                                  {item.serial
                                    ? `Serie ${item.serial}`
                                    : "Sin serie"}
                                </span>
                                <span>
                                  {item.location ?? "Sin ubicación"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="inline-flex min-w-[3rem] justify-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            {formatNumber(item.quantity, formatLocale)}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="inline-flex min-w-[3rem] justify-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                            {formatNumber(item.borrowed, formatLocale)}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="inline-flex min-w-[3rem] justify-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                            {formatNumber(available, formatLocale)}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/resources/inventory/${item.id}/edit`}
                              className={tableTextActionStyles}
                            >
                              Editar
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={tableFooterStyles}>
            <p>
              {items.length === 0
                ? "Listo para registrar el primer activo."
                : `Mostrando 1 a ${sortedItems.length} de ${sortedItems.length} activos`}
            </p>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock
        title="Préstamos recientes"
        subtitle="Movimientos recientes de inventario"
        actions={
          <>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
              {formatNumber(sortedRecentLoans.length, formatLocale)} movimientos
            </span>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
              {formatNumber(summary.borrowed, formatLocale)} unidades activas
            </span>
            <Link
              href="/resources"
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Ver resumen
            </Link>
          </>
        }
      >
        <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white">
          <div className="flex justify-end px-5 pt-5">
            <select
              value={`${recentLoansSortState.key}:${recentLoansSortState.direction}`}
              onChange={(event) => {
                const [key, direction] = event.target.value.split(":") as [
                  RecentLoansSortKey,
                  "asc" | "desc",
                ];
                setRecentLoansSortState({ key, direction });
              }}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              aria-label="Ordenar préstamos"
            >
              <option value="lastMove:desc">Más recientes</option>
              <option value="lastMove:asc">Más antiguos</option>
              <option value="item:asc">Activo A-Z</option>
              <option value="borrower:asc">Responsable A-Z</option>
              <option value="borrowed:desc">Más prestados</option>
              <option value="status:asc">Estado A-Z</option>
            </select>
          </div>
          <div className={tableWrapperStyles}>
            <table className={tableMinWidthStyles}>
              <thead className={tableHeadStyles}>
                <tr>
                  <th className={tableHeadCellStyles}>Activo</th>
                  <th className={tableHeadCellStyles}>Responsable</th>
                  <th className={`${tableHeadCellStyles} text-right`}>
                    Prestados
                  </th>
                  <th className={tableHeadCellStyles}>
                    {"\u00daltimo movimiento"}
                  </th>
                  <th className={`${tableHeadCellStyles} text-right`}>
                    Estado
                  </th>
                  <th className={`${tableHeadCellStyles} text-right`}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className={tableBodyStyles}>
                {sortedRecentLoans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={tableEmptyCellStyles}>
                      <div className="flex flex-col items-center gap-3 py-10">
                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                          <span className="material-symbols-outlined text-[24px]">
                            handshake
                          </span>
                        </span>
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-700">
                            {"No hay pr\u00e9stamos recientes"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {
                              "Cuando un activo se preste o cambie de estado aparecer\u00e1 aqu\u00ed."
                            }
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedRecentLoans.map(({ item, lastMove, borrower }) => {
                    const status =
                      item.status ??
                      (item.borrowed > 0 ? "in_use" : "available");

                    return (
                      <tr key={`loan-${item.id}`} className={tableRowStyles}>
                        <td className="px-6 py-5">
                          <div className="flex items-start gap-3">
                            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                              <span className="material-symbols-outlined text-[20px]">
                                package_2
                              </span>
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900">
                                {item.name}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                                <span>{item.category}</span>
                                <span>
                                  {item.serial
                                    ? `Serie ${item.serial}`
                                    : "Sin serie"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-1">
                            <p className="font-medium text-gray-700">
                              {borrower}
                            </p>
                              <p className="text-xs text-gray-500">
                                {item.assignee
                                  ? "Asignación activa"
                                  : item.location
                                    ? "Referencia por ubicación"
                                    : "Sin responsable definido"}
                              </p>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="inline-flex min-w-[3rem] justify-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                            {formatNumber(item.borrowed, formatLocale)}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm text-gray-600">
                          {formatDate(lastMove, formatLocale)}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${ITEM_STATUS_STYLES[status]}`}
                          >
                            {ITEM_STATUS_LABELS[status]}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end">
                            <Link
                              href={`/resources/inventory/${item.id}/edit`}
                              className={tableTextActionStyles}
                            >
                              Ver activo
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={tableFooterStyles}>
            <p>
              {sortedRecentLoans.length === 0
                ? "Sin movimientos recientes por ahora."
                : `Mostrando 1 a ${sortedRecentLoans.length} de ${sortedRecentLoans.length} movimientos`}
            </p>
          </div>
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
