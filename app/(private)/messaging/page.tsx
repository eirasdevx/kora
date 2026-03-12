"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import ModuleTopbar, {
  moduleTopbarButtonIconStyles,
  moduleTopbarButtonStyles,
} from "@/components/shared/ModuleTopbar";
import { useLocale } from "@/core/i18n/use-locale";
import { useSessionStore } from "@/core/session/session.store";
import { useMessagingStore } from "@/modules/messaging/messaging.store";
import { MessageTemplate } from "@/modules/messaging/messaging.types";

const CHANNEL_BADGE: Record<string, string> = {
  email: "bg-blue-50 text-blue-600",
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
};

const formatDateTime = (value: string, locale: string) =>
  new Date(value).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

const MESSAGING_MODULE_TITLE = "Mensajer\u00eda";
const MESSAGING_MODULE_DESCRIPTION =
  "Plantillas, campa\u00f1as y comunicaciones personalizadas.";

export default function MessagingPage() {
  const { formatLocale } = useLocale();
  const mode = useSessionStore((s) => s.mode);
  const { templates, removeTemplate } = useMessagingStore();
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<MessageTemplate | null>(
    null
  );
  const [confirmDeleteFinal, setConfirmDeleteFinal] =
    useState<MessageTemplate | null>(null);

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
  const sortedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  }, [filteredTemplates]);
  const totalTemplates = templates.length;
  const lastTemplateUpdate = useMemo(() => {
    const latest = [...templates].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    )[0];
    return latest?.updatedAt;
  }, [templates]);
  const channelSummary = useMemo(() => {
    const counts = templates.reduce<Record<string, number>>((acc, item) => {
      acc[item.channel] = (acc[item.channel] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [templates]);
  const mainChannel = channelSummary[0]?.[0] ?? "email";
  const mainChannelCount = channelSummary[0]?.[1] ?? 0;

  const confirmDeleteLabel =
    confirmDelete?.title?.trim() || "esta plantilla";

  const handleDeleteTemplate = (template: MessageTemplate) => {
    setConfirmDelete(template);
  };

  if (mode === "guest") {
    return (
      <div className="space-y-6">
        <ModuleTopbar
          module={MESSAGING_MODULE_TITLE}
          title="Centro de mensajes"
          description={MESSAGING_MODULE_DESCRIPTION}
          actions={
            <Link
              href="/dashboard"
              className={moduleTopbarButtonStyles.secondary}
            >
              Volver al panel
            </Link>
          }
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <span className="material-symbols-outlined text-[24px]">info</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Mensajeria no disponible en modo invitado
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Inicia sesion para crear plantillas y enviar comunicaciones.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleTopbar
        module={MESSAGING_MODULE_TITLE}
        title="Centro de mensajes"
        description={MESSAGING_MODULE_DESCRIPTION}
        actions={
          <>
            <Link
              href="/settings/messaging"
              className={moduleTopbarButtonStyles.secondary}
            >
              Configurar remitente
            </Link>
            <Link
              href="/messaging/templates/new"
              className={moduleTopbarButtonStyles.primary}
            >
              <span className={moduleTopbarButtonIconStyles.add}>
                <span className="material-symbols-outlined text-[14px]">
                  add
                </span>
              </span>
              Nueva plantilla
            </Link>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Plantillas totales
          </p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {totalTemplates}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Ultima actualizacion:{" "}
            {lastTemplateUpdate
              ? formatDateTime(lastTemplateUpdate, formatLocale)
              : "-"}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Canal principal
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                CHANNEL_BADGE[mainChannel] ?? "bg-slate-100 text-slate-600"
              }`}
            >
              {CHANNEL_LABEL[mainChannel] ?? "Email"}
            </span>
            <span className="text-sm text-slate-500">
              {mainChannelCount} plantillas
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Canales activos: {channelSummary.length}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Acciones rapidas
          </p>
          <div className="mt-4 grid gap-2">
            <Link
              href="/messaging/templates/new"
              className="inline-flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Crear plantilla
              <span className="material-symbols-outlined text-[16px]">
                add
              </span>
            </Link>
            <Link
              href="/messaging/bulk"
              className="inline-flex items-center justify-between rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90"
            >
              Iniciar campana
              <span className="material-symbols-outlined text-[16px]">
                send
              </span>
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Tip: usa variables como {"{nombre_socio}"} en tus mensajes.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Plantillas
            </h2>
            <p className="text-sm text-slate-500">
              {sortedTemplates.length} resultados en biblioteca
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

        {sortedTemplates.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            No hay plantillas disponibles. Crea la primera desde arriba.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedTemplates.map((template) => (
              <div
                key={template.id}
                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      CHANNEL_BADGE[template.channel] ??
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {CHANNEL_LABEL[template.channel] ?? template.channel}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDateTime(template.updatedAt, formatLocale)}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-900">
                  {template.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                  {template.subject || "Asunto sin definir"}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <Link
                    href={`/messaging/templates/new?id=${template.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(template)}
                    className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Eliminar plantilla?"
      >
        <p className="mb-6">
          Seguro que quieres eliminar <strong>{confirmDeleteLabel}</strong>?
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDelete(null)}
            className="px-4 py-2 border rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (confirmDelete) {
                setConfirmDeleteFinal(confirmDelete);
              }
              setConfirmDelete(null);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            Si, eliminar
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!confirmDeleteFinal}
        onClose={() => setConfirmDeleteFinal(null)}
        title="Confirmacion final"
      >
        <p className="mb-6 text-red-600 font-medium">
          Esta accion no se puede deshacer.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmDeleteFinal(null)}
            className="px-4 py-2 border rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (confirmDeleteFinal) {
                removeTemplate(confirmDeleteFinal.id);
              }
              setConfirmDeleteFinal(null);
            }}
            className="px-4 py-2 bg-red-700 text-white rounded-lg"
          >
            Eliminar definitivamente
          </button>
        </div>
      </Modal>
    </div>
  );
}
