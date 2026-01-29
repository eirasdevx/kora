import { create } from "zustand";

export type SessionMode = "guest" | "authenticated";

interface SessionState {
  mode: SessionMode;
  setGuest: () => void;
  setAuthenticated: () => void;
  logout: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  mode: "guest", // por defecto
  setGuest: () => set({ mode: "guest" }),
  setAuthenticated: () => set({ mode: "authenticated" }),
  logout: () => set({ mode: "guest" }),
}));
