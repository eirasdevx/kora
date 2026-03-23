"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SectionBlock from "@/components/shared/SectionBlock";
import SettingsPageHeader from "@/components/shared/SettingsPageHeader";
import { useSessionStore } from "@/core/session/session.store";
import { useUsersStore } from "@/core/users/users.store";
import { useNotificationsStore } from "@/core/notifications/notifications.store";
import { useTransactionsStore } from "@/modules/accounting/transactions.store";
import { useContactsStore } from "@/modules/contacts/contacts.store";
import { useDocumentsStore } from "@/modules/documents/documents.store";
import { useEventsStore } from "@/modules/events/events.store";
import { useMessagingSettingsStore } from "@/modules/messaging/messaging.settings.store";
import { useInventoryStore } from "@/modules/resources/inventory.store";

type HealthState = "ok" | "warning" | "info";

function badgeClasses(state: HealthState) {
  if (state === "ok") return "bg-emerald-50 text-emerald-700";
  if (state === "warning") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelative(value: string, currentTime: number) {
  const diffMs = new Date(value).getTime() - currentTime;
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat("es-ES", {
    numeric: "auto",
  });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

export default function SystemStatusPage() {
  const [currentTime] = useState(() => Date.now());
  const mode = useSessionStore((s) => s.mode);
  const association = useSessionStore((s) => s.association);
  const companyCode = useSessionStore((s) => s.companyCode);

  const users = useUsersStore((s) => s.users);
  const notifications = useNotificationsStore((s) => s.notifications);

  const { contacts, loadContacts } = useContactsStore();
  const { events, loadEvents } = useEventsStore();
  const { documents, loadDocuments } = useDocumentsStore();
  const { transactions, loadTransactions } = useTransactionsStore();
  const { items, loadItems } = useInventoryStore();
  const {
    settings,
    hydrated: settingsHydrated,
    loadSettings,
  } = useMessagingSettingsStore();

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (mode !== "authenticated") return;
    void loadContacts();
    void loadEvents();
    void loadDocuments();
    void loadTransactions();
    void loadItems();
  }, [
    mode,
    loadContacts,
    loadDocuments,
    loadEvents,
    loadItems,
    loadTransactions,
  ]);

  const associationName = association?.name?.trim() || "Asociación no definida";
  const messagingReady = Boolean(
    settingsHydrated &&
      settings.senderName &&
      settings.emailAddress &&
      (settings.hasEmailAppPassword || settings.emailAppPassword)
  );
  const unreadNotifications = notifications.filter((item) => !item.read).length;
  const pendingTransactions = transactions.filter(
    (item) => item.status === "pending"
  ).length;
  const upcomingEvents = events.filter((item) => {
    if (item.status === "draft") return false;
    return new Date(item.startDate).getTime() >= currentTime;
  }).length;
  const protectedUsers = users.filter(
    (item) => item.preferences?.twoFactorEnabled
  ).length;
  const associationProfileScore = [
    association?.name,
    association?.taxId,
    association?.contactEmail,
    association?.location,
  ].filter((value) => value?.trim()).length;
  const activeModules = [
    contacts.length > 0,
    events.length > 0,
    documents.length > 0,
    transactions.length > 0,
    items.length > 0,
  ].filter(Boolean).length;

  const alerts: Array<{
    title: string;
    description: string;
    state: HealthState;
    href?: string;
    actionLabel?: string;
  }> = [];

  if (mode === "guest") {
    alerts.push({
      title: "Sesión temporal",
      description:
        "Estás en modo invitado. La persistencia completa, mensajería y controles avanzados quedan limitados.",
      state: "info",
      href: "/login",
      actionLabel: "Iniciar sesión",
    });
  }

  if (associationProfileScore < 4) {
    alerts.push({
      title: "Perfil de asociación incompleto",
      description:
        "Faltan datos legales o de contacto que conviene completar antes de operar o publicar documentos.",
      state: "warning",
      href: "/settings/association",
      actionLabel: "Completar perfil",
    });
  }

  if (settingsHydrated && !messagingReady) {
    alerts.push({
      title: "Mensajería pendiente",
      description:
        "No hay un remitente completo configurado. Las campañas y correos salientes no están listos.",
      state: "warning",
      href: "/settings/messaging",
      actionLabel: "Configurar remitente",
    });
  }

  if (pendingTransactions > 0) {
    alerts.push({
      title: "Movimientos pendientes",
      description: `Hay ${pendingTransactions} movimiento(s) financiero(s) pendiente(s) de seguimiento.`,
      state: "info",
      href: "/finance",
      actionLabel: "Revisar finanzas",
    });
  }

  if (unreadNotifications > 0) {
    alerts.push({
      title: "Alertas sin revisar",
      description: `Tienes ${unreadNotifications} notificación(es) pendiente(s) de lectura.`,
      state: "info",
      href: "/settings/notifications",
      actionLabel: "Abrir notificaciones",
    });
  }

  const overallState: HealthState =
    alerts.some((item) => item.state === "warning")
      ? "warning"
      : alerts.length > 0
        ? "info"
        : "ok";

  const overallLabel =
    overallState === "ok"
      ? "Operativo"
      : overallState === "warning"
        ? "Revisión recomendada"
        : "Operativo con seguimiento";

  const summaryCards = [
    {
      label: "Estado general",
      value: overallLabel,
      note:
        overallState === "ok"
          ? "No se detectan bloqueos relevantes en la configuración local."
          : `${alerts.length} señal(es) de seguimiento en esta sesión.`,
      state: overallState,
    },
    {
      label: "Persistencia",
      value:
        mode === "authenticated"
          ? "Local persistente"
          : "Sesión temporal",
      note:
        mode === "authenticated"
          ? "Los módulos usan almacenamiento local del navegador."
          : "El modo invitado no representa un entorno definitivo.",
      state: mode === "authenticated" ? "ok" : "info",
    },
    {
      label: "Mensajería",
      value: settingsHydrated
        ? messagingReady
          ? "Lista para enviar"
          : "Pendiente"
        : "Revisando",
      note: settingsHydrated
        ? messagingReady
          ? settings.emailAddress
          : "Configura remitente, correo y credencial SMTP."
        : "Comprobando ajustes de mensajería.",
      state: settingsHydrated
        ? messagingReady
          ? "ok"
          : "warning"
        : "info",
    },
    {
      label: "Cobertura de módulos",
      value: `${activeModules}/5`,
      note: "Personas, eventos, documentos, finanzas y recursos con datos cargados.",
      state: activeModules >= 3 ? "ok" : "info",
    },
  ] as const;

  const checks = [
    {
      title: "Acceso y sesión",
      state: mode === "authenticated" ? "ok" : "info",
      description:
        mode === "authenticated"
          ? "La asociación opera con una sesión autenticada."
          : "La sesión actual es de invitado y tiene alcance reducido.",
    },
    {
      title: "Perfil jurídico",
      state: associationProfileScore >= 4 ? "ok" : "warning",
      description:
        associationProfileScore >= 4
          ? "Nombre, identificación y contacto principal están informados."
          : "Faltan datos esenciales para una ficha legal completa.",
    },
    {
      title: "Remitente saliente",
      state: settingsHydrated ? (messagingReady ? "ok" : "warning") : "info",
      description: settingsHydrated
        ? messagingReady
          ? "El canal de correo tiene configuración suficiente para campañas."
          : "La configuración de mensajería sigue incompleta."
        : "Comprobando ajustes de mensajería.",
    },
    {
      title: "Seguridad del equipo",
      state: protectedUsers > 0 ? "ok" : "info",
      description:
        protectedUsers > 0
          ? `${protectedUsers} usuario(s) tienen verificación en dos pasos activa.`
          : "No hay usuarios con 2FA activada en esta sesión.",
    },
    {
      title: "Monitorización",
      state: unreadNotifications === 0 ? "ok" : "info",
      description:
        unreadNotifications === 0
          ? "No hay alertas internas pendientes de lectura."
          : `${unreadNotifications} alerta(s) esperan revisión.`,
    },
    {
      title: "Actividad operativa",
      state:
        contacts.length + events.length + documents.length + transactions.length > 0
          ? "ok"
          : "info",
      description:
        contacts.length + events.length + documents.length + transactions.length > 0
          ? "La plataforma ya contiene registros útiles para operar."
          : "Aún no hay suficiente actividad registrada en los módulos principales.",
    },
  ] as const;

  const moduleCards = [
    {
      title: "Personas",
      count: contacts.length,
      note: `${users.length} usuario(s) interno(s) y ${contacts.length} contacto(s) operativos.`,
    },
    {
      title: "Eventos",
      count: events.length,
      note: `${upcomingEvents} evento(s) futuro(s) o activos fuera de borrador.`,
    },
    {
      title: "Documentos",
      count: documents.length,
      note: "Biblioteca y evidencia documental disponibles en local.",
    },
    {
      title: "Finanzas",
      count: transactions.length,
      note: `${pendingTransactions} movimiento(s) pendiente(s) de conciliación o cobro.`,
    },
    {
      title: "Recursos",
      count: items.length,
      note: "Inventario de activos y material operativo.",
    },
  ];

  const recentActivity = notifications.slice(0, 5);

  return (
    <div className="space-y-8">
      <SettingsPageHeader
        section="Estado del sistema"
        title="Estado del sistema"
        subtitle="Lectura rápida de la salud operativa de Kora en este navegador y para la asociación activa."
        actions={
          <>
            <Link
              href="/settings/notifications"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              Ver alertas
            </Link>
            <Link
              href="/settings/migration"
              className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
            >
              Copias y exportación
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                {card.label}
              </p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses(
                  card.state
                )}`}
              >
                {card.value}
              </span>
            </div>
            <p className="mt-3 text-sm text-gray-500">{card.note}</p>
          </div>
        ))}
      </section>

      <SectionBlock
        title="Comprobaciones clave"
        subtitle="Indicadores rápidos sobre configuración, acceso y continuidad"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {checks.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">
                  {item.title}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses(
                    item.state
                  )}`}
                >
                  {item.state === "ok"
                    ? "Correcto"
                    : item.state === "warning"
                      ? "Atención"
                      : "Seguimiento"}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        title="Cobertura operativa"
        subtitle="Volumen actual de datos y módulos con actividad"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {moduleCards.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-gray-200 bg-white p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                {item.title}
              </p>
              <p className="mt-3 text-2xl font-semibold text-gray-900">
                {item.count}
              </p>
              <p className="mt-2 text-sm text-gray-500">{item.note}</p>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        title="Alertas y recomendaciones"
        subtitle="Acciones sugeridas para dejar el entorno en mejor estado"
      >
        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
            Todo está en orden para <span className="font-semibold">{associationName}</span>.
            No se detectan acciones urgentes de configuración en esta sesión.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.title}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses(
                          item.state
                        )}`}
                      >
                        {item.state === "warning"
                          ? "Atención"
                          : item.state === "ok"
                            ? "Correcto"
                            : "Seguimiento"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {item.description}
                    </p>
                  </div>
                  {item.href && item.actionLabel ? (
                    <Link
                      href={item.href}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                    >
                      {item.actionLabel}
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>

      <SectionBlock
        title="Actividad reciente"
        subtitle="Últimos eventos internos detectados por el centro de notificaciones"
        actions={
          <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
            {companyCode ? "Sin código"} · {associationName}
          </div>
        }
      >
        {recentActivity.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
            Todavía no hay actividad registrada en el centro de notificaciones.
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-gray-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.title}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          item.read
                            ? "bg-gray-100 text-gray-500"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {item.read ? "Leída" : "Nueva"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {item.description}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>{formatDateTime(item.createdAt)}</p>
                    <p className="mt-1">{formatRelative(item.createdAt, currentTime)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>
    </div>
  );
}
