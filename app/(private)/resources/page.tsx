"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import PageHeader from "@/components/shared/PageHeader";
import SectionBlock from "@/components/shared/SectionBlock";
import StatCard from "@/components/shared/StatCard";
import { useDocumentsStore } from "@/modules/documents/documents.store";
import { useInventoryStore } from "@/modules/resources/inventory.store";
import {
  RECENT_LOANS,
  type LoanRecord,
} from "@/modules/resources/resources.mock";

const LOAN_STATUS_LABELS: Record<LoanRecord["status"], string> = {
  active: "En curso",
  overdue: "Vencido",
  returned: "Devuelto",
};

const LOAN_STATUS_STYLES: Record<LoanRecord["status"], string> = {
  active: "bg-blue-50 text-blue-600 ring-1 ring-blue-100",
  overdue: "bg-rose-50 text-rose-600 ring-1 ring-rose-100",
  returned: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES", {
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

  const documentsUploadedThisMonth = documents.filter((doc) =>
    isOnOrAfter(doc.createdAt, startOfMonth)
  ).length;

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Recursos"
        subtitle="Visión global del inventario y la documentación clave"
        actions={
          <>
            <Link
              href="/resources/inventory"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-primary/40 hover:text-primary"
            >
              <span className="material-symbols-outlined text-[18px]">
                inventory_2
              </span>
              Ver inventario
            </Link>
            <Link
              href="/documents"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
            >
              <span className="material-symbols-outlined text-[18px]">
                upload_file
              </span>
              Subir documento
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Inventario total"
          value={`${formatNumber(inventorySummary.total)} artículos`}
          meta={`${formatNumber(inventorySummary.borrowed)} en préstamo`}
          href="/resources/inventory"
          icon="inventory_2"
          accentClassName="bg-amber-50 text-amber-600"
          className="border-slate-200/80 bg-white/90 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur"
        />
        <StatCard
          title="Documentos totales"
          value={`${formatNumber(documents.length)} archivos`}
          meta={`+${formatNumber(documentsUploadedThisMonth)} subidos este mes`}
          href="/resources/documents"
          icon="description"
          accentClassName="bg-blue-50 text-blue-600"
          className="border-slate-200/80 bg-white/90 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.35)] backdrop-blur"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
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
            {formatNumber(inventorySummary.total)} artículos
            <span className="material-symbols-outlined text-[16px] transition group-hover:translate-x-0.5">
              arrow_forward
            </span>
          </span>
        </Link>
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
            Documentos
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-gray-400 transition group-hover:text-primary">
            {formatNumber(documents.length)} archivos
            <span className="material-symbols-outlined text-[16px] transition group-hover:translate-x-0.5">
              arrow_forward
            </span>
          </span>
        </Link>
      </section>

      <SectionBlock
        title="Préstamos recientes"
        subtitle="Seguimiento de equipos en circulación y devoluciones"
        className="border-slate-200/80 bg-white/95 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur"
        actions={
          <Link
            href="/resources/inventory"
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Ver inventario
          </Link>
        }
      >
        <div className="space-y-3">
          {RECENT_LOANS.map((loan) => (
            <div
              key={loan.id}
              className="group flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">
                  {loan.item}
                </p>
                <p className="text-xs text-gray-500">
                  {loan.borrower} · Vence {formatDate(loan.dueDate)}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${LOAN_STATUS_STYLES[loan.status]}`}
              >
                {LOAN_STATUS_LABELS[loan.status]}
              </span>
            </div>
          ))}
        </div>
      </SectionBlock>
    </div>
  );
}
