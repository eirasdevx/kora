"use client";

import { useRouter } from "next/navigation";
import SocialPostForm from "@/modules/social/SocialPostForm";
import { useSocialPostsStore } from "@/modules/social/social.store";

export default function NewSocialPostPage() {
  const router = useRouter();
  const addPost = useSocialPostsStore((s) => s.addPost);

  const handleSubmit = async (
    data:
      | {
          content: string;
          channels: string[];
          mediaUrls?: string[];
          scheduledAt?: string;
        }
      | undefined,
    action: "draft" | "publish" | "schedule"
  ) => {
    if (!data) return;
    const now = new Date().toISOString();

    const status =
      action === "publish"
        ? "published"
        : data.scheduledAt
          ? "scheduled"
          : "draft";

    await addPost({
      ...data,
      id: crypto.randomUUID(),
      status,
      createdAt: now,
    });

    router.push("/social");
  };

  return (
    <SocialPostForm
      onCancel={() => router.push("/social")}
      onSubmit={handleSubmit}
    />
  );
}
