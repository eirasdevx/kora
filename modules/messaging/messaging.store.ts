"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MessageTemplate } from "./messaging.types";
import { useNotificationsStore } from "@/core/notifications/notifications.store";
import { useSessionStore } from "@/core/session/session.store";
import {
  deleteAssociationModuleRecord,
  listAssociationModuleRecords,
  saveAssociationModuleRecords,
  shouldLogAssociationDataError,
  upsertAssociationModuleRecord,
} from "@/lib/client/association-data-client";

const createTemplateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const nowIso = () => new Date().toISOString();

const isAuthenticated = () =>
  useSessionStore.getState().mode === "authenticated";

const getDefaultTemplates = () =>
  DEFAULT_TEMPLATES.map((template) => ({
    ...template,
  }));

const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: "tmp-welcome",
    title: "Bienvenida CRM",
    channel: "email",
    subject: "Bienvenida a la familia Kora",
    html: `<p>Hola {nombre_socio},</p>
<p>Gracias por unirte a nuestra asociación. Ya puedes acceder a todas las ventajas.</p>
<p>Equipo Kora</p>`,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "tmp-debt",
    title: "Aviso de deuda",
    channel: "email",
    subject: "Recordatorio de cuota pendiente",
    html: `<p>Hola {nombre_socio},</p>
<p>Te recordamos que tienes una cuota pendiente de {monto_deuda}.</p>
<p>Gracias por tu colaboración.</p>`,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "tmp-promo",
    title: "Promo Black Friday",
    channel: "email",
    subject: "Oferta especial para socios",
    html: `<p>Hola {nombre_socio},</p>
<p>Esta semana tenemos beneficios especiales para nuestra comunidad.</p>
<p>Accede desde el portal de socios.</p>`,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

interface MessagingState {
  templates: MessageTemplate[];
  hydrated: boolean;
  loadedAssociationId: string | null;
  loadTemplates: () => Promise<void>;
  resetTemplates: () => void;
  addTemplate: (
    payload: Omit<MessageTemplate, "id" | "createdAt" | "updatedAt">
  ) => Promise<MessageTemplate>;
  updateTemplate: (
    id: string,
    updates: Partial<Omit<MessageTemplate, "id" | "createdAt">>
  ) => Promise<MessageTemplate | null>;
  removeTemplate: (id: string) => Promise<void>;
}

export const useMessagingStore = create<MessagingState>()(
  persist(
    (set, get) => ({
      templates: getDefaultTemplates(),
      hydrated: false,
      loadedAssociationId: null,
      loadTemplates: async () => {
        const { activeAssociationId } = useSessionStore.getState();

        if (!activeAssociationId || !isAuthenticated()) {
          set({
            templates: getDefaultTemplates(),
            hydrated: true,
            loadedAssociationId: null,
          });
          return;
        }

        try {
          let persisted =
            await listAssociationModuleRecords<MessageTemplate>(
              "messagingTemplates"
            );

          if (persisted.length === 0) {
            persisted =
              await saveAssociationModuleRecords<MessageTemplate>(
                "messagingTemplates",
                getDefaultTemplates(),
                "replace"
              );
          }

          set({
            templates: persisted,
            hydrated: true,
            loadedAssociationId: activeAssociationId,
          });
          return;
        } catch (error) {
          if (shouldLogAssociationDataError(error)) {
            console.error(error);
          }
        }

        set((state) => ({
          templates:
            state.loadedAssociationId === activeAssociationId
              ? state.templates
              : getDefaultTemplates(),
          hydrated: true,
          loadedAssociationId: activeAssociationId,
        }));
      },
      resetTemplates: () =>
        set({
          templates: getDefaultTemplates(),
          hydrated: false,
          loadedAssociationId: null,
        }),
      addTemplate: async (payload) => {
        const stamp = nowIso();
        const template: MessageTemplate = {
          ...payload,
          id: createTemplateId(),
          createdAt: stamp,
          updatedAt: stamp,
        };

        if (isAuthenticated()) {
          await upsertAssociationModuleRecord<MessageTemplate>(
            "messagingTemplates",
            template
          );
        }

        set((state) => ({ templates: [template, ...state.templates] }));
        useNotificationsStore.getState().addNotification({
          category: "system",
          title: "Plantilla creada",
          description: `Se creó la plantilla ${template.title}.`,
          href: "/messaging",
          actionLabel: "Ver plantillas",
          icon: "mail",
          tone: "bg-sky-50 text-sky-600",
        });
        return template;
      },
      updateTemplate: async (id, updates) => {
        const { templates } = get();
        const target = templates.find((item) => item.id === id);
        if (!target) return null;
        const updated = {
          ...target,
          ...updates,
          updatedAt: nowIso(),
        };

        if (isAuthenticated()) {
          await upsertAssociationModuleRecord<MessageTemplate>(
            "messagingTemplates",
            updated
          );
        }

        set({
          templates: templates.map((item) => (item.id === id ? updated : item)),
        });
        useNotificationsStore.getState().addNotification({
          category: "system",
          title: "Plantilla actualizada",
          description: `Se actualizó la plantilla ${updated.title}.`,
          href: "/messaging",
          actionLabel: "Ver plantillas",
          icon: "mark_email_read",
          tone: "bg-blue-50 text-blue-600",
        });
        return updated;
      },
      removeTemplate: async (id) => {
        const target = get().templates.find((item) => item.id === id);

        if (isAuthenticated()) {
          await deleteAssociationModuleRecord("messagingTemplates", id);
        }

        set((state) => ({
          templates: state.templates.filter((item) => item.id !== id),
        }));
        useNotificationsStore.getState().addNotification({
          category: "system",
          title: "Plantilla eliminada",
          description: target?.title
            ? `Se eliminó la plantilla ${target.title}.`
            : "Se eliminó una plantilla.",
          href: "/messaging",
          actionLabel: "Ver plantillas",
          icon: "delete",
          tone: "bg-rose-50 text-rose-600",
        });
      },
    }),
    {
      name: "kora-messaging",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        templates: state.templates,
        loadedAssociationId: state.loadedAssociationId,
      }),
    }
  )
);

useSessionStore.subscribe((state, previousState) => {
  if (
    state.mode === previousState.mode &&
    state.activeAssociationId === previousState.activeAssociationId
  ) {
    return;
  }

  void useMessagingStore.getState().loadTemplates();
});
