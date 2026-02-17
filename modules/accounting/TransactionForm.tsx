"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Transaction,
  TransactionCategory,
  TransactionCategoryLabels,
  TransactionStatusLabels,
  TransactionType,
} from "@/modules/accounting/transaction.types";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { ContactType, ContactTypeLabels } from "@/modules/contacts/contact.types";
import { useEventsStore } from "@/modules/events/events.store";
import Modal from "@/components/Modal";

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
  const [contactIds, setContactIds] = useState<string[]>(() => {
    if (initialData?.contactIds?.length) return initialData.contactIds;
    if (initialData?.contactId) return [initialData.contactId];
    return [];
  });
  const [contactFilter, setContactFilter] = useState<ContactType | "all">("all");
  const [eventId, setEventId] = useState(initialData?.eventId ?? "");
  const [paymentMethod, setPaymentMethod] = useState(
    initialData?.paymentMethod ?? ""
  );
  const [notes, setNotes] = useState(initialData?.description ?? "");
  const [attachments, setAttachments] = useState<File[]>(
    initialData?.attachments ?? []
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [contactsPage, setContactsPage] = useState(1);

  useEffect(() => {
    loadContacts();
    loadEvents();
  }, [loadContacts, loadEvents]);

  const numericAmount = Number(amount) || 0;
  const isExpense = type === "expense";
  const isValid = concept.trim().length > 0 && numericAmount > 0;

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

  const amountDisplay = useMemo(() => {
    try {
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
      }).format(numericAmount || 0);
    } catch {
      return `€ ${numericAmount.toFixed(2)}`;
    }
  }, [numericAmount]);

  const dateLabel = useMemo(() => {
    if (!date) return "Sin fecha";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return date;
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(parsed);
  }, [date]);

  const filteredContacts = useMemo(() => {
    if (contactFilter === "all") return contacts;
    return contacts.filter((c) => c.types.includes(contactFilter));
  }, [contacts, contactFilter]);

  const contactsPageSize = 10;
  const contactsTotalPages = useMemo(
    () =>
      Math.max(1, Math.ceil(filteredContacts.length / contactsPageSize)),
    [filteredContacts.length, contactsPageSize]
  );
  const contactsPageSafe = Math.min(contactsPage, contactsTotalPages);
  const pagedContacts = useMemo(() => {
    const start = (contactsPageSafe - 1) * contactsPageSize;
    return filteredContacts.slice(start, start + contactsPageSize);
  }, [filteredContacts, contactsPageSafe, contactsPageSize]);
  const contactsCanPrev = contactsPageSafe > 1;
  const contactsCanNext = contactsPageSafe < contactsTotalPages;

  useEffect(() => {
    if (contactsPage !== contactsPageSafe) {
      setContactsPage(contactsPageSafe);
    }
  }, [contactsPage, contactsPageSafe]);

  useEffect(() => {
    setContactsPage(1);
  }, [contactFilter, contactsOpen]);

  const selectedContacts = useMemo(
    () => contacts.filter((c) => contactIds.includes(c.id)),
    [contacts, contactIds]
  );

  const selectedContactsPreview = useMemo(() => {
    if (selectedContacts.length === 0) {
      return "Sin contactos seleccionados";
    }
    const names = selectedContacts
      .slice(0, 2)
      .map(
        (c) =>
          `${c.firstName} ${c.lastName}`.trim() ||
          c.fullName ||
          "Sin nombre"
      );
    const extra = selectedContacts.length - names.length;
    return extra > 0 ? `${names.join(", ")} +${extra}` : names.join(", ");
  }, [selectedContacts]);

  const allContactIds = useMemo(
    () => contacts.map((c) => c.id),
    [contacts]
  );
  const filteredContactIds = useMemo(
    () => filteredContacts.map((c) => c.id),
    [filteredContacts]
  );

  const allSelected =
    allContactIds.length > 0 &&
    allContactIds.every((id) => contactIds.includes(id));
  const filteredSelected =
    filteredContactIds.length > 0 &&
    filteredContactIds.every((id) => contactIds.includes(id));

  const toggleContact = (id: string) => {
    setContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAllContacts = (checked: boolean) => {
    setContactIds(checked ? allContactIds : []);
  };

  const toggleAllFiltered = (checked: boolean) => {
    if (filteredContactIds.length === 0) return;
    setContactIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...filteredContactIds]));
      }
      return prev.filter((id) => !filteredContactIds.includes(id));
    });
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files);
    setAttachments((prev) => [...prev, ...next]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    handleFilesSelected(event.dataTransfer.files);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

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
      contactId: contactIds[0] || undefined,
      contactIds: contactIds.length ? contactIds : undefined,
      eventId: eventId || undefined,
      paymentMethod: paymentMethod || undefined,
      description: notes.trim() || undefined,
      attachments: attachments.length ? attachments : undefined,
      createdAt: initialData?.createdAt ?? new Date().toISOString(),
    };

    onSubmit(tx);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="min-h-screen bg-slate-50">
        <div className="w-full px-6 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300"
              aria-label="Volver"
            >
              <span className="material-symbols-outlined text-[20px]">
                chevron_left
              </span>
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
              disabled={!isValid}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200 transition ${
                isValid
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "cursor-not-allowed bg-blue-300"
              }`}
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
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setType("income")}
                  className={`flex flex-1 items-center justify-center gap-3 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold transition ${
                    type === "income"
                      ? "bg-emerald-500 text-white shadow"
                      : "bg-white text-slate-600 hover:border-slate-200"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      type === "income"
                        ? "bg-white/20 text-white"
                        : "bg-emerald-50 text-emerald-500"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      south
                    </span>
                  </span>
                  Ingreso
                </button>
                <button
                  type="button"
                  onClick={() => setType("expense")}
                  className={`flex flex-1 items-center justify-center gap-3 rounded-xl border border-transparent px-4 py-3 text-sm font-semibold transition ${
                    type === "expense"
                      ? "bg-rose-500 text-white shadow"
                      : "bg-white text-slate-600 hover:border-slate-200"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      type === "expense"
                        ? "bg-white/20 text-white"
                        : "bg-rose-50 text-rose-500"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      north
                    </span>
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
                        <span className="material-symbols-outlined text-[16px]">
                          calendar_month
                        </span>
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
                        <span className="material-symbols-outlined text-[16px]">
                          expand_more
                        </span>
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
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                        required
                      />
                      <p className="mt-2 text-xs text-slate-400">
                        Se registrara como {isExpense ? "gasto" : "ingreso"}.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <div
                      className={`w-full rounded-xl border px-4 py-3 text-center text-xs font-semibold ${
                        isExpense
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      <p className="text-[11px] uppercase tracking-[0.2em]">
                        Impacto balance
                      </p>
                      <div className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full ${
                            isExpense ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {isExpense ? "south" : "north"}
                          </span>
                        </span>
                        {impactLabel}
                      </div>
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
                      <span className="material-symbols-outlined text-[16px]">
                        expand_more
                      </span>
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
                          <span className="material-symbols-outlined text-[20px]">
                            format_list_bulleted
                          </span>
                        </span>
                        {TransactionCategoryLabels[cat]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Notas adicionales
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Añade detalles relevantes sobre esta transacción..."
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                  <span className="material-symbols-outlined text-[16px]">
                    summarize
                  </span>
                </span>
                Resumen rapido
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Tipo
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isExpense
                        ? "bg-rose-50 text-rose-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {isExpense ? "Gasto" : "Ingreso"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Monto
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {isExpense ? "-" : "+"}
                    {amountDisplay}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Fecha
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {dateLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Estado
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      status === "completed"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {TransactionStatusLabels[status]}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <span className="material-symbols-outlined text-[16px]">
                    link
                  </span>
                </span>
                Vinculación
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Contactos asociados
                  </label>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          {contactIds.length} seleccionados
                        </p>
                        <p className="text-xs text-slate-400">
                          {selectedContactsPreview}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setContactsOpen(true)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Seleccionar contactos
                      </button>
                    </div>
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
                      <span className="material-symbols-outlined text-[16px]">
                        expand_more
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <span className="material-symbols-outlined text-[16px]">
                    description
                  </span>
                </span>
                Documentación
              </div>
              <label
                className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 transition hover:border-blue-300"
                onDrop={handleDrop}
                onDragOver={(event) => event.preventDefault()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">
                    cloud_upload
                  </span>
                </span>
                <span className="mt-3 font-semibold text-slate-700">
                  Arrastra comprobantes
                </span>
                <span className="text-xs text-slate-400">
                  Soporta PDF, JPG y PNG hasta 10MB
                </span>
              </label>
              <div className="mt-4 space-y-2">
                {attachments.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    No hay documentos adjuntos.
                  </p>
                ) : (
                  attachments.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                          <span className="material-symbols-outlined text-[16px]">
                            description
                          </span>
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                      >
                        Quitar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

          </div>
        </div>
        </div>
      </form>

      <Modal
        isOpen={contactsOpen}
        onClose={() => setContactsOpen(false)}
        title="Contactos asociados"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">
                {contactIds.length} seleccionados - {contacts.length} disponibles
              </p>
              <p className="text-xs text-slate-400">
                Marca contactos y usa los filtros por tipo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setContactsOpen(false)}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow hover:bg-blue-700"
            >
              Listo
            </button>
          </div>

          <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleAllContacts(e.target.checked)}
              />
              Seleccionar todos
            </label>
            <label
              className={`flex items-center gap-2 ${
                contactFilter === "all" ? "text-slate-400" : "text-slate-600"
              }`}
            >
              <input
                type="checkbox"
                checked={filteredSelected}
                onChange={(e) => toggleAllFiltered(e.target.checked)}
                disabled={contactFilter === "all"}
              />
              Seleccionar todos del tipo{" "}
              {contactFilter === "all" ? "-" : ContactTypeLabels[contactFilter]}
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Filtrar por tipo
            </label>
            <div className="relative mt-2">
              <select
                value={contactFilter}
                onChange={(e) =>
                  setContactFilter(e.target.value as ContactType | "all")
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">Todos</option>
                <option value="member">Socios</option>
                <option value="provider">Proveedores</option>
                <option value="collaborator">Colaboradores</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <span className="material-symbols-outlined text-[16px]">
                  expand_more
                </span>
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="max-h-[360px] overflow-auto">
              {filteredContacts.length === 0 ? (
                <p className="px-4 py-3 text-sm text-slate-400">
                  No hay contactos para este filtro.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {pagedContacts.map((c) => {
                    const displayName =
                      `${c.firstName} ${c.lastName}`.trim() ||
                      c.fullName ||
                      "Sin nombre";
                    const typesLabel = c.types
                      .map((t) => ContactTypeLabels[t])
                      .join(", ");
                    return (
                      <li
                        key={c.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <input
                          type="checkbox"
                          checked={contactIds.includes(c.id)}
                          onChange={() => toggleContact(c.id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">
                            {displayName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {typesLabel || "Sin tipo"}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              Mostrando {pagedContacts.length} de {filteredContacts.length} contactos
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  contactsCanPrev && setContactsPage(contactsPageSafe - 1)
                }
                disabled={!contactsCanPrev}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  contactsCanPrev
                    ? "border-slate-200 text-slate-600 hover:bg-slate-50"
                    : "cursor-not-allowed border-slate-100 text-slate-300"
                }`}
              >
                Anterior
              </button>
              <span className="text-xs text-slate-400">
                {contactsPageSafe} / {contactsTotalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  contactsCanNext && setContactsPage(contactsPageSafe + 1)
                }
                disabled={!contactsCanNext}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  contactsCanNext
                    ? "border-slate-200 text-slate-600 hover:bg-slate-50"
                    : "cursor-not-allowed border-slate-100 text-slate-300"
                }`}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
