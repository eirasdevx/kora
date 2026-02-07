"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

interface AppearanceState {
  brandColor: string;
  theme: ThemeMode;
  fontScale: number;
  setAppearance: (next: Partial<AppearanceState>) => void;
}

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      brandColor: "#1152D4",
      theme: "light",
      fontScale: 1,
      setAppearance: (next) => set((state) => ({ ...state, ...next })),
    }),
    {
      name: "kora-appearance",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
