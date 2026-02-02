export type SocialPostStatus =
  | "draft"
  | "scheduled"
  | "published";

export interface SocialPost {
  id: string;
  content: string;
  channels: string[];
  status: SocialPostStatus;
  mediaUrls?: string[];
  scheduledAt?: string;
  createdAt: string;
}
