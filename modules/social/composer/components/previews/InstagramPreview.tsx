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

export default function InstagramPreview({ draft, text }: Props) {
  const media = draft.mediaUrls[0];
  const isStory = draft.variant === "story" || draft.variant === "reel";
  const ratioClass = isStory ? "aspect-[9/16]" : "aspect-square";

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-orange-400 text-sm font-semibold text-white">
          K
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">kora_asociacion</p>
          <p className="text-xs text-gray-400">Barcelona · Hace 2 h</p>
        </div>
      </div>

      <div className={`relative w-full ${ratioClass} bg-gray-100`}>
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
            <span className="text-xs font-semibold text-gray-500">
              Sin multimedia
            </span>
          </div>
        )}
        {draft.mediaUrls.length > 1 && (
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
            1/{draft.mediaUrls.length}
          </div>
        )}
      </div>

      <div className="space-y-2 px-4 py-4 text-sm text-gray-700">
        <div className="flex items-center gap-3 text-gray-500">
          <span>♡</span>
          <span>💬</span>
          <span>➤</span>
        </div>
        <p className="text-sm text-gray-800">{text || "Escribe un mensaje..."}</p>
      </div>
    </div>
  );
}
