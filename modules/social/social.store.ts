import { create } from "zustand";
import { db } from "@/core/storage/kora.db";
import { SocialPost } from "./social.types";

interface SocialPostsState {
  posts: SocialPost[];
  loadPosts: () => Promise<void>;
  addPost: (post: SocialPost) => Promise<void>;
  updatePost: (post: SocialPost) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
}

export const useSocialPostsStore = create<SocialPostsState>(
  (set) => ({
    posts: [],

    loadPosts: async () => {
      const all = await db.socialPosts.toArray();
      set({ posts: all });
    },

    addPost: async (post) => {
      await db.socialPosts.put(post);
      set((state) => ({
        posts: [post, ...state.posts],
      }));
    },

    updatePost: async (post) => {
      await db.socialPosts.put(post);
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === post.id ? post : p
        ),
      }));
    },

    deletePost: async (id) => {
      await db.socialPosts.delete(id);
      set((state) => ({
        posts: state.posts.filter((p) => p.id !== id),
      }));
    },
  })
);
