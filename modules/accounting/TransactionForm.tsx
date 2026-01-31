"use client";

import { useState } from "react";
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
  const contacts = useContactsStore((s) => s.contacts);
  const events = useEventsStore((s) => s.events);

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
      className="w-full max-w-4xl mx-auto bg-white rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-8 pt-6 pb-4 border-b">
        <h2 className="text-2xl font-bold">
          Nueva Transacción
        </h2>
        <p className="text-gray-500 text-sm">
          Registra un ingreso o gasto de la asociación
        </p>
      </div>

      {/* Tipo */}
      <div className="px-8 py-6 border-b">
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">
          Tipo de transacción
        </p>

        <div className="flex bg-gray-100 rounded-xl p-2 gap-2">
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex-1 rounded-lg px-4 py-3 transition-all
              ${
                type === "income"
                  ? "bg-green-500 text-white font-bold shadow"
                  : "bg-transparent text-gray-600"
              }`}
          >
            Ingreso
            <div className="text-xs font-normal">
              Entrada de dinero
            </div>
          </button>

          <button
            type="button"
            onClick={() => setType("expense")}
            className={`flex-1 rounded-lg px-4 py-3 transition-all
              ${
                type === "expense"
                  ? "bg-red-500 text-white font-bold shadow"
                  : "bg-transparent text-gray-600"
              }`}
          >
            Gasto
            <div className="text-xs font-normal">
              Salida de dinero
            </div>
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium">
            Título
          </label>
          <input
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Ej: Cuota de socio Enero"
            className="w-full mt-1 border rounded-lg px-4 py-3"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            Fecha
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full mt-1 border rounded-lg px-4 py-3"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            Monto (€)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full mt-1 border rounded-lg px-4 py-3"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            Estado
          </label>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "completed" | "pending")
            }
            className="w-full mt-1 border rounded-lg px-4 py-3"
          >
            <option value="completed">Completado</option>
            <option value="pending">Pendiente</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">
            Categoría
          </label>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as TransactionCategory)
            }
            className="w-full mt-1 border rounded-lg px-4 py-3"
          >
            {CATEGORY_ORDER.map((cat) => (
              <option key={cat} value={cat}>
                {TransactionCategoryLabels[cat]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">
            Contacto
          </label>
          <select
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            className="w-full mt-1 border rounded-lg px-4 py-3"
          >
            <option value="">— Sin contacto —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="text-sm font-medium">
            Evento (opcional)
          </label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full mt-1 border rounded-lg px-4 py-3"
          >
            <option value="">— Sin evento —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-6 border-t pb-4 flex justify-end gap-4">

        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          Cancelar
        </button>

        <button
          type="submit"
          className="px-8 py-3 rounded-lg bg-primary text-white font-bold shadow"
        >
          Guardar Transacción
        </button>
      </div>
    </form>
  );
}
