import SectionBlock from "@/components/shared/SectionBlock";
import SettingsPageHeader from "@/components/shared/SettingsPageHeader";

export default function TermsPage() {
  return (
    <div className="space-y-8">
      <SettingsPageHeader
        section={"T\u00e9rminos"}
        title={"T\u00e9rminos de uso"}
        subtitle={
          "Condiciones generales del servicio para tu asociaci\u00f3n."
        }
      />

      <SectionBlock
        title="Documento legal"
        subtitle={"Texto base para tu organizaci\u00f3n"}
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Este apartado est{"\u00e1"} preparado para alojar los t{"\u00e9"}rminos
            de uso de tu asociaci{"\u00f3"}n.
          </p>
          <p>
            Sustituye este contenido por tu documento legal y define la fecha de
            entrada en vigor, responsabilidades, l{"\u00ed"}mites y condiciones de
            servicio.
          </p>
        </div>
      </SectionBlock>
    </div>
  );
}
