"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import SocialPostForm from "@/modules/social/SocialPostForm";
import { useSocialPostsStore } from "@/modules/social/social.store";
import { SocialPost } from "@/modules/social/social.types";

export default function SocialPostDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { posts, loadPosts, updatePost, deletePost } =
    useSocialPostsStore();

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const postId =
    typeof params.id === "string" ? params.id : params.id?.[0];

  const post = useMemo(
    () => posts.find((p) => p.id === postId),
    [posts, postId]
  );

  if (!post) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500">
        Cargando publicación...
      </div>
    );
  }

  return (
    <SocialPostForm
      initialData={post}
      onCancel={() => router.push("/social")}
      onDelete={async () => {
        await deletePost(post.id);
        router.push("/social");
      }}
      onSubmit={async (data, action) => {
        if (!data) return;
        const status =
          action === "publish"
            ? "published"
            : data.scheduledAt
              ? "scheduled"
              : "draft";
        const updated: SocialPost = {
          ...post,
          content: data.content,
          channels: data.channels,
          mediaUrls: data.mediaUrls,
          scheduledAt: data.scheduledAt,
          status,
        };
        await updatePost(updated);
        router.push("/social");
      }}
    />
  );
}
