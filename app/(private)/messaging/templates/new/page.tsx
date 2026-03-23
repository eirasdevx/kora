"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import { moduleTopbarButtonStyles } from "@/components/shared/ModuleTopbar";
import { useSessionStore } from "@/core/session/session.store";
import { useMessagingStore } from "@/modules/messaging/messaging.store";
import {
  type MessageTemplate,
  type MessagingChannel,
} from "@/modules/messaging/messaging.types";

const VARIABLE_GROUPS = [
  {
    label: "Usuario",
    tokens: ["{nombre_socio}", "{apellido_socio}", "{email_usuario}"],
  },
  {
    label: "Evento / Fecha",
    tokens: ["{nombre_evento}", "{fecha_evento}", "{hora_inicio}"],
  },
  {
    label: "Financiero",
    tokens: ["{monto_deuda}", "{ultimo_pago}"],
  },
];

const applyPreviewVariables = (value: string) => {
  const replacements: Record<string, string> = {
    "{nombre_socio}": "María",
    "{apellido_socio}": "López",
    "{email_usuario}": "maria@asociacion.org",
    "{nombre_evento}": "Asamblea General",
    "{fecha_evento}": "15/10/2026",
    "{hora_inicio}": "19:30",
    "{monto_deuda}": "25 EUR",
    "{ultimo_pago}": "02/09/2026",
  };
  return Object.entries(replacements).reduce(
    (acc, [token, replacement]) => acc.replaceAll(token, replacement),
    value
  );
};

function TemplateEditor({
  activeTemplate,
  onSave,
}: {
  activeTemplate?: MessageTemplate;
  onSave: (payload: {
    title: string;
    channel: MessagingChannel;
    subject: string;
    html: string;
  }) => void;
}) {
  const [title, setTitle] = useState(activeTemplate?.title ?? "");
  const [channel] = useState<MessagingChannel>("email");
  const [subject, setSubject] = useState(activeTemplate?.subject ?? "");
  const [html, setHtml] = useState(activeTemplate?.html ?? "");
  const [error, setError] = useState<string | null>(null);

  const previewHtml = useMemo(() => applyPreviewVariables(html), [html]);

  const handleSave = () => {
    setError(null);
    if (!title.trim()) {
      setError("Ingresa el nombre de la plantilla.");
      return;
    }
    if (!subject.trim()) {
      setError("Ingresa el asunto del correo.");
      return;
    }
    if (!html.trim()) {
      setError("Ingresa el contenido del mensaje.");
      return;
    }

    onSave({
      title: title.trim(),
      channel,
      subject: subject.trim(),
      html: html.trim(),
    });
  };

  const insertToken = (token: string) => {
    setHtml((prev) => `${prev}${prev ? " " : ""}${token}`);
  };
  const pageTitle = activeTemplate ? "Editar plantilla" : "Crear nueva plantilla";

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        subtitle="Plantillas, campañas y comunicaciones personalizadas."
        backHref="/messaging"
        backLabel="Volver a Mensajería"
        actions={
          <button
            type="button"
            onClick={handleSave}
            className={moduleTopbarButtonStyles.primary}
          >
            Guardar plantilla
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[22px] text-primary">
                info
              </span>
              <h2 className="text-lg font-semibold text-slate-900">
                Información básica
              </h2>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Nombre de la plantilla
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ej: Recordatorio de pago"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Canal de envío
                </label>
                <div className="mt-2 rounded-2xl border border-primary bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
                  Email
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  Asunto (email)
                </label>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Asunto del correo"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Cuerpo del mensaje
              </h2>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Editor HTML
              </span>
            </div>
            <textarea
              value={html}
              onChange={(event) => setHtml(event.target.value)}
              placeholder="Escribe el mensaje en HTML"
              className="mt-4 min-h-[200px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
            />
            <p className="mt-2 text-xs text-slate-400">
              Usa variables dinámicas para personalizar el contenido.
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          ) : null}
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Variables dinámicas
            </h3>
            <div className="mt-4 space-y-4">
              {VARIABLE_GROUPS.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.tokens.map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => insertToken(token)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Haz clic en una variable para insertarla en el mensaje.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Vista previa rápida
            </h3>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="text-xs font-semibold text-slate-400">
                {subject || "Asunto sin definir"}
              </p>
              <div
                className="prose prose-sm mt-3 max-w-none"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function NewTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = useSessionStore((s) => s.mode);
  const templateId = searchParams.get("id");
  const { templates, addTemplate, updateTemplate } = useMessagingStore();
  const activeTemplate = templates.find((item) => item.id === templateId);

  if (mode === "guest") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Crear nueva plantilla"
          subtitle="Plantillas, campañas y comunicaciones personalizadas."
          backHref="/dashboard"
          backLabel="Volver al panel"
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <span className="material-symbols-outlined text-[24px]">info</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Plantillas no disponibles en modo invitado
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Inicia sesión para crear o editar contenido de mensajería.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TemplateEditor
      key={activeTemplate?.id ?? "new-template"}
      activeTemplate={activeTemplate}
      onSave={({ title, channel, subject, html }) => {
        if (activeTemplate) {
          updateTemplate(activeTemplate.id, {
            title,
            channel,
            subject,
            html,
          });
        } else {
          addTemplate({
            title,
            channel,
            subject,
            html,
          });
        }

        router.push("/messaging");
      }}
    />
  );
}
