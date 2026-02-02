export default function ProfileSettingsPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Configuración &nbsp;›&nbsp; Perfil de Asociación
          </p>
          <h1 className="text-3xl font-semibold text-gray-900">
            Perfil de Asociación
          </h1>
          <p className="text-sm text-gray-500">
            Configura la información pública y legal que identifica a tu
            organización.
          </p>
        </div>
        <button className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm">
          ← Volver al Panel
        </button>
      </header>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Identidad Visual</h2>
          <p className="mt-2 text-sm text-gray-500">
            Carga el logotipo oficial de tu asociación. Este se utilizará en
            facturas, documentos PDF y en el portal de socios.
          </p>
        </div>
        <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
          <div>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 5h18v14H3z" />
                <path d="M8 10l4 4 4-4" />
              </svg>
            </div>
            <p className="mt-4 font-semibold text-primary">
              Haz clic para subir un logo
            </p>
            <p className="text-xs text-gray-400">
              Formatos recomendados: SVG, PNG de alta calidad (Máx. 5MB)
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Información General
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Detalles oficiales de registro. Asegúrate de que el NIF y el nombre
            coincidan con tus escrituras legales.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Nombre de la Asociación
            </label>
            <input
              defaultValue="Asociación Cultural Kora"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                NIF / CIF
              </label>
              <input
                defaultValue="G88776655"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Teléfono Oficial
              </label>
              <input
                defaultValue="+34 912 345 678"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Correo Electrónico de Contacto
            </label>
            <input
              defaultValue="contacto@kora.org"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Dirección Social Completa
            </label>
            <textarea
              defaultValue="Calle de la Innovación 42, Planta 2, 28014 Madrid, España"
              className="mt-2 min-h-[110px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Preferencias Locales
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Configura la moneda predeterminada para tus recibos y el huso
            horario para las notificaciones.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Moneda Base
            </label>
            <select className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
              <option>Euro (€)</option>
              <option>Dólar (USD)</option>
              <option>Libra (GBP)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Huso Horario
            </label>
            <select className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
              <option>(GMT+01:00) Madrid</option>
              <option>(GMT+00:00) Lisboa</option>
              <option>(GMT+02:00) Atenas</option>
            </select>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Hay cambios pendientes de guardar
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600">
            Descartar
          </button>
          <button className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow">
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
