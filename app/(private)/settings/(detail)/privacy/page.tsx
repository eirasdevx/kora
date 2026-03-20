"use client";

import Link from "next/link";
import { useEffect } from "react";
import SectionBlock from "@/components/shared/SectionBlock";
import SettingsPageHeader from "@/components/shared/SettingsPageHeader";
import { useSessionStore } from "@/core/session/session.store";
import { useMessagingSettingsStore } from "@/modules/messaging/messaging.settings.store";

const DATA_CATEGORIES = [
  {
    title: "Identificación de la asociación",
    description:
      "Nombre, NIF/CIF, correo de contacto, teléfono, ubicación, dirección social y representantes.",
  },
  {
    title: "Personas y relaciones",
    description:
      "Socios, colaboradores, proveedores, voluntariado, usuarios internos y sus datos operativos asociados.",
  },
  {
    title: "Actividad organizativa",
    description:
      "Eventos, asistencia, documentos, inventario y registros necesarios para la gestión diaria.",
  },
  {
    title: "Finanzas y comunicaciones",
    description:
      "Movimientos contables, cuotas, remitentes configurados y credenciales técnicas vinculadas al envío.",
  },
] as const;

const PURPOSES = [
  {
    title: "Gestión interna",
    description:
      "Administrar personas, calendarios, recursos y documentación vinculados a la actividad asociativa.",
  },
  {
    title: "Cumplimiento administrativo",
    description:
      "Mantener trazabilidad de pagos, altas, bajas, historial documental y evidencias internas.",
  },
  {
    title: "Comunicaciones",
    description:
      "Enviar avisos, campañas y mensajes operativos usando los canales aprobados por la organización.",
  },
  {
    title: "Seguridad y control de acceso",
    description:
      "Aplicar permisos, registrar actividad relevante y proteger credenciales o configuraciones sensibles.",
  },
] as const;

