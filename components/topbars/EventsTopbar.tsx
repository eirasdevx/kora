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
    <div className="flex flex-col gap-3">
      {/* Fila principal (desktop: una sola fila) */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold">Agenda de Eventos</h1>

        <button
          onClick={onCreate}
          className="bg-primary text-white px-4 py-2 rounded-lg font-bold w-full lg:w-auto"
        >
          + Crear Nuevo Evento
        </button>
      </div>

      {/* Controles */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Tabs */}
        <div className="inline-flex rounded-lg border overflow-hidden w-fit">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChangeView(opt.value)}
              className={`px-4 py-2 text-sm font-medium transition
                ${
                  view === opt.value
                    ? "bg-primary text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="lg:ml-auto w-full lg:w-80">
          <input
            type="text"
            placeholder="Buscar eventos..."
            onChange={(e) => onSearch(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
