"use client";

export type EventsView = "month" | "week" | "day";

interface Props {
  onCreate: () => void;
}

export default function EventsTopbar({
  onCreate,
}: Props) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-gray-900">
          Agenda de Eventos
        </h1>
      </div>

      <button
        onClick={onCreate}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
          <span className="material-symbols-outlined text-[16px]">
            add
          </span>
        </span>
        Crear Nuevo Evento
      </button>
    </div>
  );
}
