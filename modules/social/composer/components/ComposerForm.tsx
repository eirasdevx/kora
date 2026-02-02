"use client";

import { ChangeEvent } from "react";
import { useSocialComposerStore } from "../composer.store";
import { PLATFORM_LABELS, SocialPlatform } from "../composer.types";

const MAX_X = 280;
const RECOMMENDED = 2200;

function isVideo(url: string) {
  return url.startsWith("data:video");
}

export default function ComposerForm() {
  const draft = useSocialComposerStore((s) => s.draft);
  const setPlatform = useSocialComposerStore((s) => s.setPlatform);
  const setCaption = useSocialComposerStore((s) => s.setCaption);
  const setLink = useSocialComposerStore((s) => s.setLink);
  const addMediaUrls = useSocialComposerStore((s) => s.addMediaUrls);
  const removeMediaUrl = useSocialComposerStore((s) => s.removeMediaUrl);

  const captionLength = draft.caption.length;
  const xRemaining = MAX_X - captionLength;

  const handleMediaChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const readers = files.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ""));
          reader.readAsDataURL(file);
        })
    );
    const urls = (await Promise.all(readers)).filter(Boolean);
    addMediaUrls(urls);
    event.target.value = "";
  };

  const showLinkFields =
    draft.platform === "facebook" || draft.platform === "x";

  const platforms: SocialPlatform[] = ["instagram", "facebook", "x", "tiktok"];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
          Cuentas seleccionadas
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {platforms.map((platform) => {
            const active = draft.platform === platform;
            return (
              <button
                key={platform}
                type="button"
                onClick={() => setPlatform(platform)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {PLATFORM_LABELS[platform]}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
            Texto principal
          </p>
          <div className="text-xs text-gray-400">
            {draft.platform === "x" ? (
              <span
                className={xRemaining < 0 ? "text-red-500" : "text-gray-500"}
              >
                {captionLength}/{MAX_X}
              </span>
            ) : (
              <span>
                {captionLength}/{RECOMMENDED} recomendado
              </span>
            )}
          </div>
        </div>
        <textarea
          value={draft.caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="¿Qué quieres compartir hoy?"
          className="mt-4 min-h-[140px] w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
        />
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
              onChange={handleMediaChange}
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
            {draft.mediaUrls.length === 0 ? (
              <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-400">
                Vista previa de archivos
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {draft.mediaUrls.slice(0, 4).map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                  >
                    <button
                      type="button"
                      onClick={() => removeMediaUrl(index)}
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

      {showLinkFields && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
            Enlace opcional
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4">
            <input
              value={draft.link?.url ?? ""}
              onChange={(e) =>
                setLink({
                  url: e.target.value,
                  title: draft.link?.title ?? "",
                  description: draft.link?.description ?? "",
                })
              }
              placeholder="https://tu-enlace.com"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                value={draft.link?.title ?? ""}
                onChange={(e) =>
                  setLink({
                    url: draft.link?.url ?? "",
                    title: e.target.value,
                    description: draft.link?.description ?? "",
                  })
                }
                placeholder="Título del enlace"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
              <input
                value={draft.link?.description ?? ""}
                onChange={(e) =>
                  setLink({
                    url: draft.link?.url ?? "",
                    title: draft.link?.title ?? "",
                    description: e.target.value,
                  })
                }
                placeholder="Descripción breve"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
