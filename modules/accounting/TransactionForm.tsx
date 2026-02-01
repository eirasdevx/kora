"use client";

import { useEffect, useState } from "react";
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

const CATEGORY_ORDER: TransactionCategory[] = [
  "membership",
  "events",
  "installations",
  "subsidies",
  "other",
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
  const [concept, setConcept] = useState(
    initialData?.concept ?? ""
  );
  const [amount, setAmount] = useState(
    initialData ? String(initialData.amount) : ""
  );
  const [category, setCategory] =
    useState<TransactionCategory>(
      initialData?.category ?? "other"
    );
  const [date, setDate] = useState(
    initialData?.date ??
      new Date().toISOString().slice(0, 10)
  );
  const [status, setStatus] =
    useState<"completed" | "pending">(
      initialData?.status ?? "completed"
    );
  const [contactId, setContactId] = useState(
    initialData?.contactId ?? ""
  );
  const [eventId, setEventId] = useState(
    initialData?.eventId ?? ""
  );

  useEffect(() => {
    loadContacts();
    loadEvents();
  }, [loadContacts, loadEvents]);

  const numericAmount = Number(amount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim() || numericAmount <= 0) return;

    const tx: Transaction = {
      id: initialData?.id ?? crypto.randomUUID(),
      type,
      concept,
      amount: numericAmount,
      category,
      date,
      status,
      contactId: contactId || undefined,
      eventId: eventId || undefined,
      createdAt:
        initialData?.createdAt ?? new Date().toISOString(),
    };

    onSubmit(tx);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-4xl mx-auto overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50 px-6 py-5">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {isEditing ? "Editar transacción" : "Nueva transacción"}
          </h2>
          <p className="text-sm text-gray-500">
            {isEditing
              ? "Actualiza los datos del movimiento financiero."
              : "Registra un nuevo movimiento financiero para la asociación."}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100"
          aria-label="Cerrar"
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
            <path d="M6 6l12 12M18 6l-12 12" />
          </svg>
        </button>
      </div>

      {/* Tipo */}
      <div className="border-b border-gray-100 px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
          Tipo de transacción
        </p>

        <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-gray-100 p-1.5 sm:flex-row">
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex flex-1 items-center justify-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition
              ${
                type === "income"
                  ? "bg-emerald-500 text-white shadow"
                  : "bg-transparent text-gray-600"
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
                className="h-3.5 w-3.5"
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
            className={`flex flex-1 items-center justify-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition
              ${
                type === "expense"
                  ? "bg-red-500 text-white shadow"
                  : "bg-transparent text-gray-600"
              }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full ${
                type === "expense"
                  ? "bg-white/20 text-white"
                  : "bg-white text-red-500"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
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
      </div>

      {/* Contenido */}
      <div className="space-y-3 px-6 py-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Título de la transacción
            </label>
            <input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej: Cuota de socio Enero"
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Fecha
            </label>
            <div className="relative mt-1.5">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
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
            <label className="text-sm font-medium text-gray-700">
              Monto (€)
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                €
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pl-9 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Estado
            </label>
            <div className="relative mt-1.5">
              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as "completed" | "pending"
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                <option value="completed">Completado</option>
                <option value="pending">Pendiente</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
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

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">
              Categoría
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 7h10v10H7z" />
                  <path d="M9 3h6l6 6v6" />
                </svg>
              </span>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value as TransactionCategory
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              >
                {CATEGORY_ORDER.map((cat) => (
                  <option key={cat} value={cat}>
                    {TransactionCategoryLabels[cat]}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
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

          <div className="md:col-span-2 border-t border-gray-100 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
              Relaciones y vinculación
            </p>
            <div className="mt-2.5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Contacto
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c2.4-4 13.6-4 16 0" />
                    </svg>
                  </span>
                  <select
                    value={contactId}
                    onChange={(e) =>
                      setContactId(e.target.value)
                    }
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="">
                      — Sin contacto —
                    </option>
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
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
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
                <label className="text-sm font-medium text-gray-700">
                  Evento (opcional)
                </label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="17"
                        rx="2"
                      />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  </span>
                  <select
                    value={eventId}
                    onChange={(e) => setEventId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  >
                    <option value="">
                      — Seleccionar evento —
                    </option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
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
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">
              Documentos adjuntos
            </label>
            <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-center text-sm text-gray-500 transition hover:border-primary/40">
              <input
                type="file"
                className="sr-only"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
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
              <span className="mt-2 font-medium text-gray-600">
                Haz clic para subir o arrastra un archivo
              </span>
              <span className="text-xs text-gray-400">
                PDF, JPG o PNG (máx. 5MB)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-6 py-2 text-sm font-medium text-gray-600 transition hover:bg-white"
        >
          Cancelar
        </button>

        <button
          type="submit"
          className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
        >
          {isEditing ? "Guardar cambios" : "Guardar transacción"}
        </button>
      </div>
    </form>
  );
}
