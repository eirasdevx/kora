"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSocialPostsStore } from "@/modules/social/social.store";
import { SocialPostStatus } from "@/modules/social/social.types";
import PageTopbar from "@/components/PageTopbar";

const kpis = [
  {
    title: "Alcance Total",
    value: "124.5k",
    change: "+12.4%",
    positive: true,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 11V5a2 2 0 0 1 2-2h6" />
        <path d="M5 19h14" />
        <path d="M15 11V7" />
        <path d="M11 15V9" />
      </svg>
    ),
    accent: "bg-blue-50 text-blue-600",
  },
  {
    title: "Engagement Promedio",
    value: "4.8%",
    change: "-0.5%",
    positive: false,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 21s-7-4.35-7-11a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 6.65-7 11-7 11z" />
      </svg>
    ),
    accent: "bg-rose-50 text-rose-600",
  },
  {
    title: "Nuevos Seguidores",
    value: "+1,200",
    change: "+8.2%",
    positive: true,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 11a4 4 0 1 0-8 0" />
        <path d="M12 14v7" />
        <path d="M9 18h6" />
        <path d="M4 21c1.6-3.2 5-5 8-5s6.4 1.8 8 5" />
      </svg>
    ),
    accent: "bg-emerald-50 text-emerald-600",
  },
];

const filters = [
  { id: "Todo", label: "Todo" },
  { id: "Facebook", label: "Facebook" },
  { id: "Instagram", label: "Instagram" },
  { id: "X", label: "X" },
  { id: "TikTok", label: "TikTok" },
];

const STATUS_LABELS: Record<SocialPostStatus, string> = {
  draft: "Borrador",
  scheduled: "Programado",
  published: "Publicado",
};

const STATUS_STYLES: Record<SocialPostStatus, string> = {
  draft: "bg-amber-50 text-amber-700",
  scheduled: "bg-blue-50 text-blue-600",
  published: "bg-emerald-50 text-emerald-700",
};

const GRADIENTS = [
  "bg-gradient-to-r from-emerald-700 to-orange-400",
  "bg-gradient-to-r from-teal-600 to-cyan-400",
  "bg-gradient-to-r from-slate-200 to-slate-400",
  "bg-gradient-to-r from-indigo-500 to-purple-500",
];

const channelStyles: Record<string, string> = {
  Instagram: "bg-pink-50 text-pink-700",
  Facebook: "bg-blue-50 text-blue-700",
  X: "bg-slate-100 text-slate-700",
  TikTok: "bg-gray-100 text-gray-800",
};

function isVideo(url: string) {
  return url.startsWith("data:video");
}

export default function SocialPage() {
  const { posts, loadPosts } = useSocialPostsStore();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todo");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = posts.filter((post) => {
      const matchesSearch = !q || post.content.toLowerCase().includes(q);
      const matchesFilter =
        activeFilter === "Todo" || post.channels.includes(activeFilter);
      return matchesSearch && matchesFilter;
    });

    return [...result].sort((a, b) => {
      const aDate = a.scheduledAt ?? a.createdAt;
      const bDate = b.scheduledAt ?? b.createdAt;
      return sortOrder === "desc"
        ? bDate.localeCompare(aDate)
        : aDate.localeCompare(bDate);
    });
  }, [posts, search, activeFilter, sortOrder]);

  return (
    <div className="space-y-6">
      <PageTopbar>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <h1 className="text-2xl font-semibold text-gray-900">
              Social Media Hub
            </h1>
            <div className="relative w-full sm:w-80">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar publicaciones..."
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/social/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-primary/90"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </span>
              Redactar Nueva Publicación
            </Link>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50"
              aria-label="Notificaciones"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
          </div>
        </div>
      </PageTopbar>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Impacto Global</h2>
          <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            Últimos 30 días
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {kpis.map((kpi) => (
            <div
              key={kpi.title}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.accent}`}
                >
                  {kpi.icon}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    kpi.positive
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-rose-50 text-rose-600"
                  }`}
                >
                  {kpi.change}
                </span>
              </div>
              <p className="mt-4 text-sm text-gray-500">{kpi.title}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter.id
                    ? "bg-primary text-white shadow"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-semibold uppercase tracking-wide">Ordenar:</span>
            <button
              onClick={() =>
                setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
              }
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm"
            >
              Fecha de publicación
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 transition ${
                  sortOrder === "desc" ? "" : "rotate-180"
                }`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredPosts.map((post, index) => {
            const previewMedia = post.mediaUrls?.[0];
            return (
              <div
                key={post.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="relative h-44 bg-gray-100">
                  {previewMedia ? (
                    isVideo(previewMedia) ? (
                      <video
                        src={previewMedia}
                        className="h-full w-full object-cover"
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <img
                        src={previewMedia}
                        alt="Vista previa"
                        className="h-full w-full object-cover"
                      />
                    )
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center ${
                        GRADIENTS[index % GRADIENTS.length]
                      } text-xs font-semibold text-white/80`}
                    >
                      Sin multimedia
                    </div>
                  )}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    {post.channels.map((channel) => (
                      <span
                        key={channel}
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          channelStyles[channel] ?? "bg-white/90 text-gray-700"
                        }`}
                      >
                        {channel}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 px-4 py-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        STATUS_STYLES[post.status]
                      }`}
                    >
                      {STATUS_LABELS[post.status].toUpperCase()}
                    </span>
                    <span>
                      {post.scheduledAt
                        ? new Date(post.scheduledAt).toLocaleString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : new Date(post.createdAt).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {post.content.slice(0, 60) || "Sin contenido"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {post.channels.map((channel) => (
                      <span
                        key={`${post.id}-${channel}`}
                        className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600"
                      >
                        {channel}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
                  <span>Vista previa</span>
                  <Link
                    href={`/social/${post.id}`}
                    className="text-xs font-semibold text-primary"
                  >
                    Detalles
                  </Link>
                </div>
              </div>
            );
          })}

          <Link
            href="/social/new"
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500 transition hover:border-primary/40"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-xl">
              +
            </span>
            <span className="mt-4 font-semibold text-gray-700">
              Nueva publicación
            </span>
            <span className="text-xs text-gray-400">Subir imagen o video</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
