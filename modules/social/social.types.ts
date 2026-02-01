export type SocialPostStatus =
  | "draft"
  | "scheduled"
  | "published";

export interface SocialPost {
  id: string;
  content: string;
  channels: string[];
  status: SocialPostStatus;
  scheduledAt?: string;
  createdAt: string;
}
