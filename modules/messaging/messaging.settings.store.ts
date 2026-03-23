"use client";

import { create } from "zustand";
import {
  DEFAULT_ASSOCIATION_MESSAGING_SETTINGS,
  type PublicAssociationMessagingSettings,
} from "@/core/messaging/settings";
import type { SessionBootstrapPayload } from "@/core/session/session-payload";
import { useSessionStore } from "@/core/session/session.store";
import {
  getSecureItem,
  removeSecureItem,
  setSecureItem,
} from "@/core/security/secure-storage";
import {
  applySessionPayload,
  parseApiResponse,
} from "@/lib/client/session-client";

export type { EmailProvider } from "@/core/messaging/settings";

export type MessagingSettings = PublicAssociationMessagingSettings & {
  emailAppPassword: string;
};

type StoredMessagingSecret = {
  emailAppPassword?: string;
};

const DEFAULT_SETTINGS: MessagingSettings = {
  senderName: DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.senderName,
  emailAddress: DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.emailAddress,
  emailAppPassword: "",
  emailProvider: DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.emailProvider,
  smtpHost: DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.smtpHost,
  smtpPort: DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.smtpPort,
  smtpSecure: DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.smtpSecure,
  whatsappNumber: DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.whatsappNumber,
  smsNumber: DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.smsNumber,
  hasEmailAppPassword: false,
};

const buildStorageKey = (associationId: string) =>
  `kora-messaging-settings:${associationId}`;

const buildSettingsFromAssociation = (
  association: ReturnType<typeof useSessionStore.getState>["association"],
  storedSecret?: StoredMessagingSecret | null
): MessagingSettings => {
  if (!association) {
    return DEFAULT_SETTINGS;
  }

  const source = association.messagingSettings;
  const emailAppPassword = storedSecret?.emailAppPassword?.trim() ? "";

  return {
    senderName: source?.senderName || association.name || "",
    emailAddress: source?.emailAddress || association.contactEmail || "",
    emailProvider:
      source?.emailProvider ? DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.emailProvider,
    smtpHost: source?.smtpHost ? DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.smtpHost,
    smtpPort: source?.smtpPort ? DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.smtpPort,
    smtpSecure:
      source?.smtpSecure ? DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.smtpSecure,
    whatsappNumber:
      source?.whatsappNumber ?
      DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.whatsappNumber,
    smsNumber:
      source?.smsNumber ? DEFAULT_ASSOCIATION_MESSAGING_SETTINGS.smsNumber,
    hasEmailAppPassword:
      Boolean(emailAppPassword) || Boolean(source?.hasEmailAppPassword),
    emailAppPassword,
  };
};

interface MessagingSettingsState {
  settings: MessagingSettings;
  hydrated: boolean;
  loadedAssociationId: string | null;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<MessagingSettings>) => void;
  saveSettings: () => Promise<boolean>;
  resetSettings: () => Promise<void>;
}

export const useMessagingSettingsStore = create<MessagingSettingsState>(
  (set, get) => ({
    settings: DEFAULT_SETTINGS,
    hydrated: false,
    loadedAssociationId: null,
    loadSettings: async () => {
      const { activeAssociationId, association } = useSessionStore.getState();

      if (!activeAssociationId || !association) {
        set({
          settings: DEFAULT_SETTINGS,
          hydrated: true,
          loadedAssociationId: null,
        });
        return;
      }

      try {
        const storedSecret =
          await getSecureItem<StoredMessagingSecret>(
            buildStorageKey(activeAssociationId)
          );

        set({
          settings: buildSettingsFromAssociation(association, storedSecret),
          hydrated: true,
          loadedAssociationId: activeAssociationId,
        });
        return;
      } catch (error) {
        console.error(error);
      }

      set({
        settings: buildSettingsFromAssociation(association),
        hydrated: true,
        loadedAssociationId: activeAssociationId,
      });
    },
    updateSettings: (updates) =>
      set((state) => ({
        settings: {
          ...state.settings,
          ...updates,
          hasEmailAppPassword:
            updates.emailAppPassword !== undefined
              ? Boolean(updates.emailAppPassword.trim()) ||
                state.settings.hasEmailAppPassword
              : state.settings.hasEmailAppPassword,
        },
      })),
    saveSettings: async () => {
      const { association, activeAssociationId } = useSessionStore.getState();
      if (!association) {
        return false;
      }

      const settings = get().settings;
      const normalizedPassword = settings.emailAppPassword.trim();

      try {
        const response = await fetch("/api/association", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messagingSettings: {
              senderName: settings.senderName,
              emailAddress: settings.emailAddress,
              emailAppPassword: normalizedPassword || undefined,
              emailProvider: settings.emailProvider,
              smtpHost: settings.smtpHost,
              smtpPort: settings.smtpPort,
              smtpSecure: settings.smtpSecure,
              whatsappNumber: settings.whatsappNumber,
              smsNumber: settings.smsNumber,
            },
          }),
        });

        const session =
          await parseApiResponse<SessionBootstrapPayload>(response);
        applySessionPayload(session);

        if (activeAssociationId) {
          if (normalizedPassword) {
            await setSecureItem(buildStorageKey(activeAssociationId), {
              emailAppPassword: normalizedPassword,
            });
          } else if (!settings.hasEmailAppPassword) {
            removeSecureItem(buildStorageKey(activeAssociationId));
          }
        }

        set({
          settings: buildSettingsFromAssociation(session.association, {
            emailAppPassword: normalizedPassword,
          }),
          hydrated: true,
          loadedAssociationId: session.activeAssociationId,
        });
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    resetSettings: async () => {
      const { activeAssociationId } = useSessionStore.getState();
      set({
        settings: DEFAULT_SETTINGS,
        hydrated: true,
        loadedAssociationId: activeAssociationId,
      });
      if (activeAssociationId) {
        removeSecureItem(buildStorageKey(activeAssociationId));
      }
    },
  })
);

useSessionStore.subscribe((state, previousState) => {
  if (
    state.activeAssociationId === previousState.activeAssociationId &&
    state.association === previousState.association
  ) {
    return;
  }

  void useMessagingSettingsStore.getState().loadSettings();
});
