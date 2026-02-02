"use client";

import { SocialPostDraft } from "../../composer.types";

interface Props {
  draft: SocialPostDraft;
  text: string;
}

const mediaPlaceholder =
  "bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300";

function isVideo(url: string) {
  return url.startsWith("data:video");
}

export default function FacebookPreview({ draft, text }: Props) {
  const media = draft.mediaUrls[0];
  const isLink = Boolean(draft.link?.url);

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          K
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Kora Asociación</p>
          <p className="text-xs text-gray-400">Hace 1 h · Público</p>
        </div>
      </div>

      <div className="px-4 py-3 text-sm text-gray-700">
        {text || "Escribe un mensaje..."}
      </div>

      {isLink && draft.link?.url ? (
        <div className="border-t border-gray-100">
          <div className="aspect-[1.91/1] w-full bg-gray-100">
            {media ? (
              isVideo(media) ? (
                <video
                  src={media}
                  className="h-full w-full object-cover"
                  controls
                />
              ) : (
                <img
                  src={media}
                  alt="Media"
                  className="h-full w-full object-cover"
                />
              )
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center ${mediaPlaceholder}`}
              >
                <span className="text-xs font-semibold text-gray-600">
                  Vista previa de enlace
                </span>
              </div>
            )}
          </div>
          <div className="px-4 py-3 text-xs text-gray-500">
            <p className="uppercase">{draft.link?.url}</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {draft.link?.title || "Título del enlace"}
            </p>
            <p className="text-xs text-gray-500">
              {draft.link?.description || "Descripción breve del enlace"}
            </p>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-100">
          <div className="aspect-[4/5] w-full bg-gray-100">
            {media ? (
              isVideo(media) ? (
                <video
                  src={media}
                  className="h-full w-full object-cover"
                  controls
                />
              ) : (
                <img
                  src={media}
                  alt="Media"
                  className="h-full w-full object-cover"
                />
              )
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center ${mediaPlaceholder}`}
              >
                <span className="text-xs font-semibold text-gray-600">
                  Sin multimedia
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
        <span>👍 Me gusta</span>
        <span>💬 Comentar</span>
        <span>↗ Compartir</span>
      </div>
    </div>
  );
}
