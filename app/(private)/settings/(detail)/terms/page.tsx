"use client";

import Link from "next/link";
import SectionBlock from "@/components/shared/SectionBlock";
import SettingsPageHeader from "@/components/shared/SettingsPageHeader";
import { useSessionStore } from "@/core/session/session.store";

const ROLE_GUIDELINES = [
  {
    role: "Administrador",
    description:
      "Gestiona accesos, configuración, exportaciones, políticas internas y revisiones legales.",
    tone: "bg-blue-50 text-blue-700",
  },
  {
    role: "Gestor",
    description:
      "Opera los módulos autorizados, mantiene la calidad de los datos y reporta incidencias.",
    tone: "bg-indigo-50 text-indigo-700",
  },
  {
    role: "Lector",
    description:
      "Consulta la información autorizada sin modificar registros ni credenciales críticas.",
    tone: "bg-slate-100 text-slate-700",
  },
  {
    role: "Invitado",
    description:
      "Accede a una sesión temporal de demostración sin persistencia completa ni acciones sensibles.",
    tone: "bg-amber-50 text-amber-700",
  },
] as const;

const formatLongDate = (value: Date) =>
  new Intl.DateTimeFormat("es-ES", {
    dateStyle: "long",
  }).format(value);

export default function TermsPage() {
  const association = useSessionStore((s) => s.association);
  const companyCode = useSessionStore((s) => s.companyCode);
  const mode = useSessionStore((s) => s.mode);

  const associationName = association?.name?.trim() || "tu asociación";
  const associationEmail =
    association?.contactEmail?.trim() || "Pendiente de definir";
  const associationLocation =
    association?.location?.trim() || "No indicado";
  const representative =
    association?.representatives?.find((item) => item.name?.trim()) ?? null;
  const effectiveDate = formatLongDate(new Date());

  const summaryCards = [
    {
      label: "Estado del texto",
      value: "Modelo operativo",
      note: "Requiere validación jurídica antes de su publicación final.",
    },
    {
      label: "Titular",
      value: associationName,
      note: "Documento asociado a la entidad activa en esta sesión.",
    },
    {
      label: "Código interno",
      value: companyCode ?? "No disponible",
      note: "Referencia de acceso y administración de la organización.",
    },
    {
      label: "Entrada en vigor",
      value: effectiveDate,
      note: "Actualiza la fecha cuando apruebes el documento definitivo.",
    },
  ];

  return (
    <div className="space-y-8">
      <SettingsPageHeader
        section="Términos"
        title="Términos de uso"
        subtitle="Documento base para regular el acceso, uso y responsabilidades dentro de Kora."
        actions={
          <>
            <Link
              href="/settings/association"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              Revisar datos legales
            </Link>
            <Link
              href="/settings/privacy"
              className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
            >
              Ver privacidad
            </Link>
          </>
        }
      />

      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
        Este texto funciona como base operativa interna. Debe ser revisado y
        adaptado por la asociación o su asesoría antes de utilizarse como
        documento legal definitivo.
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
        title="Objeto y alcance"
        subtitle="Qué regula este documento y sobre quién aplica"
      >
        <div className="space-y-4 text-sm leading-7 text-gray-600">
          <p>
            Los presentes términos regulan el uso de Kora como entorno de
            gestión para <span className="font-semibold text-gray-800">{associationName}</span>,
            incluyendo sus módulos de personas, eventos, finanzas, documentos,
            mensajería y ajustes internos.
          </p>
          <p>
            El acceso queda reservado a las personas autorizadas por la
            asociación. Cada usuario debe utilizar la plataforma exclusivamente
            para fines organizativos, administrativos o de coordinación interna,
            respetando la normativa aplicable y las políticas aprobadas por la
            entidad.
          </p>
          <ul className="space-y-2">
            <li>El alta, edición y baja de accesos debe quedar bajo control de administración.</li>
            <li>La información registrada debe ser veraz, actualizada y pertinente.</li>
            <li>El uso en modo invitado se considera temporal y de demostración.</li>
          </ul>
        </div>
      </SectionBlock>

      <SectionBlock
        title="Condiciones de uso"
        subtitle="Obligaciones mínimas para operar de forma segura y ordenada"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">
              Usos permitidos
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>Gestionar socios, colaboradores, eventos y documentos internos.</li>
              <li>Registrar movimientos contables vinculados a la actividad de la asociación.</li>
              <li>Preparar campañas de comunicación usando los remitentes autorizados.</li>
              <li>Exportar datos cuando exista necesidad operativa o de respaldo.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">
              Restricciones esenciales
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>No compartir credenciales ni reutilizar accesos de terceras personas.</li>
              <li>No introducir datos ilícitos, inexactos o ajenos a la actividad asociativa.</li>
              <li>No enviar comunicaciones masivas sin base legítima ni revisión previa.</li>
              <li>No manipular registros, permisos o evidencias fuera de las funciones autorizadas.</li>
            </ul>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock
        title="Roles y responsabilidades"
        subtitle="Distribución práctica de funciones dentro del sistema"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ROLE_GUIDELINES.map((item) => (
            <div
              key={item.role}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.tone}`}
              >
                {item.role}
              </span>
              <p className="mt-3 text-sm text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        title="Disponibilidad, soporte y cambios"
        subtitle="Cómo se gestionan incidencias, continuidad y modificaciones"
      >
        <div className="space-y-4 text-sm leading-7 text-gray-600">
          <p>
            Kora opera sobre el navegador y el almacenamiento local configurado
            para la asociación. Por ello, la continuidad del servicio depende
            del equipo utilizado, de la integridad del navegador y de la
            correcta administración de las copias de seguridad.
          </p>
          <p>
            La asociación debe revisar periódicamente los accesos, exportar los
            datos críticos cuando sea necesario y mantener actualizados los
            remitentes, políticas de seguridad y responsables internos.
          </p>
          <p>
            Cualquier cambio relevante en flujos, permisos o condiciones de uso
            debe comunicarse a los usuarios afectados antes de su entrada en
            vigor. En caso de duda, la versión aprobada por la entidad será la
            que prevalezca sobre este modelo base.
          </p>
        </div>
      </SectionBlock>

      <SectionBlock
        title="Datos de referencia"
        subtitle="Información que conviene reflejar en la versión final del documento"
        actions={
          <Link
            href="/settings/association"
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
          >
            Editar perfil de asociación
          </Link>
        }
      >
        <dl className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Asociación
            </dt>
            <dd className="mt-2 text-sm font-semibold text-gray-900">
              {associationName}
            </dd>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Modo de uso
            </dt>
            <dd className="mt-2 text-sm font-semibold text-gray-900">
              {mode === "guest" ? "Invitado / temporal" : "Autenticado"}
            </dd>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Correo de contacto
            </dt>
            <dd className="mt-2 text-sm font-semibold text-gray-900">
              {associationEmail}
            </dd>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Ubicación declarada
            </dt>
            <dd className="mt-2 text-sm font-semibold text-gray-900">
              {associationLocation}
            </dd>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Responsable de referencia
            </dt>
            <dd className="mt-2 text-sm font-semibold text-gray-900">
              {representative
                ? `${representative.role || "Representante"}: ${representative.name}`
                : "Pendiente de indicar un responsable o representante."}
            </dd>
          </div>
        </dl>
      </SectionBlock>
    </div>
  );
}
