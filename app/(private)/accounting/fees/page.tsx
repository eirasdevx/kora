"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import TransactionsTable from "@/components/accounting/TransactionsTable";
import PageHeader from "@/components/shared/PageHeader";
import SectionBlock from "@/components/shared/SectionBlock";
import SortableHeader from "@/components/shared/SortableHeader";
import { useLocale } from "@/core/i18n/use-locale";
import {
  applySortDirection,
  compareDate,
  compareNumber,
  compareText,
  SortState,
  toggleSort,
} from "@/lib/table-sorting";
import {
  getContactMembershipPlan,
  getMembershipExecutionLabel,
} from "@/core/session/membership-settings";
import { useSessionStore } from "@/core/session/session.store";
import {
  buildMembershipConcept,
  createMembershipTransaction,
  getContactDisplayName,
} from "@/modules/accounting/membership-fees";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { Contact } from "@/modules/contacts/contact.types";

type FeesSortKey = "member" | "plan" | "status" | "debt" | "lastCompleted";

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | undefined, locale: string) {
  if (!value) return "Sin registro";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function isMemberTransaction(
  memberId: string,
  contactId?: string,
  contactIds?: string[]
) {
  return contactId === memberId || contactIds?.includes(memberId);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function AccountingFeesPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { formatLocale } = useLocale();
  const association = useSessionStore((state) => state.association);
  const contacts = useContactsStore((state) => state.contacts);
  const loadContacts = useContactsStore((state) => state.loadContacts);
  const {
    transactions,
    loadTransactions,
    addTransaction,
    updateTransaction,
  } = useTransactionsStore();

  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState<"pending" | "completed">("pending");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [sortState, setSortState] = useState<SortState<FeesSortKey>>({
    key: "member",
    direction: "asc",
  });

  useEffect(() => {
    loadContacts();
    loadTransactions();
  }, [loadContacts, loadTransactions]);

  const members = useMemo(
    () =>
      contacts
        .filter((contact) => contact.types.includes("member"))
        .sort((a, b) =>
          getContactDisplayName(a).localeCompare(getContactDisplayName(b), "es")
        ),
    [contacts]
  );

  const membershipTransactions = useMemo(
    () =>
      transactions.filter((transaction) => transaction.category === "membership"),
    [transactions]
  );

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? null,
    [members, selectedMemberId]
  );
  const selectedMembershipPlan = useMemo(
    () => getContactMembershipPlan(selectedMember, association),
    [association, selectedMember]
  );

  const memberRecords = useMemo(() => {
    return members.map((member) => {
      const plan = getContactMembershipPlan(member, association);
      const memberTransactions = membershipTransactions
        .filter((transaction) =>
          isMemberTransaction(
            member.id,
            transaction.contactId,
            transaction.contactIds
          )
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const pendingTransactions = memberTransactions.filter(
        (transaction) => transaction.status === "pending"
      );
      const completedTransactions = memberTransactions.filter(
        (transaction) => transaction.status === "completed"
      );
      const pendingAmount = pendingTransactions.reduce(
        (total, transaction) => total + transaction.amount,
        0
      );

      return {
        member,
        plan,
        cycle: plan.cycle,
        defaultAmount: plan.amount,
        pendingTransactions,
        pendingAmount,
        pendingCount: pendingTransactions.length,
        completedCount: completedTransactions.length,
        lastCompleted: completedTransactions[0]?.date,
      };
    });
  }, [association, members, membershipTransactions]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return memberRecords;

    return memberRecords.filter((record) => {
      const name = getContactDisplayName(record.member).toLowerCase();
      const email = record.member.email?.toLowerCase() ?? "";
      const planName = record.plan.name.toLowerCase();
      return (
        name.includes(normalizedQuery) ||
        email.includes(normalizedQuery) ||
        planName.includes(normalizedQuery)
      );
    });
  }, [memberRecords, query]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((left, right) => {
      const leftStatus =
        left.pendingCount > 0
          ? `${left.pendingCount} pendiente(s)`
          : left.completedCount > 0
            ? "Al día"
            : "Sin cobros";
      const rightStatus =
        right.pendingCount > 0
          ? `${right.pendingCount} pendiente(s)`
          : right.completedCount > 0
            ? "Al día"
            : "Sin cobros";

      switch (sortState.key) {
        case "plan":
          return applySortDirection(
            compareText(left.plan.name, right.plan.name, formatLocale),
            sortState.direction
          );
        case "status":
          return applySortDirection(
            compareText(leftStatus, rightStatus, formatLocale),
            sortState.direction
          );
        case "debt":
          return applySortDirection(
            compareNumber(left.pendingAmount, right.pendingAmount),
            sortState.direction
          );
        case "lastCompleted":
          return applySortDirection(
            compareDate(left.lastCompleted, right.lastCompleted),
            sortState.direction
          );
        case "member":
        default:
          return applySortDirection(
            compareText(
              getContactDisplayName(left.member),
              getContactDisplayName(right.member),
              formatLocale
            ),
            sortState.direction
          );
      }
    });
  }, [filteredRecords, formatLocale, sortState]);

  const currentMonthRevenue = useMemo(() => {
    const start = startOfMonth(new Date());
    return membershipTransactions
      .filter((transaction) => transaction.status === "completed")
      .filter((transaction) => new Date(transaction.date) >= start)
      .reduce((total, transaction) => total + transaction.amount, 0);
  }, [membershipTransactions]);

  const totalPendingAmount = useMemo(
    () =>
      membershipTransactions
        .filter((transaction) => transaction.status === "pending")
        .reduce((total, transaction) => total + transaction.amount, 0),
    [membershipTransactions]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedMember) return;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;

    await addTransaction(
      createMembershipTransaction({
        contact: selectedMember,
        date,
        amount: numericAmount,
        status,
        paymentMethod,
        concept: buildMembershipConcept(selectedMembershipPlan, date),
        description:
          notes.trim() ||
          `Registrada manualmente desde la gestión de cuotas para ${getContactDisplayName(selectedMember)}.`,
      })
    );

    setStatus("pending");
    setPaymentMethod("");
    setNotes("");
    setDate(today);
  };

  const handleGeneratePendingFee = async (member: Contact) => {
    await addTransaction(
      createMembershipTransaction({
        contact: member,
        date: today,
        status: "pending",
        description: `Generada manualmente desde la gestión de cuotas para ${getContactDisplayName(member)}.`,
      })
    );
  };

  const handleCollectFee = async (record: (typeof memberRecords)[number]) => {
    const pending =
      record.pendingTransactions[record.pendingTransactions.length - 1];

    if (pending) {
      await updateTransaction({
        ...pending,
        date: today,
        status: "completed",
        paymentMethod: pending.paymentMethod ?? "Cobro manual",
        description:
          pending.description ??
          `Cuota regularizada desde la gestión de cuotas para ${getContactDisplayName(record.member)}.`,
      });
      return;
    }

    await addTransaction(
      createMembershipTransaction({
        contact: record.member,
        date: today,
        amount: record.defaultAmount,
        status: "completed",
        paymentMethod: "Cobro manual",
        description: `Cobrada manualmente desde la gestión de cuotas para ${getContactDisplayName(record.member)}.`,
      })
    );
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        eyebrow="Cuotas"
        title="Gestión de cuotas"
        subtitle="Administra la emisión y el cobro de cuotas de socios con impacto directo en la contabilidad."
        backHref="/accounting"
        backLabel="Volver a Contabilidad"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/settings/association"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Configurar planes
            </Link>
            <Link
              href="/accounting"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Ver contabilidad completa
            </Link>
          </div>
        }
      />

      <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-5 py-4 text-sm text-gray-500 shadow-sm">
        Los planes de cuota, sus importes y la periodicidad de cobro se
        configuran en{" "}
        <Link href="/settings/association" className="font-semibold text-primary">
          Ajustes &gt; Perfil de asociación
        </Link>
        .
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Socios con cuotas
          </p>
          <p className="mt-3 text-3xl font-semibold text-gray-900">
            {members.length}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Base activa para generar cobros.
          </p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Cuotas pendientes
          </p>
          <p className="mt-3 text-3xl font-semibold text-gray-900">
            {
              membershipTransactions.filter(
                (transaction) => transaction.status === "pending"
              ).length
            }
          </p>
          <p className="mt-1 text-sm text-amber-600">
            {formatCurrency(totalPendingAmount, formatLocale)} por cobrar.
          </p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Cobrado este mes
          </p>
          <p className="mt-3 text-3xl font-semibold text-emerald-600">
            {formatCurrency(currentMonthRevenue, formatLocale)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Solo cuotas completadas.
          </p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Integración contable
          </p>
          <p className="mt-3 text-lg font-semibold text-gray-900">
            Sincronización directa
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Cada alta o cobro se registra en transacciones.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <SectionBlock
          title="Registrar cuota"
          subtitle="Crea un cargo o cobro puntual para un socio concreto."
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Socio
              </label>
              <select
                value={selectedMemberId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setSelectedMemberId(nextId);

                  const nextMember = members.find((member) => member.id === nextId);
                  if (!nextMember) {
                    setAmount("");
                    return;
                  }

                  const plan = getContactMembershipPlan(nextMember, association);
                  setAmount(String(plan.amount));
                }}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              >
                <option value="">Selecciona un socio</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {getContactDisplayName(member)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Fecha
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Estado
                </label>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as "pending" | "completed")
                  }
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                >
                  <option value="pending">Pendiente</option>
                  <option value="completed">Completada</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Importe
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Método de pago
                </label>
                <input
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  placeholder="Transferencia, efectivo, tarjeta..."
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Notas
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                placeholder="Observaciones internas sobre la cuota."
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
              {selectedMember ? (
                <>
                  Plan asignado:{" "}
                  <strong className="text-gray-900">
                    {selectedMembershipPlan.name}
                  </strong>
                  {" · "}
                  Importe sugerido:{" "}
                  <strong className="text-gray-900">
                    {formatCurrency(selectedMembershipPlan.amount, formatLocale)}
                  </strong>
                  {" · "}
                  {getMembershipExecutionLabel(selectedMembershipPlan)}
                </>
              ) : (
                "Selecciona un socio para cargar su plan e importe recomendado."
              )}
            </div>

            <button
              type="submit"
              disabled={!selectedMemberId || Number(amount) <= 0}
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Guardar cuota
            </button>
          </form>
        </SectionBlock>

        <SectionBlock
          title="Operativa por socio"
          subtitle="Genera cuotas pendientes o regulariza cobros desde una sola vista."
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar socio por nombre, email o plan..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <div className="flex items-center gap-3">
              <select
                value={`${sortState.key}:${sortState.direction}`}
                onChange={(event) => {
                  const [key, direction] = event.target.value.split(":") as [
                    FeesSortKey,
                    "asc" | "desc",
                  ];
                  setSortState({ key, direction });
                }}
                className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                aria-label="Ordenar operativa por socio"
              >
                <option value="member:asc">Socio A-Z</option>
                <option value="member:desc">Socio Z-A</option>
                <option value="plan:asc">Plan A-Z</option>
                <option value="status:asc">Estado A-Z</option>
                <option value="debt:desc">Mayor deuda</option>
                <option value="debt:asc">Menor deuda</option>
                <option value="lastCompleted:desc">Último cobro reciente</option>
                <option value="lastCompleted:asc">Último cobro antiguo</option>
              </select>
              <p className="text-sm text-gray-500">
                {sortedRecords.length} socios visibles
              </p>
            </div>
          </div>

          {members.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
              No hay socios dados de alta todavía.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-y border-gray-100 bg-gray-50 text-[11px] uppercase tracking-[0.12em] text-gray-400">
                  <tr>
                    <SortableHeader
                      label="Socio"
                      active={sortState.key === "member"}
                      direction={sortState.direction}
                      onClick={() =>
                        setSortState((current) => toggleSort(current, "member"))
                      }
                      className="px-5 py-4 font-semibold"
                    />
                    <SortableHeader
                      label="Plan"
                      active={sortState.key === "plan"}
                      direction={sortState.direction}
                      onClick={() =>
                        setSortState((current) => toggleSort(current, "plan"))
                      }
                      className="px-5 py-4 font-semibold"
                    />
                    <SortableHeader
                      label="Estado"
                      active={sortState.key === "status"}
                      direction={sortState.direction}
                      onClick={() =>
                        setSortState((current) => toggleSort(current, "status"))
                      }
                      className="px-5 py-4 font-semibold"
                    />
                    <SortableHeader
                      label="Deuda"
                      active={sortState.key === "debt"}
                      direction={sortState.direction}
                      onClick={() =>
                        setSortState((current) =>
                          toggleSort(current, "debt", "desc")
                        )
                      }
                      className="px-5 py-4 font-semibold text-right"
                      align="right"
                    />
                    <th className="px-5 py-4 font-semibold">Último cobro</th>
                    <th className="px-5 py-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {sortedRecords.map((record) => {
                    const displayName = getContactDisplayName(record.member);
                    const statusTone =
                      record.pendingCount > 0
                        ? "bg-amber-50 text-amber-700"
                        : record.completedCount > 0
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600";

                    return (
                      <tr key={record.member.id} className="hover:bg-gray-50/70">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">
                            {displayName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {record.member.email || "Sin correo"}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">
                            {record.plan.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(record.plan.amount, formatLocale)} ·{" "}
                            {record.cycle}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}
                          >
                            {record.pendingCount > 0
                              ? `${record.pendingCount} pendiente(s)`
                              : record.completedCount > 0
                                ? "Al día"
                                : "Sin cobros"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-gray-900">
                          {formatCurrency(record.pendingAmount, formatLocale)}
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {formatDate(record.lastCompleted, formatLocale)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleGeneratePendingFee(record.member)}
                              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                            >
                              Generar cuota
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCollectFee(record)}
                              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              {record.pendingCount > 0
                                ? "Cobrar pendiente"
                                : "Registrar cobro"}
                            </button>
                            <Link
                              href={`/people/members/${record.member.id}`}
                              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                            >
                              Ver socio
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionBlock>
      </section>

      <SectionBlock
        title="Movimientos de cuotas"
        subtitle="Todas las cuotas registradas se reflejan aquí al momento."
      >
        <TransactionsTable transactions={membershipTransactions} />
      </SectionBlock>
    </div>
  );
}
