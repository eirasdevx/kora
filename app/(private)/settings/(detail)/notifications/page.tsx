"use client";

import { useRouter } from "next/navigation";
import PageTopbar from "@/components/PageTopbar";

const sections = [
  {
    title: "Contabilidad",
    items: [
      {
        title: "Nuevas transacciones",
        description:
          "Recibe un aviso cuando se registre un nuevo ingreso o gasto.",
        email: true,
        push: false,
      },
    ],
  },
  {
    title: "Eventos",
    items: [
      {
        title: "Nuevas inscripciones",
        description:
          "Notificar cuando un socio se inscriba a un evento activo.",
        email: true,
        push: true,
      },
    ],
  },
  {
    title: "Socios",
    items: [
      {
        title: "Nuevas altas",
        description:
          "Confirmación de registro de nuevos miembros en la asociación.",
        email: true,
        push: false,
      },
    ],
  },
];

function Toggle({ defaultChecked }: { defaultChecked?: boolean }) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" defaultChecked={defaultChecked} className="peer sr-only" />
      <div className="h-6 w-11 rounded-full bg-gray-200 transition peer-checked:bg-primary" />
      <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
    </label>
  );
}

export default function NotificationsSettingsPage() {
  const router = useRouter();
  return (
    <div className="space-y-8">
      <PageTopbar>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Configuración &nbsp;›&nbsp; Notificaciones
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">
              Notificaciones
            </h1>
            <p className="text-sm text-gray-500">
              Gestiona cómo y cuándo recibes avisos de la plataforma.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm"
          >
            ← Volver a configuracion
          </button>
        </div>
      </PageTopbar>

      {sections.map((section) => (
        <div key={section.title} className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-600">
              <span className="material-symbols-outlined text-[20px]">add</span>
            </span>
            <h2 className="text-lg font-semibold text-gray-900">
              {section.title}
            </h2>
          </div>
          {section.items.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {item.title}
                </p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <div className="flex items-center gap-6 text-xs font-semibold text-gray-500">
                <div className="flex items-center gap-2">
                  EMAIL
                  <Toggle defaultChecked={item.email} />
                </div>
                <div className="flex items-center gap-2">
                  PUSH
                  <Toggle defaultChecked={item.push} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-500">
          Los cambios se guardarán para todos los administradores.
        </p>
        <div className="flex items-center gap-3">
          <button className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600">
            Restablecer
          </button>
          <button className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow">
            Guardar Preferencias
          </button>
        </div>
      </div>
    </div>
  );
}
