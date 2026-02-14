"use client";

export type EventsView = "month" | "week" | "day";

interface Props {
  view: EventsView;
  onChangeView: (v: EventsView) => void;
  onSearch: (value: string) => void;
  onCreate: () => void;
}

const VIEW_OPTIONS: { label: string; value: EventsView }[] = [
  { label: "Mes", value: "month" },
  { label: "Semana", value: "week" },
  { label: "Día", value: "day" },
];


export default function EventsTopbar({
  view,
  onChangeView,
  onSearch,
  onCreate,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            Agenda de Eventos
          </h1>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChangeView(opt.value)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  view === opt.value
                    ? "bg-primary text-white shadow"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <span className="material-symbols-outlined text-[16px] leading-none">
                search
              </span>
            </span>
            <input
              type="text"
              placeholder="Buscar eventos..."
              onChange={(e) => onSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
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
      </div>
    </div>
  );
}
