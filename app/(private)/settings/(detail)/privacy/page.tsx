import Link from "next/link";
import PageTopbar from "@/components/PageTopbar";
import SectionBlock from "@/components/shared/SectionBlock";

export default function PrivacyPage() {
  return (
    <div className="space-y-8">
      <PageTopbar>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Configuración › Privacidad
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">
              Política de privacidad
            </h1>
            <p className="text-sm text-gray-500">
              Información sobre el tratamiento y la protección de datos.
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
        title="Aviso de privacidad"
        subtitle="Comunica cómo se gestionan los datos"
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Explica qué datos personales se recopilan, con qué finalidad y cómo
            se protegen dentro de la plataforma.
          </p>
          <p>
            Añade información sobre derechos de acceso, rectificación,
            cancelación y oposición cuando publiques tu documento oficial.
          </p>
        </div>
      </SectionBlock>

      <SectionBlock
        title="Contacto de privacidad"
        subtitle="Responsable del tratamiento"
      >
        <p className="text-sm text-gray-600">
          Define aquí el correo o la persona responsable para consultas de
          privacidad.
        </p>
      </SectionBlock>
    </div>
  );
}
