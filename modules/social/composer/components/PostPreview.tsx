"use client";

import type { ReactElement } from "react";
import { useMemo } from "react";
import { useSocialComposerStore } from "../composer.store";
import {
  PLATFORM_LABELS,
  SocialPlatform,
  SocialPostDraft,
} from "../composer.types";
import InstagramPreview from "./previews/InstagramPreview";
import TikTokPreview from "./previews/TikTokPreview";
import FacebookPreview from "./previews/FacebookPreview";
import XPreview from "./previews/XPreview";

function buildPostText(draft: SocialPostDraft) {
  return draft.caption;
}

const PREVIEW_MAP: Record<
  SocialPlatform,
  (props: { draft: SocialPostDraft; text: string }) => ReactElement
> = {
  instagram: InstagramPreview,
  tiktok: TikTokPreview,
  facebook: FacebookPreview,
  x: XPreview,
};

export default function PostPreview() {
  const draft = useSocialComposerStore((s) => s.draft);
  const setPlatform = useSocialComposerStore((s) => s.setPlatform);
  const text = useMemo(() => buildPostText(draft), [draft]);
  const Preview = PREVIEW_MAP[draft.platform];

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
          Vista previa dinámica
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PLATFORM_LABELS) as SocialPlatform[]).map(
            (platform) => (
              <button
                key={platform}
                type="button"
                onClick={() => setPlatform(platform)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  draft.platform === platform
                    ? "border-primary bg-white text-primary shadow-sm"
                    : "border-transparent text-gray-500 hover:bg-white"
                }`}
              >
                {PLATFORM_LABELS[platform]}
              </button>
            )
          )}
        </div>
      </div>

      <div className="mt-4">
        <Preview draft={draft} text={text} />
      </div>

      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        Consejo Pro: las publicaciones con 3 hashtags relevantes suelen
        aumentar el alcance en redes sociales.
      </div>
    </div>
  );
}
