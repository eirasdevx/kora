import Link from "next/link";
import SectionBlock from "@/components/shared/SectionBlock";
import SettingsPageHeader from "@/components/shared/SettingsPageHeader";

export default function PrivacyPage() {
  return (
    <div className="space-y-8">
      <SettingsPageHeader
        section="Privacidad"
        title={"Pol\u00edtica de privacidad"}
        subtitle={
          "Informaci\u00f3n sobre el tratamiento y la protecci\u00f3n de datos."
        }
      />

      <SectionBlock
        title="Aviso de privacidad"
        subtitle={"Comunica c\u00f3mo se gestionan los datos"}
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Explica qu{"\u00e9"} datos personales se recopilan, con qu{"\u00e9"} finalidad y
            c{"\u00f3"}mo se protegen dentro de la plataforma.
          </p>
          <p>
            A{"\u00f1"}ade informaci{"\u00f3"}n sobre derechos de acceso,
            rectificaci{"\u00f3"}n, cancelaci{"\u00f3"}n y oposici{"\u00f3"}n, as{"\u00ed"}
            como los datos de contacto del responsable del tratamiento.
          </p>
          <Link
            href="/settings"
            className="inline-flex rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Revisar ajustes legales
          </Link>
        </div>
      </SectionBlock>
    </div>
  );
}
