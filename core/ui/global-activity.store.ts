"use client";

import { create } from "zustand";

export type GlobalActivityKind = "read" | "write";

type GlobalActivityState = {
  pendingReads: number;
  pendingWrites: number;
  start: (kind: GlobalActivityKind) => void;
  finish: (kind: GlobalActivityKind) => void;
  reset: () => void;
};

export const useGlobalActivityStore = create<GlobalActivityState>((set) => ({
  pendingReads: 0,
  pendingWrites: 0,
  start: (kind) =>
    set((state) =>
      kind === "write"
        ? { pendingWrites: state.pendingWrites + 1 }
        : { pendingReads: state.pendingReads + 1 }
    ),
  finish: (kind) =>
    set((state) =>
      kind === "write"
        ? { pendingWrites: Math.max(0, state.pendingWrites - 1) }
        : { pendingReads: Math.max(0, state.pendingReads - 1) }
    ),
  reset: () => set({ pendingReads: 0, pendingWrites: 0 }),
}));
