import Link from "next/link";
import PageTopbar from "@/components/PageTopbar";
import SectionBlock from "@/components/shared/SectionBlock";

export default function TermsPage() {
  return (
    <div className="space-y-8">
      <PageTopbar>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Configuración › Términos
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">
              Términos de uso
            </h1>
            <p className="text-sm text-gray-500">
              Condiciones generales del servicio para tu asociación.
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
        title="Documento legal"
        subtitle="Texto base para tu organización"
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Este apartado está preparado para alojar los términos de uso de tu
            asociación.
          </p>
          <p>
            Sustituye este contenido por tu documento legal y define la fecha de
            última revisión cuando esté aprobado.
          </p>
        </div>
      </SectionBlock>

      <SectionBlock
        title="Última revisión"
        subtitle="Estado actual del documento"
      >
        <p className="text-sm text-gray-600">Pendiente de publicar.</p>
      </SectionBlock>
    </div>
  );
}
