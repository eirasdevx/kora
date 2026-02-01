"use client";

import { useState } from "react";

interface Props {
  onCancel: () => void;
  onSubmit?: (
    data: {
      content: string;
      channels: string[];
      scheduledAt?: string;
    },
    action: "draft" | "publish" | "schedule"
  ) => void;
}

const ACCOUNTS = [
  { id: "Instagram", label: "Instagram (@kora_asoc)", active: true },
  { id: "Facebook", label: "Facebook Page", active: false },
  { id: "X", label: "X (Twitter)", active: false },
];

export default function SocialPostForm({ onCancel, onSubmit }: Props) {
  const [content, setContent] = useState("");
  const [selectedChannels, setSelectedChannels] = useState(
    ACCOUNTS.filter((a) => a.active).map((a) => a.id)
  );
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const scheduledAt =
    scheduleDate && scheduleTime
      ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
      : undefined;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const submitter = (e.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        const action =
          (submitter?.value as "draft" | "publish" | "schedule") ??
          "draft";
        onSubmit?.(
          {
            content,
            channels: selectedChannels,
            scheduledAt,
          },
          action
        );
      }}
      className="w-full max-w-4xl mx-auto overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50 px-6 py-5">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Crear publicación
          </h2>
          <p className="text-sm text-gray-500">
            Diseña y programa tus publicaciones.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100"
          aria-label="Cerrar"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 6l12 12M18 6l-12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="space-y-4 bg-white px-6 py-5">
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
            Cuentas seleccionadas
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ACCOUNTS.map((account) => {
              const active = selectedChannels.includes(account.id);
              return (
              <button
                key={account.id}
                type="button"
                onClick={() =>
                  setSelectedChannels((prev) =>
                    prev.includes(account.id)
                      ? prev.filter((item) => item !== account.id)
                      : [...prev, account.id]
                  )
                }
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {account.id.slice(0, 1)}
                </span>
                {account.label}
              </button>
            );
            })}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-dashed border-gray-300 px-4 py-2 text-sm font-semibold text-gray-500"
            >
              + Añadir cuenta
            </button>
          </div>
        </section>

        <section className="border-t border-gray-100 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
            Contenido del post
          </p>
          <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[140px] w-full bg-transparent text-sm text-gray-700 outline-none"
              placeholder="¿Qué quieres compartir hoy? Usa @mentions y #hashtags para mayor alcance..."
            />
            <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white">
                  🙂
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white">
                  @
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white">
                  #
                </span>
              </div>
              <span>{content.length} / 2200</span>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
            Multimedia
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 transition hover:border-primary/40">
              <input type="file" className="sr-only" multiple />
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-lg">
                +
              </div>
              <p className="mt-3 font-semibold text-gray-700">
                Subir fotos o videos
              </p>
              <p className="text-xs text-gray-400">
                o arrastra y suelta aquí
              </p>
            </label>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <div className="flex h-full items-center justify-center bg-gradient-to-r from-emerald-700 to-orange-400 p-6 text-center text-white">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em]">
                    Upcoming
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    Community Workshop
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-100 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
            Opciones de programación
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Fecha
              </label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Hora
              </label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20"
            />
            Publicar inmediatamente si no se programa.
          </label>
        </section>
      </div>

      {/* Footer */}
      <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-6 py-2 text-sm font-medium text-gray-600 transition hover:bg-white"
        >
          Cancelar
        </button>
        <button
          type="submit"
          value="draft"
          className="rounded-xl border border-gray-200 bg-white px-6 py-2 text-sm font-semibold text-gray-700 shadow-sm"
        >
          Guardar borrador
        </button>
        <button
          type="submit"
          value={scheduledAt ? "schedule" : "publish"}
          className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
        >
          Publicar ahora
        </button>
      </div>
    </form>
  );
}
