"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import ModuleTopbar from "@/components/shared/ModuleTopbar";
import StatCard from "@/components/shared/StatCard";
import { useLocale } from "@/core/i18n/use-locale";
import { useDocumentsStore } from "@/modules/documents/documents.store";
import { useInventoryStore } from "@/modules/resources/inventory.store";
import { InventoryItem, InventoryStatus } from "@/modules/resources/inventory.types";

const ITEM_STATUS_LABELS: Record<InventoryStatus, string> = {
  available: "Disponible",
  in_use: "En uso",
  maintenance: "Mantenimiento",
  retired: "Retirado",
};

const ITEM_STATUS_STYLES: Record<InventoryStatus, string> = {
  available: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
  in_use: "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
  maintenance: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  retired: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
};

const RESOURCES_MODULE_TITLE = "Recursos";
const RESOURCES_PAGE_TITLE = "Centro de recursos";
const RESOURCES_MODULE_DESCRIPTION =
  "Inventario, préstamos y generación documental.";

function resolveItemStatus(item: InventoryItem): InventoryStatus {
  if (item.status) return item.status;
  return item.borrowed > 0 ? "in_use" : "available";
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

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
}

function isOnOrAfter(dateValue: string | undefined, start: Date) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start;
}

export default function ResourcesPage() {
  const { formatLocale } = useLocale();
  const { documents, loadDocuments } = useDocumentsStore();
  const { items, loadItems } = useInventoryStore();

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const now = useMemo(() => new Date(), []);
  const startOfMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
    [now]
  );

  const inventorySummary = useMemo(() => {
    const total = items.reduce((sum, item) => sum + item.quantity, 0);
    const borrowed = items.reduce((sum, item) => sum + item.borrowed, 0);
    return { total, borrowed };
  }, [items]);

  const documentsCreatedThisMonth = documents.filter((doc) =>
    isOnOrAfter(doc.createdAt, startOfMonth)
  ).length;

  const recentLoans = useMemo(() => {
    const toTime = (value?: string) => {
      if (!value) return 0;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };

    return [...items]
      .filter((item) => item.borrowed > 0)
      .map((item) => ({
        id: item.id,
        name: item.name,
        borrower:
          item.assignee?.trim() ||
          item.location?.trim() ||
          "Sin asignar",
        borrowed: item.borrowed,
        date: item.updatedAt ?? item.createdAt,
        status: resolveItemStatus(item),
      }))
      .sort((a, b) => toTime(b.date) - toTime(a.date))
      .slice(0, 4);
  }, [items]);

  const recentDocuments = useMemo(() => {
    const toTime = (value?: string) => {
      if (!value) return 0;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };

    return [...documents]
      .sort((a, b) =>
        toTime(b.updatedAt ?? b.createdAt) -
        toTime(a.updatedAt ?? a.createdAt)
      )
      .slice(0, 3);
  }, [documents]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <ModuleTopbar
        module={RESOURCES_MODULE_TITLE}
        title={RESOURCES_PAGE_TITLE}
        description={RESOURCES_MODULE_DESCRIPTION}
      />

      <section className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Inventario total"
          value={`${formatNumber(inventorySummary.total, formatLocale)} artículos`}
          meta={`${formatNumber(inventorySummary.borrowed, formatLocale)} en préstamo`}
          href="/resources/inventory"
          icon="inventory_2"
          accentClassName="bg-amber-50 text-amber-600"
          className="border-slate-200/80 bg-white/90 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur"
        />
        <StatCard
          title="Documentos generados"
          value={`${formatNumber(documents.length, formatLocale)} documentos`}
          meta={`+${formatNumber(documentsCreatedThisMonth, formatLocale)} creados este mes`}
          href="/resources/documents"
          icon="description"
          accentClassName="bg-blue-50 text-blue-600"
          className="border-slate-200/80 bg-white/90 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Link
            href="/resources/inventory"
            className="group flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white/90 px-6 py-5 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <span className="material-symbols-outlined text-[20px]">
                  inventory_2
                </span>
              </span>
              Inventario
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-gray-400 transition group-hover:text-primary">
              {formatNumber(inventorySummary.total, formatLocale)} artículos
              <span className="material-symbols-outlined text-[16px] transition group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </span>
          </Link>

          <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Préstamos recientes
              </p>
              <span className="text-xs font-semibold text-gray-400">
                {formatNumber(recentLoans.length, formatLocale)}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {recentLoans.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No hay préstamos recientes.
                </p>
              ) : (
                recentLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {loan.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {loan.borrower} ·{" "}
                        {formatNumber(loan.borrowed, formatLocale)} prestados ·{" "}
                        {formatDate(loan.date, formatLocale)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${ITEM_STATUS_STYLES[loan.status]}`}
                    >
                      {ITEM_STATUS_LABELS[loan.status]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <Link
            href="/resources/documents"
            className="group flex items-center justify-between rounded-3xl border border-slate-200/70 bg-white/90 px-6 py-5 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <span className="material-symbols-outlined text-[20px]">
                  description
                </span>
              </span>
              Generador documental
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-gray-400 transition group-hover:text-primary">
              {formatNumber(documents.length, formatLocale)} documentos
              <span className="material-symbols-outlined text-[16px] transition group-hover:translate-x-0.5">
                arrow_forward
              </span>
            </span>
          </Link>

          <div className="rounded-3xl border border-slate-200/70 bg-white/90 px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Generados recientemente
              </p>
              <span className="text-xs font-semibold text-gray-400">
                {formatNumber(recentDocuments.length, formatLocale)}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {recentDocuments.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Genera permisos, estatutos, inscripciones o solicitudes de salida.
                </p>
              ) : (
                recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {doc.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Documento generado ·{" "}
                        {formatDate(
                          doc.updatedAt ?? doc.createdAt,
                          formatLocale
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                      {doc.security}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
