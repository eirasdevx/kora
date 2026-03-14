"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import {
  DEFAULT_ACCOUNTING_ACCOUNTS,
  getAccountingCatalog,
  normalizeAssociationAccountingSettings,
  type AccountingAccount,
} from "@/core/session/accounting-settings";
import { useLocale } from "@/core/i18n/use-locale";
import { useSessionStore } from "@/core/session/session.store";
import { buildAccountSummaries } from "@/modules/accounting/accounting-reports";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";

type AccountCodeState = Record<string, string>;
type AccountTypeFilter = "all" | "income" | "expense";
type AccountActivityFilter = "all" | "active" | "inactive";
type CodeSortDirection = "asc" | "desc";

const ACCOUNTS_PER_PAGE = 5;

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | undefined, locale: string) {
  if (!value) return "Sin actividad";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function buildCodeState(catalog: AccountingAccount[]) {
  return Object.fromEntries(catalog.map((account) => [account.key, account.code]));
}

function serializeCodes(catalog: AccountingAccount[], codes: AccountCodeState) {
  return JSON.stringify(
    catalog.map((account) => [account.key, (codes[account.key] ?? "").trim()])
  );
}

function normalizeCodeForValidation(value: string) {
  return value.trim().toUpperCase();
}

function getAccountInitials(label: string) {
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AccountingAccountsPage() {
  const { formatLocale } = useLocale();
  const hydrated = useSessionStore((state) => state.hydrated);
  const association = useSessionStore((state) => state.association);
  const setAssociation = useSessionStore((state) => state.setAssociation);
  const { transactions, loadTransactions } = useTransactionsStore();

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const catalog = useMemo(
    () => getAccountingCatalog(association?.accountingSettings),
    [association?.accountingSettings]
  );
  const initialCodes = useMemo(() => buildCodeState(catalog), [catalog]);
  const [codes, setCodes] = useState<AccountCodeState>(initialCodes);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<AccountTypeFilter>("all");
  const [activityFilter, setActivityFilter] =
    useState<AccountActivityFilter>("all");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [codeSortDirection, setCodeSortDirection] =
    useState<CodeSortDirection>("asc");

  useEffect(() => {
    setCodes(initialCodes);
  }, [initialCodes]);

  const duplicateKeys = useMemo(() => {
    const seen = new Map<string, string>();
    const duplicates = new Set<string>();

    catalog.forEach((account) => {
      const normalizedCode = normalizeCodeForValidation(codes[account.key] ?? "");
      if (!normalizedCode) return;

      const firstKey = seen.get(normalizedCode);
      if (firstKey) {
        duplicates.add(firstKey);
        duplicates.add(account.key);
        return;
      }

      seen.set(normalizedCode, account.key);
    });

    return duplicates;
  }, [catalog, codes]);

  const emptyKeys = useMemo(
    () =>
      new Set(
        catalog
          .filter((account) => !(codes[account.key] ?? "").trim())
          .map((account) => account.key)
      ),
    [catalog, codes]
  );

  const previewCatalog = useMemo(
    () =>
      catalog.map((account) => ({
        ...account,
        code: (codes[account.key] ?? "").trim(),
      })),
    [catalog, codes]
  );

  const accountSummaries = useMemo(
    () => buildAccountSummaries(transactions, { accounts: previewCatalog }),
    [previewCatalog, transactions]
  );

  const summaryByKey = useMemo(
    () => new Map(accountSummaries.map((summary) => [summary.account.key, summary])),
    [accountSummaries]
  );

  const filteredCatalog = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return previewCatalog
      .filter((account) => {
        const summary = summaryByKey.get(account.key);
        const searchTarget = [
          account.label,
          account.description,
          account.code,
          account.category,
          account.type === "income" ? "ingreso" : "gasto",
        ]
          .join(" ")
          .toLowerCase();

        if (normalizedQuery && !searchTarget.includes(normalizedQuery)) {
          return false;
        }

        if (typeFilter !== "all" && account.type !== typeFilter) {
          return false;
        }

        if (activityFilter === "active" && (summary?.movementCount ?? 0) === 0) {
          return false;
        }

        if (activityFilter === "inactive" && (summary?.movementCount ?? 0) > 0) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const compare = a.code.localeCompare(b.code, "es", {
          numeric: true,
          sensitivity: "base",
        });
        return codeSortDirection === "asc" ? compare : -compare;
      });
  }, [activityFilter, codeSortDirection, previewCatalog, query, summaryByKey, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCatalog.length / ACCOUNTS_PER_PAGE));
  const currentPageSafe = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const pageAccounts = useMemo(() => {
    const startIndex = (currentPageSafe - 1) * ACCOUNTS_PER_PAGE;
    return filteredCatalog.slice(startIndex, startIndex + ACCOUNTS_PER_PAGE);
  }, [currentPageSafe, filteredCatalog]);

  const visibleRangeStart =
    pageAccounts.length === 0 ? 0 : (currentPageSafe - 1) * ACCOUNTS_PER_PAGE + 1;
  const visibleRangeEnd = Math.min(
    currentPageSafe * ACCOUNTS_PER_PAGE,
    filteredCatalog.length
  );

  const activeFiltersCount =
    Number(typeFilter !== "all") + Number(activityFilter !== "all");
  const editedAccountsCount = catalog.filter(
    (account) =>
      (codes[account.key] ?? "").trim() !==
      DEFAULT_ACCOUNTING_ACCOUNTS.find((item) => item.key === account.key)?.code
  ).length;
  const hasChanges = serializeCodes(catalog, codes) !== serializeCodes(catalog, initialCodes);
  const hasValidationErrors = duplicateKeys.size > 0 || emptyKeys.size > 0;

  if (!hydrated) {
    return <div className="min-h-screen bg-background-light" aria-busy="true" />;
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Elementos contables"
        title="Elementos contables"
        subtitle="Gestiona el catalogo operativo de cuentas y personaliza el codigo de cada elemento."
        backHref="/accounting"
        backLabel="Volver a Contabilidad"
        actions={
          <button
            type="button"
            onClick={() => document.getElementById("accounting-accounts-save")?.click()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow"
          >
            Guardar codigos
          </button>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Elementos
          </p>
          <p className="mt-3 text-3xl font-semibold text-gray-900">{catalog.length}</p>
          <p className="mt-1 text-sm text-gray-500">
            Cuentas base del catalogo contable.
          </p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Codigos editados
          </p>
          <p className="mt-3 text-3xl font-semibold text-gray-900">
            {editedAccountsCount}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Diferencias frente al catalogo por defecto.
          </p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Estado
          </p>
          <p className="mt-3 text-lg font-semibold text-gray-900">
            {hasValidationErrors
              ? "Revisa codigos vacios o duplicados"
              : hasChanges
                ? "Cambios pendientes"
                : lastSavedAt
                  ? "Catalogo guardado"
                  : "Sin cambios"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Los libros y resumenes usaran estos codigos.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Catalogo editable</h2>
              <p className="mt-1 text-sm text-gray-500">
                Vista tabular del catalogo contable con edicion por fila.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCodes(buildCodeState(DEFAULT_ACCOUNTING_ACCOUNTS));
                setEditingKey(null);
              }}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Restaurar catalogo base
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative min-w-[260px] flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">
                <span className="material-symbols-outlined text-[18px]">search</span>
              </span>
              <input
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar elementos contables..."
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-12 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              aria-expanded={showFilters}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-semibold shadow-sm transition ${
                showFilters || activeFiltersCount > 0
                  ? "border-primary/30 bg-primary/5 text-primary"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Mas Filtros
              {activeFiltersCount > 0 ? (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {activeFiltersCount}
                </span>
              ) : null}
            </button>
          </div>

          {showFilters ? (
            <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3 lg:grid-cols-[1fr_1fr_auto]">
              <select
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value as AccountTypeFilter);
                  setCurrentPage(1);
                }}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="all">Tipo: Todos</option>
                <option value="income">Tipo: Ingreso</option>
                <option value="expense">Tipo: Gasto</option>
              </select>
              <select
                value={activityFilter}
                onChange={(event) => {
                  setActivityFilter(event.target.value as AccountActivityFilter);
                  setCurrentPage(1);
                }}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="all">Actividad: Todas</option>
                <option value="active">Actividad: Con movimientos</option>
                <option value="inactive">Actividad: Sin movimientos</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("all");
                  setActivityFilter("all");
                  setCurrentPage(1);
                }}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                Limpiar
              </button>
            </div>
          ) : null}

          {hasValidationErrors ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Cada codigo debe estar informado y ser unico dentro del catalogo.
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-left text-sm">
            <thead className="border-y border-gray-100 bg-gray-50 text-[11px] uppercase tracking-[0.12em] text-gray-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Elemento contable</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold">Saldo total</th>
                <th className="px-6 py-4 font-semibold">Actividad actual</th>
                <th className="px-6 py-4 font-semibold">
                  <button
                    type="button"
                    onClick={() =>
                      setCodeSortDirection((current) =>
                        current === "asc" ? "desc" : "asc"
                      )
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 transition hover:text-gray-600"
                  >
                    Codigo contable
                    <span className="material-symbols-outlined text-[16px]">
                      {codeSortDirection === "asc" ? "north" : "south"}
                    </span>
                  </button>
                </th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {pageAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-500">
                    No se encontraron elementos contables con los filtros actuales.
                  </td>
                </tr>
              ) : (
                pageAccounts.map((account) => {
                  const summary = summaryByKey.get(account.key);
                  const defaultCode =
                    DEFAULT_ACCOUNTING_ACCOUNTS.find((item) => item.key === account.key)?.code ??
                    account.code;
                  const currentCode = (codes[account.key] ?? "").trim();
                  const isDuplicate = duplicateKeys.has(account.key);
                  const isEmpty = emptyKeys.has(account.key);
                  const isEditing = editingKey === account.key;
                  const isActive = (summary?.movementCount ?? 0) > 0;

                  return (
                    <tr key={account.key} className="hover:bg-gray-50/70">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {getAccountInitials(account.label)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{account.label}</p>
                            <p className="text-xs text-gray-500">{account.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isActive ? "Activa" : "Sin uso"}
                        </span>
                        <p className="mt-2 text-xs text-gray-500">
                          {account.type === "income" ? "Ingreso" : "Gasto"} ·{" "}
                          {account.category}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {formatCurrency(summary?.balance ?? 0, formatLocale)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="font-semibold text-gray-900">
                          {summary?.movementCount ?? 0} mov.
                        </div>
                        <div className="text-xs text-gray-500">
                          {summary?.lastEntryDate
                            ? `Ultimo ${formatDate(summary.lastEntryDate, formatLocale)}`
                            : "Ninguna"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="max-w-[220px] space-y-2">
                            <input
                              value={codes[account.key] ?? ""}
                              maxLength={24}
                              autoFocus
                              onChange={(event) =>
                                setCodes((prev) => ({
                                  ...prev,
                                  [account.key]: event.target.value,
                                }))
                              }
                              className={`h-11 w-full rounded-2xl border px-4 text-sm text-gray-700 shadow-sm outline-none focus:ring-2 ${
                                isDuplicate || isEmpty
                                  ? "border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100"
                                  : "border-slate-200 bg-white focus:border-primary focus:ring-primary/10"
                              }`}
                            />
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                                Base {defaultCode}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setCodes((prev) => ({
                                    ...prev,
                                    [account.key]: defaultCode,
                                  }))
                                }
                                className="rounded-full border border-gray-200 px-2.5 py-1 font-semibold text-gray-600 transition hover:bg-gray-50"
                              >
                                Restaurar
                              </button>
                            </div>
                            {isEmpty ? (
                              <p className="text-xs font-semibold text-rose-600">
                                El codigo no puede quedar vacio.
                              </p>
                            ) : null}
                            {isDuplicate ? (
                              <p className="text-xs font-semibold text-rose-600">
                                Este codigo ya esta asignado a otra cuenta.
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold text-gray-900">
                              {currentCode || "Sin codigo"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {currentCode === defaultCode
                                ? `Base ${defaultCode}`
                                : `Base ${defaultCode} · Personalizado`}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingKey((current) =>
                              current === account.key ? null : account.key
                            )
                          }
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50"
                          aria-label={
                            isEditing
                              ? `Cerrar edicion de ${account.label}`
                              : `Editar ${account.label}`
                          }
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {isEditing ? "check" : "edit"}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Mostrando {visibleRangeStart} a {visibleRangeEnd} de {filteredCatalog.length}{" "}
            elementos contables
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPageSafe === 1}
              className={`inline-flex h-9 items-center justify-center rounded-xl border px-3 text-xs font-semibold transition ${
                currentPageSafe === 1
                  ? "cursor-not-allowed border-slate-200 bg-white text-slate-300"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Anterior
            </button>
            <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-primary/10 px-3 text-xs font-semibold text-primary">
              {currentPageSafe}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPageSafe === totalPages}
              className={`inline-flex h-9 items-center justify-center rounded-xl border px-3 text-xs font-semibold transition ${
                currentPageSafe === totalPages
                  ? "cursor-not-allowed border-slate-200 bg-white text-slate-300"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-500">
          {hasValidationErrors
            ? "Corrige los codigos duplicados o vacios antes de guardar"
            : hasChanges
              ? "Hay cambios pendientes de guardar"
              : lastSavedAt
                ? "Cambios guardados"
                : "Sin cambios pendientes"}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setCodes(initialCodes);
              setEditingKey(null);
            }}
            disabled={!hasChanges}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Descartar
          </button>
          <button
            id="accounting-accounts-save"
            type="button"
            onClick={() => {
              if (!association || hasValidationErrors) return;

              const accountingSettings = normalizeAssociationAccountingSettings({
                accounts: previewCatalog,
              });

              setAssociation({
                ...association,
                accountingSettings,
              });
              setLastSavedAt(Date.now());
              setEditingKey(null);
            }}
            disabled={!association || !hasChanges || hasValidationErrors}
            className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar codigos
          </button>
        </div>
      </div>
    </div>
  );
}
