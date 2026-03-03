import Link from "next/link";
import PageTopbar from "@/components/PageTopbar";
import SectionBlock from "@/components/shared/SectionBlock";

export default function SystemStatusPage() {
  return (
    <div className="space-y-8">
      <PageTopbar>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Configuración › Estado del sistema
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">
              Estado del sistema
            </h1>
            <p className="text-sm text-gray-500">
              Resumen rápido de la disponibilidad de Kora.
            </p>
          </div>
          <Link
            href="/settings"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
          >
            Volver a configuración
          </Link>
        </div>
      </PageTopbar>

      <SectionBlock
        title="Estado actual"
        subtitle="Disponibilidad general del servicio"
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
            Operativo
          </span>
          <span>Sin incidencias registradas.</span>
        </div>
      </SectionBlock>

      <SectionBlock title="Monitorización" subtitle="Siguientes pasos">
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Conecta esta página a tu proveedor de monitorización o estado
            público cuando esté disponible.
          </p>
          <p>
            También puedes publicar aquí mantenimiento planificado o avisos a
            los usuarios.
          </p>
        </div>
      </SectionBlock>
    </div>
  );
}
