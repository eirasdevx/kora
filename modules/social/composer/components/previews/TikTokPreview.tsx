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

export default function TikTokPreview({ draft, text }: Props) {
  const media = draft.mediaUrls[0];

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-black shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 text-xs text-white/70">
        <span>Para ti</span>
        <span>Siguiendo</span>
      </div>
      <div className="relative aspect-[9/16] w-full bg-black">
        {media ? (
          isVideo(media) ? (
            <video
              src={media}
              className="h-full w-full object-cover"
              controls
            />
          ) : (
            <img src={media} alt="Media" className="h-full w-full object-cover" />
          )
        ) : (
          <div className={`flex h-full w-full items-center justify-center ${mediaPlaceholder}`}>
            <span className="text-xs font-semibold text-gray-700">
              Sin multimedia
            </span>
          </div>
        )}
        <div className="absolute bottom-4 left-4 right-16 space-y-2 text-xs text-white">
          <p className="font-semibold">@kora_asociacion</p>
          <p className="text-white/90">{text || "Escribe un mensaje..."}</p>
        </div>
        <div className="absolute bottom-6 right-4 flex flex-col items-center gap-4 text-white">
          <div className="h-10 w-10 rounded-full bg-white/20" />
          <div className="text-center text-[10px]">12.4k</div>
          <div className="text-center text-[10px]">432</div>
          <div className="text-center text-[10px]">Compartir</div>
        </div>
      </div>
    </div>
  );
}
