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

export default function XPreview({ draft, text }: Props) {
  const media = draft.mediaUrls[0];
  const aspectClass = "aspect-[16/9]";

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
          K
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-gray-900">Kora</span>
            <span className="text-gray-400">@kora_asociacion</span>
            <span className="text-gray-400">· 1h</span>
          </div>
          <p className="mt-2 text-sm text-gray-700">
            {text || "Escribe un mensaje..."}
          </p>
          <div
            className={`mt-3 overflow-hidden rounded-2xl border border-gray-200 ${aspectClass}`}
          >
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

          {draft.link?.url && (
            <div className="mt-3 rounded-2xl border border-gray-200 p-3 text-xs text-gray-500">
              <p className="uppercase">{draft.link.url}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {draft.link.title || "Título del enlace"}
              </p>
              <p className="text-xs text-gray-500">
                {draft.link.description || "Descripción breve del enlace"}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-around border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
        <span>💬</span>
        <span>🔁</span>
        <span>♡</span>
        <span>↗</span>
      </div>
    </div>
  );
}
