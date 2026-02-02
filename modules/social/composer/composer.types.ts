export type SocialPlatform = "instagram" | "tiktok" | "facebook" | "x";

export type InstagramVariant = "feed" | "story" | "reel";
export type TikTokVariant = "video";
export type FacebookVariant = "post" | "link";
export type XVariant = "tweet";

export type PostVariant =
  | InstagramVariant
  | TikTokVariant
  | FacebookVariant
  | XVariant;

export interface SocialPostLink {
  url: string;
  title?: string;
  description?: string;
}

export interface SocialPostDraft {
  platform: SocialPlatform;
  variant: PostVariant;
  caption: string;
  hashtags: string[];
  mentions: string[];
  mediaUrls: string[];
  link?: SocialPostLink;
  associationId?: string;
}

export const PLATFORM_VARIANTS: Record<SocialPlatform, PostVariant[]> = {
  instagram: ["feed", "story", "reel"],
  tiktok: ["video"],
  facebook: ["post", "link"],
  x: ["tweet"],
};

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  x: "X",
};
