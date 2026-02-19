"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageTopbar from "@/components/PageTopbar";
import { useMessagingStore } from "@/modules/messaging/messaging.store";
import { MessageTemplate } from "@/modules/messaging/messaging.types";

const CHANNEL_BADGE: Record<string, string> = {
  email: "bg-blue-50 text-blue-600",
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
};

export default function MessagingPage() {
  const { templates, removeTemplate } = useMessagingStore();
  const [search, setSearch] = useState("");
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(
    templates[0]?.id ?? null
  );

  useEffect(() => {
    if (!activeTemplateId && templates[0]) {
      setActiveTemplateId(templates[0].id);
    }
  }, [templates, activeTemplateId]);

  const filteredTemplates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return templates;
    return templates.filter((template) =>
      [template.title, template.channel, template.subject]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [templates, search]);

  const activeTemplate = useMemo(
    () => templates.find((item) => item.id === activeTemplateId) ?? null,
    [templates, activeTemplateId]
  );

  const handleDeleteTemplate = (template: MessageTemplate) => {
    const confirmed = window.confirm(
      `Eliminar la plantilla "${template.title}"?`
    );
    if (!confirmed) return;
    removeTemplate(template.id);
    if (template.id === activeTemplateId) {
      setActiveTemplateId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageTopbar>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Mensajeria
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Biblioteca de Plantillas
            </h1>
            <p className="text-sm text-slate-500">
              Gestiona plantillas y mensajes predefinidos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/messaging/templates/new"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90"
            >
              + Nueva plantilla
            </Link>
          </div>
        </div>
      </PageTopbar>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Biblioteca de plantillas
              </h2>
              <p className="text-sm text-slate-500">
                Crea y administra mensajes predefinidos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                <span className="material-symbols-outlined text-[18px] text-slate-400">
                  search
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar plantilla..."
                  className="w-52 bg-transparent text-sm text-slate-700 outline-none"
                />
              </div>
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Filtros
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.4fr] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <span>Titulo</span>
              <span>Canal</span>
              <span>Actualizado</span>
              <span className="text-right">Acciones</span>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredTemplates.length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-500">
                  No hay plantillas disponibles.
                </div>
              ) : (
                filteredTemplates.map((template) => {
                  const isActive = template.id === activeTemplateId;
                  return (
                    <div
                      key={template.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveTemplateId(template.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setActiveTemplateId(template.id);
                        }
                      }}
                      className={`grid cursor-pointer grid-cols-[1.4fr_0.7fr_0.7fr_0.4fr] gap-4 px-5 py-4 text-sm outline-none transition ${
                        isActive ? "bg-primary/5" : "bg-white"
                      } focus-visible:ring-2 focus-visible:ring-primary/40`}
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {template.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          ID: {template.id}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${CHANNEL_BADGE[template.channel]}`}
                        >
                          {CHANNEL_LABEL[template.channel]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(template.updatedAt).toLocaleString("es-ES", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/messaging/templates/new?id=${template.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteTemplate(template);
                          }}
                          className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {activeTemplate ? (
            <div className="flex h-full flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                    Previsualizacion
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">
                    {activeTemplate.title}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {activeTemplate.subject || "Asunto sin definir"}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Actualizado:{" "}
                    {new Date(activeTemplate.updatedAt).toLocaleString(
                      "es-ES",
                      {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }
                    )}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${CHANNEL_BADGE[activeTemplate.channel]}`}
                >
                  {CHANNEL_LABEL[activeTemplate.channel]}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {activeTemplate.html ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: activeTemplate.html,
                    }}
                  />
                ) : (
                  <p className="text-slate-500">
                    Esta plantilla no tiene contenido.
                  </p>
                )}
              </div>

              <div className="mt-auto flex gap-2">
                <Link
                  href={`/messaging/bulk?templateId=${activeTemplate.id}`}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ir a enviar
                </Link>
                <button
                  type="button"
                  onClick={() => handleDeleteTemplate(activeTemplate)}
                  className="flex-1 rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Selecciona una plantilla para ver la previsualizacion.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
