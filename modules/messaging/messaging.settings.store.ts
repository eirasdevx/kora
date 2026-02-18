"use client";

import { create } from "zustand";
import {
  getSecureItem,
  setSecureItem,
} from "@/core/security/secure-storage";

export type EmailProvider = "gmail" | "outlook" | "yahoo" | "custom";

export type MessagingSettings = {
  senderName: string;
  emailAddress: string;
  emailAppPassword: string;
  emailProvider: EmailProvider;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  whatsappNumber: string;
  smsNumber: string;
};

const STORAGE_KEY = "kora-messaging-settings";

const DEFAULT_SETTINGS: MessagingSettings = {
  senderName: "",
  emailAddress: "",
  emailAppPassword: "",
  emailProvider: "gmail",
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: false,
  whatsappNumber: "",
  smsNumber: "",
};

interface MessagingSettingsState {
  settings: MessagingSettings;
  hydrated: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<MessagingSettings>) => void;
  saveSettings: () => Promise<boolean>;
  resetSettings: () => Promise<void>;
}

export const useMessagingSettingsStore = create<MessagingSettingsState>(
  (set, get) => ({
    settings: DEFAULT_SETTINGS,
    hydrated: false,
    loadSettings: async () => {
      try {
        const stored = await getSecureItem<MessagingSettings>(STORAGE_KEY);
        if (stored) {
          set({
            settings: { ...DEFAULT_SETTINGS, ...stored },
            hydrated: true,
          });
          return;
        }
      } catch (error) {
        console.error(error);
      }
      set({ hydrated: true });
    },
    updateSettings: (updates) =>
      set((state) => ({
        settings: { ...state.settings, ...updates },
      })),
    saveSettings: async () => {
      try {
        await setSecureItem(STORAGE_KEY, get().settings);
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    resetSettings: async () => {
      set({ settings: DEFAULT_SETTINGS });
      await setSecureItem(STORAGE_KEY, DEFAULT_SETTINGS);
    },
  })
);
