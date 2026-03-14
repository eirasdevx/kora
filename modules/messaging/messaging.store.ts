"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MessageTemplate } from "./messaging.types";
import { useNotificationsStore } from "@/core/notifications/notifications.store";

const createTemplateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const nowIso = () => new Date().toISOString();

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
  addTemplate: (
    payload: Omit<MessageTemplate, "id" | "createdAt" | "updatedAt">
  ) => MessageTemplate;
  updateTemplate: (
    id: string,
    updates: Partial<Omit<MessageTemplate, "id" | "createdAt">>
  ) => MessageTemplate | null;
  removeTemplate: (id: string) => void;
}

export const useMessagingStore = create<MessagingState>()(
  persist(
    (set, get) => ({
      templates: DEFAULT_TEMPLATES,
      addTemplate: (payload) => {
        const stamp = nowIso();
        const template: MessageTemplate = {
          ...payload,
          id: createTemplateId(),
          createdAt: stamp,
          updatedAt: stamp,
        };
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
      updateTemplate: (id, updates) => {
        const { templates } = get();
        const target = templates.find((item) => item.id === id);
        if (!target) return null;
        const updated = {
          ...target,
          ...updates,
          updatedAt: nowIso(),
        };
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
      removeTemplate: (id) => {
        const target = get().templates.find((item) => item.id === id);
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
      partialize: (state) => ({ templates: state.templates }),
    }
  )
);
