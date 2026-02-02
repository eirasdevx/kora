import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  PLATFORM_VARIANTS,
  PostVariant,
  SocialPlatform,
  SocialPostDraft,
} from "./composer.types";

interface SocialComposerState {
  draft: SocialPostDraft;
  setPlatform: (platform: SocialPlatform) => void;
  setVariant: (variant: PostVariant) => void;
  setCaption: (caption: string) => void;
  setHashtags: (hashtags: string[]) => void;
  setMentions: (mentions: string[]) => void;
  setLink: (link: SocialPostDraft["link"]) => void;
  addMediaUrls: (urls: string[]) => void;
  removeMediaUrl: (index: number) => void;
  clearMedia: () => void;
  resetDraft: () => void;
}

const defaultDraft: SocialPostDraft = {
  platform: "instagram",
  variant: "feed",
  caption: "",
  hashtags: [],
  mentions: [],
  mediaUrls: [],
  link: {
    url: "",
    title: "",
    description: "",
  },
};

const getDefaultVariant = (platform: SocialPlatform) =>
  PLATFORM_VARIANTS[platform][0];

const isVariantForPlatform = (
  platform: SocialPlatform,
  variant: PostVariant
) => PLATFORM_VARIANTS[platform].includes(variant);

export const useSocialComposerStore = create<SocialComposerState>()(
  persist(
    (set, get) => ({
      draft: defaultDraft,
      setPlatform: (platform) => {
        const current = get().draft;
        const nextVariant = isVariantForPlatform(platform, current.variant)
          ? current.variant
          : getDefaultVariant(platform);
        set({
          draft: {
            ...current,
            platform,
            variant: nextVariant,
          },
        });
      },
      setVariant: (variant) => {
        const current = get().draft;
        if (!isVariantForPlatform(current.platform, variant)) {
          return;
        }
        set({
          draft: {
            ...current,
            variant,
          },
        });
      },
      setCaption: (caption) =>
        set((state) => ({
          draft: {
            ...state.draft,
            caption,
          },
        })),
      setHashtags: (hashtags) =>
        set((state) => ({
          draft: {
            ...state.draft,
            hashtags,
          },
        })),
      setMentions: (mentions) =>
        set((state) => ({
          draft: {
            ...state.draft,
            mentions,
          },
        })),
      setLink: (link) =>
        set((state) => ({
          draft: {
            ...state.draft,
            link,
          },
        })),
      addMediaUrls: (urls) =>
        set((state) => ({
          draft: {
            ...state.draft,
            mediaUrls: [...state.draft.mediaUrls, ...urls],
          },
        })),
      removeMediaUrl: (index) =>
        set((state) => ({
          draft: {
            ...state.draft,
            mediaUrls: state.draft.mediaUrls.filter((_, i) => i !== index),
          },
        })),
      clearMedia: () =>
        set((state) => ({
          draft: {
            ...state.draft,
            mediaUrls: [],
          },
        })),
      resetDraft: () => set({ draft: defaultDraft }),
    }),
    {
      name: "kora-social-composer",
    }
  )
);