function toneClasses(state: "ok" | "warning" | "info") {
  if (state === "ok") return "bg-emerald-50 text-emerald-700";
  if (state === "warning") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default function PrivacyPage() {
  const mode = useSessionStore((s) => s.mode);
  const association = useSessionStore((s) => s.association);
  const companyCode = useSessionStore((s) => s.companyCode);
  const { settings, hydrated, loadSettings } = useMessagingSettingsStore();

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const associationName = association?.name?.trim() || "tu asociación";
  const contactEmail =
    association?.contactEmail?.trim() || "Pendiente de definir";
  const location = association?.location?.trim() || "No indicado";
  const messagingReady = Boolean(
    hydrated &&
      settings.senderName &&
      settings.emailAddress &&
      (settings.hasEmailAppPassword || settings.emailAppPassword)
  );

  const summaryCards = [
    {
      label: "Responsable",
      value: associationName,
      note: "Entidad que decide el uso operativo de los datos dentro de Kora.",
    },
    {
      label: "Contacto de privacidad",
      value: contactEmail,
      note: "Canal sugerido para solicitudes, incidencias o ejercicio de derechos.",
    },
    {
      label: "Persistencia principal",
      value:
        mode === "authenticated"
          ? "IndexedDB y almacenamiento local"
          : "Sesión temporal en navegador",
      note:
        mode === "authenticated"
          ? "La información se conserva localmente en este navegador."
          : "Los datos de invitado no representan un entorno persistente completo.",
    },
    {
      label: "Canal de envío",
      value: messagingReady ? "Remitente configurado" : "Pendiente de configurar",
      note: "Los envíos dependen de las credenciales aprobadas por la asociación.",
    },
  ];

  return (
    <div className="space-y-8">
      <SettingsPageHeader
        section="Privacidad"
        title="Política de privacidad"
        subtitle="Base informativa para explicar qué datos se tratan en Kora, con qué finalidad y cómo se protegen."
        actions={
          <>
            <Link
              href="/settings/security"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              Revisar seguridad
            </Link>
            <Link
              href="/settings/migration"
              className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
            >
              Exportar datos
            </Link>
          </>
        }
      />

      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
        Esta página es un texto base operativo. Conviene revisarla con un
        responsable legal o de cumplimiento para adaptarla a RGPD/LOPDGDD y a
        la realidad concreta de la entidad.
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              {card.label}
            </p>
            <p className="mt-3 text-lg font-semibold text-gray-900">
              {card.value}
            </p>
            <p className="mt-2 text-sm text-gray-500">{card.note}</p>
          </div>
        ))}
      </section>

      <SectionBlock
        title="Responsable y alcance"
        subtitle="Datos mínimos que deberían constar en la versión final"
      >
        <dl className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Responsable del tratamiento
            </dt>
            <dd className="mt-2 text-sm font-semibold text-gray-900">
              {associationName}
            </dd>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Código de entidad
            </dt>
            <dd className="mt-2 text-sm font-semibold text-gray-900">
              {companyCode ?? "No disponible"}
            </dd>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Correo de contacto
            </dt>
            <dd className="mt-2 text-sm font-semibold text-gray-900">
              {contactEmail}
            </dd>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Ubicación declarada
            </dt>
            <dd className="mt-2 text-sm font-semibold text-gray-900">
              {location}
            </dd>
          </div>
        </dl>
      </SectionBlock>

      <SectionBlock
        title="Categorías de datos tratados"
        subtitle="Resumen útil para informar a personas usuarias, socios y colaboradores"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {DATA_CATEGORIES.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        title="Finalidades del tratamiento"
        subtitle="Por qué se usan los datos dentro de la plataforma"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {PURPOSES.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        title="Conservación, seguridad y terceros"
        subtitle="Cómo se almacenan los datos y cuándo pueden salir del entorno local"
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4 text-sm leading-7 text-gray-600">
            <p>
              En modo autenticado, Kora persiste la información operativa de la
              asociación en almacenamiento local del navegador mediante
              IndexedDB. Esto incluye contactos, eventos, finanzas, documentos,
              inventario y otros registros funcionales.
            </p>
            <p>
              Las credenciales sensibles de mensajería se vinculan a la
              asociación activa para que cada entidad envíe con su propio
              remitente y no reutilice el de otra asociación.
            </p>
            <p>
              No existe cesión automática a terceros por defecto. Solo se
              transfieren datos a proveedores de correo cuando la asociación
              configura un remitente y ejecuta un envío de mensajes desde la
              propia plataforma.
            </p>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">
                  Persistencia local
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClasses(
                    mode === "authenticated" ? "ok" : "info"
                  )}`}
                >
                  {mode === "authenticated" ? "Activa" : "Temporal"}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {mode === "authenticated"
                  ? "La asociación trabaja sobre un espacio local persistente en este navegador."
                  : "La sesión invitada no sustituye una política formal de conservación."}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">
                  Remitente de comunicaciones
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClasses(
                    hydrated
                      ? messagingReady
                        ? "ok"
                        : "warning"
                      : "info"
                  )}`}
                >
                  {hydrated
                    ? messagingReady
                      ? "Configurado"
                      : "Pendiente"
                    : "Revisando"}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {hydrated
                  ? messagingReady
                    ? `Se usará ${settings.emailAddress} cuando la asociación envíe campañas.`
                    : "No hay un remitente completo configurado para envíos externos."
                  : "Comprobando ajustes de mensajería de la asociación."}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-sm font-semibold text-gray-900">
                Exportaciones y copia local
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Las exportaciones a JSON, CSV o PDF deben quedar bajo control de
                personas autorizadas y seguir la política interna de custodia.
              </p>
            </div>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock
        title="Derechos y gestión de solicitudes"
        subtitle="Qué procedimiento conviene documentar y comunicar"
        actions={
          <Link
            href="/settings/association"
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Revisar contacto responsable
          </Link>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4 text-sm leading-7 text-gray-600">
            <p>
              La asociación debería definir un canal para atender solicitudes de
              acceso, rectificación, supresión, limitación, oposición o portabilidad,
              cuando proceda. Ese canal debería estar alineado con el correo y los
              responsables publicados en el perfil de la entidad.
            </p>
            <p>
              También conviene fijar tiempos internos de respuesta, responsables
              de validación y criterios para exportar, corregir o eliminar datos
              cuando exista una solicitud legítima.
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Checklist recomendado
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>Publicar un correo de privacidad o contacto administrativo.</li>
              <li>Definir quién valida cada solicitud dentro de la asociación.</li>
              <li>Usar exportaciones controladas para responder a peticiones.</li>
              <li>Revisar seguridad y permisos antes de entregar información.</li>
            </ul>
          </div>
        </div>
      </SectionBlock>
    </div>
  );
}
