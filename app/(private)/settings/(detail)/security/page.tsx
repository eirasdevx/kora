const activity = [
  {
    action: "Inicio de sesión",
    device: "Chrome on macOS",
    location: "Madrid, ES (83.50.21.x)",
    date: "Hoy, 10:24",
  },
  {
    action: "Cambio de configuración",
    device: "Safari on iPhone",
    location: "Madrid, ES (83.50.21.x)",
    date: "Ayer, 18:45",
  },
];

export default function SecuritySettingsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Configuración &nbsp;›&nbsp; Seguridad
        </p>
        <h1 className="text-3xl font-semibold text-gray-900">Seguridad</h1>
        <p className="text-sm text-gray-500">
          Gestiona el acceso a tu cuenta y protege la integridad de los datos.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Cambiar Contraseña
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Recomendamos usar una contraseña robusta que no utilices en otros
            servicios.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Contraseña Actual
            </label>
            <input
              type="password"
              defaultValue="••••••••••••"
              className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Nueva Contraseña
              </label>
              <input
                type="password"
                defaultValue="••••••••••"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                defaultValue="••••••••••"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
            La contraseña debe tener al menos 12 caracteres, incluir una
            mayúscula, un número y un carácter especial.
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Autenticación en dos pasos (2FA)
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Añade una capa extra de seguridad solicitando un código de tu
            móvil al iniciar sesión.
          </p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              ✓
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                2FA está desactivado
              </p>
              <p className="text-xs text-gray-500">
                Activa el 2FA para proteger tu cuenta.
              </p>
            </div>
          </div>
          <button className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
            Configurar
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Registro de Actividad
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Historial de los últimos inicios de sesión y acciones críticas
              realizadas.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <div className="grid grid-cols-4 gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              <span>Acción</span>
              <span>Dispositivo</span>
              <span>Ubicación / IP</span>
              <span>Fecha</span>
            </div>
            {activity.map((item) => (
              <div
                key={item.action}
                className="grid grid-cols-4 gap-3 border-b border-gray-100 px-4 py-3 text-sm text-gray-600 last:border-none"
              >
                <span>{item.action}</span>
                <span>{item.device}</span>
                <span>{item.location}</span>
                <span>{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-500">
          Protege tu cuenta con una configuración segura.
        </p>
        <div className="flex items-center gap-3">
          <button className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600">
            Descartar
          </button>
          <button className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow">
            Actualizar Seguridad
          </button>
        </div>
      </div>
    </div>
  );
}
