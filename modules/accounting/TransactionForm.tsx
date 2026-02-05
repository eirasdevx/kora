"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Transaction,
  TransactionCategory,
  TransactionCategoryLabels,
  TransactionType,
} from "@/modules/accounting/transaction.types";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useEventsStore } from "@/modules/events/events.store";

interface Props {
  initialData?: Transaction;
  onSubmit: (tx: Transaction) => void | Promise<void>;
  onCancel: () => void;
}

const BASE_CATEGORIES: TransactionCategory[] = [
  "membership",
  "events",
  "installations",
  "other",
];

const PAYMENT_METHODS = [
  "Transferencia bancaria",
  "Tarjeta",
  "Efectivo",
  "Bizum",
  "Otro",
];

export default function TransactionForm({
  initialData,
  onSubmit,
  onCancel,
}: Props) {
  const isEditing = Boolean(initialData);
  const contacts = useContactsStore((s) => s.contacts);
  const loadContacts = useContactsStore((s) => s.loadContacts);
  const events = useEventsStore((s) => s.events);
  const loadEvents = useEventsStore((s) => s.loadEvents);

  const [type, setType] = useState<TransactionType>(
    initialData?.type ?? "income"
  );
  const [concept, setConcept] = useState(initialData?.concept ?? "");
  const [amount, setAmount] = useState(
    initialData ? String(initialData.amount) : ""
  );
  const [category, setCategory] = useState<TransactionCategory>(
    initialData?.category ?? "membership"
  );
  const [date, setDate] = useState(
    initialData?.date ?? new Date().toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<"completed" | "pending">(
    initialData?.status ?? "completed"
  );
  const [contactId, setContactId] = useState(initialData?.contactId ?? "");
  const [eventId, setEventId] = useState(initialData?.eventId ?? "");
  const [paymentMethod, setPaymentMethod] = useState(
    initialData?.paymentMethod ?? ""
  );
  const [notes, setNotes] = useState(initialData?.description ?? "");

  useEffect(() => {
    loadContacts();
    loadEvents();
  }, [loadContacts, loadEvents]);

  const numericAmount = Number(amount) || 0;

  const categoryOptions = useMemo<TransactionCategory[]>(() => {
    if (initialData?.category === "subsidies") {
      return [...BASE_CATEGORIES, "subsidies"];
    }
    return BASE_CATEGORIES;
  }, [initialData?.category]);

  const impactLabel = useMemo(() => {
    if (!numericAmount) return "+0.00%";
    const impact = (numericAmount / 1000) * 100;
    const sign = type === "expense" ? "-" : "+";
    return `${sign}${Math.abs(impact).toFixed(2)}%`;
  }, [numericAmount, type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim() || numericAmount <= 0) return;

    const tx: Transaction = {
      id: initialData?.id ?? crypto.randomUUID(),
      type,
      concept: concept.trim(),
      amount: numericAmount,
      category,
      date,
      status,
      contactId: contactId || undefined,
      eventId: eventId || undefined,
      paymentMethod: paymentMethod || undefined,
      description: notes.trim() || undefined,
      createdAt: initialData?.createdAt ?? new Date().toISOString(),
    };

    onSubmit(tx);
  };

  return (
    <form onSubmit={handleSubmit} className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300"
              aria-label="Volver"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                Kora · Gestión financiera
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">
                {isEditing ? "Editar transacción" : "Nueva transacción"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 hover:bg-blue-700"
            >
              {isEditing ? "Guardar cambios" : "Guardar transacción"}
            </button>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                Dirección del flujo
              </p>
              <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-100 p-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setType("income")}
                  className={`flex flex-1 items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    type === "income"
                      ? "bg-emerald-500 text-white shadow"
                      : "bg-transparent text-slate-600"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      type === "income"
                        ? "bg-white/20 text-white"
                        : "bg-white text-emerald-500"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 4v12" />
                      <path d="M8 12l4 4 4-4" />
                    </svg>
                  </span>
                  Ingreso
                </button>
                <button
                  type="button"
                  onClick={() => setType("expense")}
                  className={`flex flex-1 items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    type === "expense"
                      ? "bg-slate-200 text-slate-900 shadow"
                      : "bg-transparent text-slate-600"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      type === "expense"
                        ? "bg-white/70 text-slate-700"
                        : "bg-white text-slate-400"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20V8" />
                      <path d="M8 12l4-4 4 4" />
                    </svg>
                  </span>
                  Gasto
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Título de la transacción
                  </label>
                  <input
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    placeholder="Ej: Pago cuota trimestral - Socio #24"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Fecha de operación
                    </label>
                    <div className="relative mt-2">
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                        required
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="4" width="18" height="17" rx="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Estado
                    </label>
                    <div className="relative mt-2">
                      <select
                        value={status}
                        onChange={(e) =>
                          setStatus(e.target.value as "completed" | "pending")
                        }
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="completed">Completado</option>
                        <option value="pending">Pendiente</option>
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">
                      Monto Total
                    </label>
                    <div className="relative mt-2">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        ?
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-9 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-xs font-semibold text-emerald-700">
                      <p className="text-[11px] uppercase tracking-[0.2em]">Impacto balance</p>
                      <p className="mt-1 text-sm font-semibold">{impactLabel}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Método de pago
                  </label>
                  <div className="relative mt-2">
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">Selecciona un método</option>
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Categoría
                  </label>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {categoryOptions.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-xs font-semibold uppercase tracking-wide transition ${
                          category === cat
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 7h16" />
                            <path d="M4 12h16" />
                            <path d="M4 17h16" />
                          </svg>
                        </span>
                        {TransactionCategoryLabels[cat]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 13a5 5 0 0 0 7.7 4.2l2.1-2.1" />
                    <path d="M14 11a5 5 0 0 0-7.7-4.2L4.2 8.9" />
                    <path d="M8 16l-2 2" />
                    <path d="M16 8l2-2" />
                  </svg>
                </span>
                Vinculación
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Contacto asociado
                  </label>
                  <div className="relative mt-2">
                    <select
                      value={contactId}
                      onChange={(e) => setContactId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">— Sin contacto —</option>
                      {contacts.map((c) => {
                        const displayName =
                          `${c.firstName} ${c.lastName}`.trim() ||
                          c.fullName ||
                          "Sin nombre";
                        return (
                          <option key={c.id} value={c.id}>
                            {displayName}
                          </option>
                        );
                      })}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Evento relacionado
                  </label>
                  <div className="relative mt-2">
                    <select
                      value={eventId}
                      onChange={(e) => setEventId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">Ningún evento seleccionado</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </span>
                Documentación
              </div>
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 transition hover:border-blue-300">
                <input
                  type="file"
                  className="sr-only"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 16V4" />
                    <path d="M8 8l4-4 4 4" />
                    <path d="M4 16v4h16v-4" />
                  </svg>
                </span>
                <span className="mt-3 font-semibold text-slate-700">
                  Arrastra comprobantes
                </span>
                <span className="text-xs text-slate-400">
                  Soporta PDF, JPG y PNG hasta 10MB
                </span>
              </label>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 6h16" />
                    <path d="M4 12h16" />
                    <path d="M4 18h10" />
                  </svg>
                </span>
                Notas Adicionales
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Añade detalles relevantes sobre esta transacción..."
                className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
              />
            </section>
          </div>
        </div>
      </div>
    </form>
  );
}
