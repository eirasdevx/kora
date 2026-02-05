"use client";

import { useState } from "react";
import { SocialPost } from "./social.types";

interface Props {
  initialData?: SocialPost;
  onCancel: () => void;
  onSubmit?: (
    data: {
      content: string;
      channels: string[];
      mediaUrls?: string[];
      scheduledAt?: string;
    },
    action: "draft" | "publish" | "schedule"
  ) => void;
  onDelete?: () => void;
}

const ACCOUNTS = [
  { id: "Instagram", label: "Instagram" },
  { id: "Facebook", label: "Facebook" },
  { id: "X", label: "X" },
  { id: "TikTok", label: "TikTok" },
];

function isVideo(url: string) {
  return url.startsWith("data:video");
}

function getAspectClass(channel: string) {
  if (channel === "TikTok") return "aspect-[9/16]";
  if (channel === "Instagram") return "aspect-square";
  if (channel === "Facebook") return "aspect-[4/5]";
  return "aspect-[16/9]";
}

export default function SocialPostForm({
  initialData,
  onCancel,
  onSubmit,
  onDelete,
}: Props) {
  const [content, setContent] = useState(initialData?.content ?? "");
  const [selectedChannels, setSelectedChannels] = useState(
    initialData?.channels?.length ? initialData.channels : ["Instagram"]
  );
  const [previewChannel, setPreviewChannel] = useState(
    initialData?.channels?.[0] ?? "Instagram"
  );
  const [scheduleDate, setScheduleDate] = useState(
    initialData?.scheduledAt ? initialData.scheduledAt.slice(0, 10) : ""
  );
  const [scheduleTime, setScheduleTime] = useState(
    initialData?.scheduledAt ? initialData.scheduledAt.slice(11, 16) : ""
  );
  const [mediaUrls, setMediaUrls] = useState<string[]>(
    initialData?.mediaUrls ?? []
  );

  const scheduledAt =
    scheduleDate && scheduleTime
      ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
      : undefined;
  const canSchedule = Boolean(scheduledAt);

  const isEditing = Boolean(initialData);
  const previewText = content.trim()
    ? content.trim()
    : "Escribe un mensaje para ver la vista previa...";

  const handleRemoveMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        let action =
          (submitter?.value as "draft" | "publish" | "schedule") ?? "draft";
        if (action === "schedule" && !canSchedule) action = "draft";
        onSubmit?.(
          {
            content,
            channels: selectedChannels,
            mediaUrls,
            scheduledAt,
          },
          action
        );
      }}
      className="space-y-6"
    >
      <header className="flex flex-col gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50"
            aria-label="Volver"
          >
            &lt;
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">
            {isEditing ? "Editar Publicación" : "Crear Publicación"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            value="draft"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm"
          >
            Guardar Borrador
          </button>
          <button
            type="submit"
            value="schedule"
            disabled={!canSchedule}
            className={`rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition ${
              canSchedule
                ? "text-gray-600 hover:bg-gray-50"
                : "cursor-not-allowed text-gray-300 opacity-60"
            }`}
          >
            Programar
          </button>
          <button
            type="submit"
            value="publish"
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
          >
            Publicar ahora
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-100"
            >
              Eliminar
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
              Cuentas seleccionadas
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {ACCOUNTS.map((account) => {
                const active = selectedChannels.includes(account.id);
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => {
                      const nextSelected = active
                        ? selectedChannels.filter((item) => item !== account.id)
                        : [...selectedChannels, account.id];

                      setSelectedChannels(nextSelected);

                      if (nextSelected.length === 0) return;

                      if (active && previewChannel === account.id) {
                        setPreviewChannel(nextSelected[0]);
                        return;
                      }

                      if (!active && nextSelected.length === 1) {
                        setPreviewChannel(account.id);
                        return;
                      }

                      if (!nextSelected.includes(previewChannel)) {
                        setPreviewChannel(nextSelected[0]);
                      }
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {account.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
              Contenido del post
            </p>
            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[180px] w-full bg-transparent text-sm text-gray-700 outline-none"
                placeholder="¿Qué quieres compartir hoy?"
              />
              <div className="mt-4 flex items-center justify-end text-sm text-gray-400">
                <span>{content.length} / 2200</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
              Programación
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Fecha
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Hora
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Completa fecha y hora para programar la publicación.
            </p>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
              Multimedia
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 transition hover:border-primary/40">
                <input
                  type="file"
                  className="sr-only"
                  multiple
                  accept="image/*,video/*"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (!files.length) return;
                    const readers = files.map(
                      (file) =>
                        new Promise<string>((resolve) => {
                          const reader = new FileReader();
                          reader.onload = () => {
                            resolve(String(reader.result ?? ""));
                          };
                          reader.readAsDataURL(file);
                        })
                    );
                    const urls = (await Promise.all(readers)).filter(Boolean);
                    setMediaUrls((prev) => [...prev, ...urls]);
                    e.target.value = "";
                  }}
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-lg">
                  +
                </div>
                <p className="mt-3 font-semibold text-gray-700">
                  Subir fotos o videos
                </p>
                <p className="text-xs text-gray-400">o arrastra y suelta aquí</p>
              </label>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                {mediaUrls.length === 0 ? (
                  <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-400">
                    Vista previa de archivos
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {mediaUrls.slice(0, 4).map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(index)}
                          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm font-semibold text-gray-700 shadow-sm hover:bg-white"
                          aria-label="Eliminar archivo"
                        >
                          ×
                        </button>
                        {isVideo(url) ? (
                          <video
                            src={url}
                            className="h-24 w-full object-cover"
                            controls
                          />
                        ) : (
                          <img
                            src={url}
                            alt="Vista previa"
                            className="h-24 w-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
              Vista previa dinámica
            </p>
            {selectedChannels.length === 0 ? (
              <div className="mt-4 text-xs text-gray-400">
                Selecciona al menos una red social.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="mx-auto max-w-[360px]">
                  <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    {selectedChannels.map((channel) => (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => setPreviewChannel(channel)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          previewChannel === channel
                            ? "border-primary bg-white text-primary shadow-sm"
                            : "border-transparent text-gray-500 hover:bg-white"
                        }`}
                      >
                        {channel}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mx-auto max-w-[360px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm text-gray-600">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      K
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        kora_asociacion
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Vista en {previewChannel}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-full ${getAspectClass(
                      previewChannel
                    )} bg-gray-100`}
                  >
                    {mediaUrls.length === 0 ? (
                      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                        Sin vista previa multimedia
                      </div>
                    ) : isVideo(mediaUrls[0]) ? (
                      <video
                        src={mediaUrls[0]}
                        className="h-full w-full object-cover"
                        controls
                      />
                    ) : (
                      <img
                        src={mediaUrls[0]}
                        alt="Vista previa"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="space-y-2 px-4 py-4 text-sm text-gray-700">
                    <p className="text-sm text-gray-800">{previewText}</p>
                    <p className="text-xs text-gray-400">Hace 2 minutos</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
    </form>
  );
}
