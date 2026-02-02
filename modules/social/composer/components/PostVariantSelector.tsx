"use client";

import { useSocialComposerStore } from "../composer.store";
import { PLATFORM_VARIANTS } from "../composer.types";

const VARIANT_LABELS: Record<string, string> = {
  feed: "Feed 1:1",
  story: "Story 9:16",
  reel: "Reel 9:16",
  video: "Video 9:16",
  post: "Post 4:5",
  link: "Link 1.91:1",
  tweet: "Tweet",
};

export default function PostVariantSelector() {
  const platform = useSocialComposerStore((s) => s.draft.platform);
  const variant = useSocialComposerStore((s) => s.draft.variant);
  const setVariant = useSocialComposerStore((s) => s.setVariant);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
        Formato
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {PLATFORM_VARIANTS[platform].map((item) => {
          const active = variant === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setVariant(item)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {VARIANT_LABELS[item] ?? item}
            </button>
          );
        })}
      </div>
    </div>
  );
}
