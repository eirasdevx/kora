const colorSwatches = [
  "#1D4ED8",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
];

export default function AppearanceSettingsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Configuración &nbsp;›&nbsp; Apariencia
        </p>
        <h1 className="text-3xl font-semibold text-gray-900">Apariencia</h1>
        <p className="text-sm text-gray-500">
          Personaliza el aspecto visual de tu plataforma para adaptarla a tu
          imagen corporativa.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Color de Marca</h2>
          <p className="mt-2 text-sm text-gray-500">
            Define el color principal que se utilizará en botones, enlaces y
            elementos destacados.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {colorSwatches.map((color, index) => (
              <div
                key={color}
                className={`h-12 w-12 rounded-2xl border-2 ${
                  index === 0 ? "border-primary" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Código hexadecimal
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                defaultValue="#135BEC"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              />
              <div className="h-12 w-24 rounded-2xl border border-gray-200 bg-primary" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tema de Interfaz</h2>
          <p className="mt-2 text-sm text-gray-500">
            Elige entre una apariencia clara para mayor legibilidad o una
            oscura para reducir la fatiga visual.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4">
            <div className="h-28 rounded-xl bg-white shadow-sm" />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Tema Claro</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                ✓
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 p-4">
            <div className="h-28 rounded-xl bg-gray-900" />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Tema Oscuro</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tipografía y Escala</h2>
          <p className="mt-2 text-sm text-gray-500">
            Ajusta el tamaño base de la fuente para optimizar la experiencia de
            lectura.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
            <span>Compacto</span>
            <span>Estándar</span>
            <span>Accesible</span>
          </div>
          <input type="range" className="w-full" defaultValue={50} />
          <p className="text-xs text-gray-500">
            Previsualización de texto: “La asociación gestiona eficazmente sus recursos.”
          </p>
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Fuente del Sistema</p>
              <p className="text-xs text-gray-500">Inter, sans-serif</p>
            </div>
            <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">
              Cambiar Familia
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-500">
          Cambios sin guardar en la apariencia.
        </p>
        <div className="flex items-center gap-3">
          <button className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600">
            Descartar
          </button>
          <button className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow">
            Aplicar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
