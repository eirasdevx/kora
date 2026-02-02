"use client";

import {
  PLATFORM_LABELS,
  SocialPlatform,
} from "../composer.types";
import { useSocialComposerStore } from "../composer.store";

const PLATFORMS: SocialPlatform[] = [
  "instagram",
  "tiktok",
  "facebook",
  "x",
];

export default function PlatformSelector() {
  const platform = useSocialComposerStore((s) => s.draft.platform);
  const setPlatform = useSocialComposerStore((s) => s.setPlatform);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-400">
        Plataforma
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PLATFORMS.map((item) => {
          const active = platform === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setPlatform(item)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {PLATFORM_LABELS[item]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
