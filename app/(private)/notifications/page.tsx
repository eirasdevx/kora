"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageTopbar from "@/components/PageTopbar";
import {
  type NotificationCategory,
  type NotificationItem,
  useNotificationsStore,
} from "@/core/notifications/notifications.store";

type NotificationFilter = "all" | NotificationCategory;
type NotificationSection = "Recientes" | "Ayer" | "Anteriores";

const TABS: Array<{ id: NotificationFilter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "payments", label: "Pagos" },
  { id: "documents", label: "Documentos" },
  { id: "members", label: "Socios" },
  { id: "system", label: "Sistema" },
];

const CATEGORY_META: Record<
  NotificationCategory,
  {
    icon: string;
    tone: string;
    actionLabel: string;
    fallbackHref: string;
  }
> = {
  payments: {
    icon: "payments",
    tone: "bg-emerald-50 text-emerald-600",
    actionLabel: "Ver detalle",
    fallbackHref: "/finance",
  },
  documents: {
    icon: "description",
    tone: "bg-blue-50 text-blue-600",
    actionLabel: "Ver documento",
    fallbackHref: "/documents",
  },
  members: {
    icon: "group",
    tone: "bg-amber-50 text-amber-600",
    actionLabel: "Ver perfil",
    fallbackHref: "/people",
  },
  system: {
    icon: "settings_suggest",
    tone: "bg-slate-100 text-slate-600",
    actionLabel: "Ver cambios",
    fallbackHref: "/dashboard",
  },
};

const SECTION_ORDER: NotificationSection[] = ["Recientes", "Ayer", "Anteriores"];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatRelative(iso: string) {
  if (!iso) return "-";
  const now = Date.now();
  const diffMs = now - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "hace unos segundos";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} horas`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} meses`;
  const years = Math.floor(months / 12);
  return `hace ${years} anos`;
}

function getSection(iso: string): NotificationSection {
  if (!iso) return "Recientes";
  const now = new Date();
  const date = new Date(iso);
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return "Recientes";
  if (days === 1) return "Ayer";
  return "Anteriores";
}

export default function NotificationsPage() {
  const router = useRouter();
  const notifications = useNotificationsStore((s) => s.notifications);
  const markRead = useNotificationsStore((s) => s.markRead);
  const removeNotification = useNotificationsStore(
    (s) => s.removeNotification
  );
  const [activeTab, setActiveTab] = useState<NotificationFilter>("all");
  const [showOlder, setShowOlder] = useState(false);

  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return notifications;
    return notifications.filter((item) => item.category === activeTab);
  }, [activeTab, notifications]);

  const sortedNotifications = useMemo(() => {
    return [...filteredNotifications].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }, [filteredNotifications]);

  const groupedNotifications = useMemo(() => {
    return sortedNotifications.reduce<
      Record<NotificationSection, NotificationItem[]>
    >(
      (acc, item) => {
        const section = getSection(item.createdAt);
        acc[section] = [...(acc[section] ?? []), item];
        return acc;
      },
      {
        Recientes: [],
        Ayer: [],
        Anteriores: [],
      }
    );
  }, [sortedNotifications]);

  const hasResults = filteredNotifications.length > 0;
  const hasOlder = groupedNotifications.Anteriores.length > 0;

  const handlePrimaryAction = (item: NotificationItem) => {
    const fallbackHref = CATEGORY_META[item.category].fallbackHref;
    const href = item.href ?? fallbackHref;
    if (href) router.push(href);
    markRead(item.id, true);
  };

  return (
    <div className="space-y-6">
      <PageTopbar>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Notificaciones
          </p>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Centro de Notificaciones
            </h1>
            <p className="text-sm text-slate-500">
              Gestiona las alertas y actualizaciones importantes de tu cuenta de
              Kora.
            </p>
          </div>
        </div>
      </PageTopbar>

      <section className="rounded-3xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-6 border-b border-gray-100">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cx(
                  "pb-4 text-sm font-semibold transition",
                  isActive
                    ? "border-b-2 border-primary text-primary"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-8">
          {SECTION_ORDER.map((section) => {
            if (!showOlder && section === "Anteriores") return null;
            const items = groupedNotifications[section];
            if (!items?.length) return null;

            return (
              <div key={section} className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  {section}
                </p>
                <div className="space-y-4">
                  {items.map((item) => {
                    const isUnread = !item.read;
                    const meta = CATEGORY_META[item.category];
                    const icon = item.icon ?? meta.icon;
                    const tone = item.tone ?? meta.tone;
                    const actionLabel = item.actionLabel ?? meta.actionLabel;

                    return (
                      <article
                        key={item.id}
                        className={cx(
                          "rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm transition",
                          isUnread
                            ? "border-l-4 border-l-primary"
                            : "hover:border-primary/30"
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex flex-1 items-start gap-4">
                            <span
                              className={cx(
                                "flex h-12 w-12 items-center justify-center rounded-2xl",
                                tone
                              )}
                            >
                              <span className="material-symbols-outlined text-[22px]">
                                {icon}
                              </span>
                            </span>
                            <div className="space-y-2">
                              <div>
                                <h3 className="text-sm font-semibold text-slate-900">
                                  {item.title}
                                </h3>
                                <p
                                  className={cx(
                                    "mt-1 text-sm",
                                    isUnread
                                      ? "text-slate-500"
                                      : "text-slate-400"
                                  )}
                                >
                                  {item.description}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
                                <button
                                  type="button"
                                  onClick={() => handlePrimaryAction(item)}
                                  className="text-primary transition hover:text-primary/80"
                                >
                                  {actionLabel}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    markRead(item.id, !item.read)
                                  }
                                  className="text-slate-400 transition hover:text-slate-500"
                                >
                                  {item.read
                                    ? "Marcar como no leido"
                                    : "Marcar como leido"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeNotification(item.id)}
                                  className="text-slate-400 transition hover:text-slate-500"
                                >
                                  Archivar
                                </button>
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400">
                            {formatRelative(item.createdAt)}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {!hasResults ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-slate-500">
              No hay notificaciones para esta categoria.
            </div>
          ) : null}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowOlder(true)}
              disabled={showOlder || !hasOlder}
              className={cx(
                "rounded-full border border-gray-200 bg-white px-6 py-2 text-sm font-semibold text-slate-600 shadow-sm transition",
                showOlder || !hasOlder
                  ? "cursor-not-allowed opacity-60"
                  : "hover:border-primary/30"
              )}
            >
              {showOlder || !hasOlder
                ? "No hay mas notificaciones"
                : "Cargar notificaciones anteriores"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
