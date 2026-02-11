import { create } from "zustand";
import { db } from "@/core/storage/kora.db";
import { SocialPost } from "./social.types";
import { useSessionStore } from "@/core/session/session.store";

interface SocialPostsState {
  posts: SocialPost[];
  loadPosts: () => Promise<void>;
  addPost: (post: SocialPost) => Promise<void>;
  updatePost: (post: SocialPost) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  resetPosts: () => void;
}

const isAuthenticated = () =>
  useSessionStore.getState().mode === "authenticated";

export const useSocialPostsStore = create<SocialPostsState>(
  (set) => ({
    posts: [],

    loadPosts: async () => {
      if (!isAuthenticated()) return;
      const all = await db.socialPosts.toArray();
      set({ posts: all });
    },

    addPost: async (post) => {
      if (!isAuthenticated()) {
        set((state) => ({
          posts: [post, ...state.posts],
        }));
        return;
      }
      await db.socialPosts.put(post);
      set((state) => ({
        posts: [post, ...state.posts],
      }));
    },

    updatePost: async (post) => {
      if (!isAuthenticated()) {
        set((state) => ({
          posts: state.posts.map((p) =>
            p.id === post.id ? post : p
          ),
        }));
        return;
      }
      await db.socialPosts.put(post);
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === post.id ? post : p
        ),
      }));
    },

    deletePost: async (id) => {
      if (!isAuthenticated()) {
        set((state) => ({
          posts: state.posts.filter((p) => p.id !== id),
        }));
        return;
      }
      await db.socialPosts.delete(id);
      set((state) => ({
        posts: state.posts.filter((p) => p.id !== id),
      }));
    },

    resetPosts: () => set({ posts: [] }),
  })
);
