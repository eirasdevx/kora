"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import PageTopbar from "@/components/PageTopbar";
import { useMessagingStore } from "@/modules/messaging/messaging.store";
import { MessagingChannel } from "@/modules/messaging/messaging.types";

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
    "{nombre_socio}": "Maria",
    "{apellido_socio}": "Lopez",
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

export default function NewTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("id");
  const { templates, addTemplate, updateTemplate } = useMessagingStore();
  const activeTemplate = templates.find((item) => item.id === templateId);

  const [title, setTitle] = useState(activeTemplate?.title ?? "");
  const [channel] = useState<MessagingChannel>("email");
  const [subject, setSubject] = useState(activeTemplate?.subject ?? "");
  const [html, setHtml] = useState(activeTemplate?.html ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeTemplate) return;
    setTitle(activeTemplate.title);
    // Solo email en esta version.
    setSubject(activeTemplate.subject);
    setHtml(activeTemplate.html);
  }, [activeTemplate]);

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

    if (activeTemplate) {
      updateTemplate(activeTemplate.id, {
        title: title.trim(),
        channel,
        subject: subject.trim(),
        html: html.trim(),
      });
    } else {
      addTemplate({
        title: title.trim(),
        channel,
        subject: subject.trim(),
        html: html.trim(),
      });
    }

    router.push("/messaging");
  };

  const insertToken = (token: string) => {
    setHtml((prev) => `${prev}${prev ? " " : ""}${token}`);
  };

  return (
    <div className="space-y-6">
      <PageTopbar>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Plantillas / Nueva plantilla
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Crear nueva plantilla
            </h1>
            <p className="text-sm text-slate-500">
              Disena el contenido para envios masivos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/messaging"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </Link>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90"
            >
              Guardar plantilla
            </button>
          </div>
        </div>
      </PageTopbar>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[22px] text-primary">
                info
              </span>
              <h2 className="text-lg font-semibold text-slate-900">
                Informacion basica
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
                  Canal de envio
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
              Usa variables dinamicas para personalizar el contenido.
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
              Variables dinamicas
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
              Vista previa rapida
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
