import SectionBlock from "@/components/shared/SectionBlock";
import SettingsPageHeader from "@/components/shared/SettingsPageHeader";

export default function SystemStatusPage() {
  return (
    <div className="space-y-8">
      <SettingsPageHeader
        section="Estado del sistema"
        title="Estado del sistema"
        subtitle={"Resumen r\u00e1pido de la disponibilidad de Kora."}
      />

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
    </div>
  );
}
