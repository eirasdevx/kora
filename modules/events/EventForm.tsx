"use client";

import { useState } from "react";
import { Event, EventStatus } from "./event.types";
import PageHeader from "@/components/shared/PageHeader";
import { moduleTopbarButtonStyles } from "@/components/shared/ModuleTopbar";

interface Props {
  initialData?: Event;
  onSubmit: (event: Event) => void;
  onCancel: () => void;
  backHref?: string;
  backLabel?: string;
}

const CATEGORY_OPTIONS = [
  "Social / RecaudaciÃ³n",
  "FormaciÃ³n",
  "Deportivo",
  "Cultural",
  "Comunidad",
  "Otro",
];

function formatDateInput(iso?: string) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function formatTimeInput(iso?: string) {
  if (!iso) return "";
  return iso.slice(11, 16);
}

export default function EventForm({
  initialData,
  onSubmit,
  onCancel,
  backHref,
  backLabel,
}: Props) {
  const isEditing = Boolean(initialData);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [category, setCategory] = useState(
    initialData?.category ?? CATEGORY_OPTIONS[0]
  );
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [eventDate, setEventDate] = useState(
    formatDateInput(initialData?.startDate)
  );
  const [startTime, setStartTime] = useState(
    formatTimeInput(initialData?.startDate)
  );
  const [endTime, setEndTime] = useState(
    formatTimeInput(initialData?.endDate)
  );
  const [locationType, setLocationType] = useState<
    "onsite" | "online"
  >(initialData?.locationType ?? "onsite");
  const [location, setLocation] = useState(
    initialData?.location ?? ""
  );
  const [ticketPrice, setTicketPrice] = useState(
    initialData?.ticketPrice != null
      ? String(initialData.ticketPrice)
      : ""
  );
  const [capacity, setCapacity] = useState(
    initialData?.capacity != null
      ? String(initialData.capacity)
      : ""
  );
  const [registrationDeadline, setRegistrationDeadline] =
    useState(formatDateInput(initialData?.registrationDeadline));
  const [waitlistEnabled, setWaitlistEnabled] = useState(
    initialData?.waitlistEnabled ?? false
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !eventDate || !startTime) return;

    const submitter = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const action = submitter?.value ?? "publish";
    const status: EventStatus =
      action === "draft" ? "draft" : "published";

    const startDate = new Date(
      `${eventDate}T${startTime}`
    ).toISOString();
    const endDate = endTime
      ? new Date(`${eventDate}T${endTime}`).toISOString()
      : undefined;
    const deadline = registrationDeadline
      ? new Date(`${registrationDeadline}T00:00:00`).toISOString()
      : undefined;

    const parsedTicketPrice = ticketPrice
      ? Number(ticketPrice)
      : undefined;
    const parsedCapacity = capacity ? Number(capacity) : undefined;

    const event: Event = {
      id: initialData?.id ?? crypto.randomUUID(),
      title: title.trim(),
      category,
      description: description || undefined,
      status,
      startDate,
      endDate,
      location: location || undefined,
      locationType,
      ticketPrice: Number.isNaN(parsedTicketPrice)
        ? undefined
        : parsedTicketPrice,
      capacity: Number.isNaN(parsedCapacity)
        ? undefined
        : parsedCapacity,
      registrationDeadline: deadline,
      waitlistEnabled,
      participantIds: initialData?.participantIds ?? [],
      organizerIds: initialData?.organizerIds ?? [],
      createdAt:
        initialData?.createdAt ?? new Date().toISOString(),
    };

    onSubmit(event);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PageHeader
        title={isEditing ? "Editar evento" : "Crear nuevo evento"}
        subtitle={"Planificaci\u00f3n de actividades"}
        backHref={backHref}
        backLabel={backLabel}
        actions={
          <>
            <button
              type="button"
              onClick={onCancel}
              className={moduleTopbarButtonStyles.secondary}
            >
              Cancelar
            </button>
            <button
              type="submit"
              value="draft"
              className={moduleTopbarButtonStyles.secondary}
            >
              Guardar borrador
            </button>
            <button
              type="submit"
              value="publish"
              className={moduleTopbarButtonStyles.primary}
            >
              Publicar
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm xl:col-span-12">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              i
            </span>
            <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">
              InformaciÃ³n general
            </h2>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  TÃ­tulo del evento
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  placeholder="Ej: Gala de Beneficencia OtoÃ±o"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  CategorÃ­a
                </label>
                <div className="relative mt-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    v
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                DescripciÃ³n
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 min-h-[180px] w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="Escribe aquÃ­ los detalles del evento..."
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm xl:col-span-7">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              U
            </span>
            <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">
              LogÃ­stica y ubicaciÃ³n
            </h2>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="text-xs font-semibold uppercase text-gray-400">
                Fecha del evento
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Hora inicio
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Hora fin
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold uppercase text-gray-400">
              DirecciÃ³n o enlace de reuniÃ³n
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { label: "Presencial", value: "onsite" },
                { label: "En lÃ­nea", value: "online" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setLocationType(option.value as "onsite" | "online")
                  }
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    locationType === option.value
                      ? "bg-primary text-white"
                      : "border border-gray-200 text-gray-500"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-3 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              placeholder={
                locationType === "online"
                  ? "Ej: https://zoom.us/..."
                  : "Ej: Hotel Continental, SalÃ³n Real"
              }
            />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm xl:col-span-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              â‚¬
            </span>
            <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">
              Entradas y aforo
            </h2>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Precio de entrada
                </label>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                    â‚¬
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ticketPrice}
                    onChange={(e) => setTicketPrice(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-8 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-gray-400">
                  Capacidad mÃ¡xima
                </label>
                <input
                  type="number"
                  min="0"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  placeholder="Ej: 150"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-gray-400">
                Cierre de inscripciÃ³n
              </label>
              <input
                type="date"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={waitlistEnabled}
                onChange={(e) => setWaitlistEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
              />
              Activar lista de espera
            </label>
          </div>
        </section>
      </div>
    </form>
  );
}
