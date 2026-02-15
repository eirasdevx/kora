"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import PageTopbar from "@/components/PageTopbar";
import {
  type AssociationRepresentative,
  type AssociationSocialLinks,
  type AssociationSocialStats,
  useSessionStore,
} from "@/core/session/session.store";
import { useUsersStore } from "@/core/users/users.store";

const SOCIAL_LINKS = [
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/tuasociacion",
    icon: "photo_camera",
  },
  {
    key: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/tuasociacion",
    icon: "public",
  },
  {
    key: "x",
    label: "X (Twitter)",
    placeholder: "https://x.com/tuasociacion",
    icon: "alternate_email",
  },
  {
    key: "tiktok",
    label: "TikTok",
    placeholder: "https://tiktok.com/@tuasociacion",
    icon: "videocam",
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@tuasociacion",
    icon: "smart_display",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/company/tuasociacion",
    icon: "work",
  },
] as const;

type SocialLinkKey = (typeof SOCIAL_LINKS)[number]["key"];
type SocialLinksFormState = Record<SocialLinkKey, string>;
type SocialStatsFormState = {
  followers: string;
  views: string;
  likes: string;
};

type ProfileFormState = {
  name: string;
  logoUrl: string;
  taxId: string;
  phone: string;
  contactEmail: string;
  location: string;
  address: string;
  representatives: AssociationRepresentative[];
  socialLinks: SocialLinksFormState;
  socialStats: SocialStatsFormState;
};

type RepresentativeField = "role" | "name" | "email" | "phone";

function normalize(value: string) {
  return value.trim();
}

function createEmptySocialLinks(): SocialLinksFormState {
  return SOCIAL_LINKS.reduce((acc, link) => {
    acc[link.key] = "";
    return acc;
  }, {} as SocialLinksFormState);
}

function normalizeSocialLinks(
  links?: AssociationSocialLinks
): SocialLinksFormState {
  const base = createEmptySocialLinks();
  SOCIAL_LINKS.forEach((link) => {
    const value = links?.[link.key];
    base[link.key] = value ? String(value) : "";
  });
  return base;
}

function serializeSocialLinks(links: SocialLinksFormState) {
  return JSON.stringify(
    SOCIAL_LINKS.map((link) => normalize(links[link.key] ?? ""))
  );
}

function normalizeSocialStats(
  stats?: AssociationSocialStats
): SocialStatsFormState {
  return {
    followers:
      stats?.followers !== undefined ? String(stats.followers) : "",
    views: stats?.views !== undefined ? String(stats.views) : "",
    likes: stats?.likes !== undefined ? String(stats.likes) : "",
  };
}

function serializeSocialStats(stats: SocialStatsFormState) {
  return JSON.stringify({
    followers: normalize(stats.followers ?? ""),
    views: normalize(stats.views ?? ""),
    likes: normalize(stats.likes ?? ""),
  });
}

function parseStatValue(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;
  const normalized =
    raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, parsed);
}

function cleanSocialLinks(
  links: SocialLinksFormState
): AssociationSocialLinks | undefined {
  const cleaned = SOCIAL_LINKS.reduce((acc, link) => {
    const value = normalize(links[link.key] ?? "");
    if (value) {
      acc[link.key] = value;
    }
    return acc;
  }, {} as AssociationSocialLinks);

  return Object.keys(cleaned).length ? cleaned : undefined;
}

function cleanSocialStats(
  stats: SocialStatsFormState
): AssociationSocialStats | undefined {
  const followers = parseStatValue(stats.followers);
  const views = parseStatValue(stats.views);
  const likes = parseStatValue(stats.likes);
  const hasAny = [followers, views, likes].some((value) => value !== null);

  if (!hasAny) return undefined;

  return {
    followers: followers ?? 0,
    views: views ?? 0,
    likes: likes ?? 0,
  };
}

function createRepresentativeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createRepresentative(): AssociationRepresentative {
  return {
    id: createRepresentativeId(),
    role: "",
    name: "",
    email: "",
    phone: "",
  };
}

function normalizeRepresentative(rep: AssociationRepresentative) {
  return {
    id: rep.id,
    role: normalize(rep.role),
    name: normalize(rep.name),
    email: normalize(rep.email ?? ""),
    phone: normalize(rep.phone ?? ""),
  };
}

function serializeRepresentatives(reps: AssociationRepresentative[]) {
  return JSON.stringify(reps.map(normalizeRepresentative));
}

function cleanRepresentatives(reps: AssociationRepresentative[]) {
  return reps
    .map((rep) => ({
      id: rep.id || createRepresentativeId(),
      role: normalize(rep.role),
      name: normalize(rep.name),
      email: normalize(rep.email ?? ""),
      phone: normalize(rep.phone ?? ""),
    }))
    .filter((rep) => rep.role || rep.name || rep.email || rep.phone)
    .map((rep) => ({
      id: rep.id,
      role: rep.role,
      name: rep.name,
      email: rep.email || undefined,
      phone: rep.phone || undefined,
    }));
}

function getAssociationFormState(
  association: ReturnType<typeof useSessionStore.getState>["association"]
): ProfileFormState {
  return {
    name: association?.name ?? "",
    logoUrl: association?.logoUrl ?? "",
    taxId: association?.taxId ?? "",
    phone: association?.phone ?? "",
    contactEmail: association?.contactEmail ?? "",
    location: association?.location ?? "",
    address: association?.address ?? "",
    socialLinks: normalizeSocialLinks(association?.socialLinks),
    socialStats: normalizeSocialStats(association?.socialStats),
    representatives:
      association?.representatives?.map((rep) => ({
        id: rep.id || createRepresentativeId(),
        role: rep.role ?? "",
        name: rep.name ?? "",
        email: rep.email ?? "",
        phone: rep.phone ?? "",
      })) ?? [],
  };
}

export default function AssociationProfilePage() {
  const router = useRouter();
  const hydrated = useSessionStore((s) => s.hydrated);
  const association = useSessionStore((s) => s.association);
  const companyCode = useSessionStore((s) => s.companyCode);
  const setAssociation = useSessionStore((s) => s.setAssociation);
  const removeAssociation = useSessionStore((s) => s.removeAssociation);
  const activeAssociationId = useSessionStore((s) => s.activeAssociationId);
  const logout = useSessionStore((s) => s.logout);
  const activeUserId = useSessionStore((s) => s.activeUserId);

  const users = useUsersStore((s) => s.users);
  const activeUser = users.find((user) => user.id === activeUserId) ?? null;
  const canEditAssociation = activeUser?.role === "Admin";

  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  const initialForm = useMemo(
    () => getAssociationFormState(association),
    [association]
  );
  const [form, setForm] = useState<ProfileFormState>(initialForm);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const hasChanges = useMemo(() => {
    return (
      normalize(form.name) !== normalize(initialForm.name) ||
      normalize(form.logoUrl) !== normalize(initialForm.logoUrl) ||
      normalize(form.taxId) !== normalize(initialForm.taxId) ||
      normalize(form.phone) !== normalize(initialForm.phone) ||
      normalize(form.contactEmail) !== normalize(initialForm.contactEmail) ||
      normalize(form.location) !== normalize(initialForm.location) ||
      normalize(form.address) !== normalize(initialForm.address) ||
      serializeSocialLinks(form.socialLinks) !==
        serializeSocialLinks(initialForm.socialLinks) ||
      serializeSocialStats(form.socialStats) !==
        serializeSocialStats(initialForm.socialStats) ||
      serializeRepresentatives(form.representatives) !==
        serializeRepresentatives(initialForm.representatives)
    );
  }, [form, initialForm]);

  const canSave = normalize(form.name).length > 0 && hasChanges;

  const handleLogoChange = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, logoUrl: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRepresentativeChange = (
    id: string,
    field: RepresentativeField,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      representatives: prev.representatives.map((rep) =>
        rep.id === id ? { ...rep, [field]: value } : rep
      ),
    }));
  };

  const handleAddRepresentative = () => {
    setForm((prev) => ({
      ...prev,
      representatives: [...prev.representatives, createRepresentative()],
    }));
  };

  const handleRemoveRepresentative = (id: string) => {
    setForm((prev) => ({
      ...prev,
      representatives: prev.representatives.filter((rep) => rep.id !== id),
    }));
  };

  const handleSave = () => {
    if (!canEditAssociation) return;
    const name = normalize(form.name);
    if (!name) return;
    const representatives = cleanRepresentatives(form.representatives);
    const socialLinks = cleanSocialLinks(form.socialLinks);
    const socialStats = cleanSocialStats(form.socialStats);

    setAssociation({
      name,
      logoUrl: form.logoUrl || undefined,
      taxId: normalize(form.taxId) || undefined,
      phone: normalize(form.phone) || undefined,
      contactEmail: normalize(form.contactEmail) || undefined,
      location: normalize(form.location) || undefined,
      address: normalize(form.address) || undefined,
      representatives: representatives.length ? representatives : undefined,
      socialLinks,
      socialStats,
    });
    setLastSavedAt(Date.now());
  };

  const handleDeleteAssociation = () => {
    if (!canEditAssociation || !activeAssociationId) return;
    removeAssociation(activeAssociationId);
    logout();
    router.replace("/login");
  };

  if (!hydrated) {
    return <div className="min-h-screen bg-background-light" aria-busy="true" />;
  }

  return (
    <div className="space-y-8">
      <PageTopbar>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              Configuración &nbsp;&gt;&nbsp; Perfil de Asociación
            </p>
            <h1 className="text-2xl font-semibold text-gray-900">
              Perfil de Asociación
            </h1>
            <p className="text-sm text-gray-500">
              Actualiza la información legal y de contacto de tu asociación.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow-sm"
            >
              ← Volver a configuracion
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById("association-save")?.click()
              }
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </PageTopbar>

      {!canEditAssociation ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
          Solo los administradores pueden editar el perfil de la asociación.
        </div>
      ) : null}

      {!canEditAssociation ? null : (
        <>
          <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Identidad visual
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Carga el logotipo oficial de tu asociación. Este se utilizará en
                facturas, documentos PDF y en el portal de socios.
              </p>
            </div>
            <label className="group flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500 transition hover:border-primary/40">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="sr-only"
                onChange={(event) => handleLogoChange(event.target.files?.[0])}
              />
              {form.logoUrl ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <img
                      src={form.logoUrl}
                      alt={form.name || "Logo asociación"}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    Haz clic para reemplazar el logo
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      setForm((prev) => ({ ...prev, logoUrl: "" }));
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500 shadow-sm hover:bg-gray-50"
                  >
                    Quitar logo
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm text-gray-400">
                    <span className="material-symbols-outlined text-[32px]">
                      upload
                    </span>
                  </div>
                  <p className="mt-4 font-semibold text-primary">
                    Haz clic para subir un logo
                  </p>
                  <p className="text-xs text-gray-400">
                    Formatos recomendados: SVG, PNG de alta calidad (Max. 5MB)
                  </p>
                </div>
              )}
            </label>
          </section>

          <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Información general
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Estos datos se sincronizan con la información registrada al
                crear la asociación.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Código de asociación
                </label>
                <input
                  value={companyCode ?? "No disponible"}
                  readOnly
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Nombre de la asociación
                </label>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="Asociación Cultural"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    NIF / CIF
                  </label>
                  <input
                    value={form.taxId}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, taxId: event.target.value }))
                    }
                    placeholder="G12345678"
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">
                    Teléfono
                  </label>
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    placeholder="+34 600 000 000"
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Correo electrónico de contacto
                </label>
                <input
                  value={form.contactEmail}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      contactEmail: event.target.value,
                    }))
                  }
                  placeholder="contacto@asociacion.org"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Ciudad / Provincia
                </label>
                <input
                  value={form.location}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Madrid"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">
                  Dirección social (opcional)
                </label>
                <textarea
                  value={form.address}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      address: event.target.value,
                    }))
                  }
                  placeholder="Calle de la Innovación 42, 28014 Madrid, España"
                  className="mt-2 min-h-[110px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Redes sociales
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Añade los enlaces oficiales y las métricas globales de tu
                comunidad.
              </p>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Enlaces oficiales
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Solo se mostrarán las redes que tengan un enlace asociado.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {SOCIAL_LINKS.map((link) => (
                    <div key={link.key}>
                      <label className="text-sm font-semibold text-gray-700">
                        {link.label}
                      </label>
                      <div className="relative mt-2">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
                          <span className="material-symbols-outlined text-[18px]">
                            {link.icon}
                          </span>
                        </span>
                        <input
                          value={form.socialLinks[link.key]}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              socialLinks: {
                                ...prev.socialLinks,
                                [link.key]: event.target.value,
                              },
                            }))
                          }
                          placeholder={link.placeholder}
                          className="w-full rounded-2xl border border-gray-200 bg-white px-10 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  Estos enlaces se mostrarán en el dashboard y el módulo de
                  redes.
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Métricas globales
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Se usan para el resumen del dashboard y del módulo de redes.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      Seguidores totales
                    </label>
                    <input
                      inputMode="numeric"
                      type="number"
                      min="0"
                      value={form.socialStats.followers}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          socialStats: {
                            ...prev.socialStats,
                            followers: event.target.value,
                          },
                        }))
                      }
                      placeholder="15000"
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      Visualizaciones totales
                    </label>
                    <input
                      inputMode="numeric"
                      type="number"
                      min="0"
                      value={form.socialStats.views}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          socialStats: {
                            ...prev.socialStats,
                            views: event.target.value,
                          },
                        }))
                      }
                      placeholder="245000"
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">
                      Me gustas totales
                    </label>
                    <input
                      inputMode="numeric"
                      type="number"
                      min="0"
                      value={form.socialStats.likes}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          socialStats: {
                            ...prev.socialStats,
                            likes: event.target.value,
                          },
                        }))
                      }
                      placeholder="8200"
                      className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Representantes de la asociación
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Registra los cargos principales de la junta directiva para
                tenerlos siempre disponibles en documentos y comunicados.
              </p>
            </div>
            <div className="space-y-4">
              {form.representatives.length > 0 ? (
                form.representatives.map((rep, index) => (
                  <div
                    key={rep.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                        Representante {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveRepresentative(rep.id)}
                        className="rounded-xl border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-500 shadow-sm hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-semibold text-gray-700">
                          Cargo
                        </label>
                        <input
                          list="association-representative-roles"
                          value={rep.role}
                          onChange={(event) =>
                            handleRepresentativeChange(
                              rep.id,
                              "role",
                              event.target.value
                            )
                          }
                          placeholder="Presidente"
                          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">
                          Nombre completo
                        </label>
                        <input
                          value={rep.name}
                          onChange={(event) =>
                            handleRepresentativeChange(
                              rep.id,
                              "name",
                              event.target.value
                            )
                          }
                          placeholder="Ana Pérez"
                          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">
                          Correo electrónico (opcional)
                        </label>
                        <input
                          value={rep.email ?? ""}
                          onChange={(event) =>
                            handleRepresentativeChange(
                              rep.id,
                              "email",
                              event.target.value
                            )
                          }
                          placeholder="presidencia@asociacion.org"
                          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700">
                          Teléfono (opcional)
                        </label>
                        <input
                          value={rep.phone ?? ""}
                          onChange={(event) =>
                            handleRepresentativeChange(
                              rep.id,
                              "phone",
                              event.target.value
                            )
                          }
                          placeholder="+34 600 000 000"
                          className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  Todavía no hay representantes registrados.
                </div>
              )}
              <button
                type="button"
                onClick={handleAddRepresentative}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 shadow-sm hover:bg-gray-50"
              >
                + Añadir representante
              </button>
              <datalist id="association-representative-roles">
                <option value="Presidente" />
                <option value="Vicepresidente" />
                <option value="Secretario" />
                <option value="Tesorero" />
                <option value="Vocal" />
                <option value="Coordinador" />
              </datalist>
            </div>
          </section>

          {canEditAssociation ? (
            <section className="grid grid-cols-1 gap-6 rounded-3xl border border-rose-200 bg-rose-50/40 p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
              <div>
                <h2 className="text-lg font-semibold text-rose-700">
                  Eliminar asociación
                </h2>
                <p className="mt-2 text-sm text-rose-600">
                  Esta acción elimina la asociación activa y cerrará tu sesión.
                </p>
              </div>
              <div className="flex items-center justify-start lg:justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="rounded-2xl border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 shadow-sm hover:bg-rose-100"
                >
                  Eliminar asociación
                </button>
              </div>
            </section>
          ) : null}

          <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span
                className={`h-2 w-2 rounded-full ${
                  hasChanges ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
              {hasChanges
                ? "Hay cambios pendientes de guardar"
                : lastSavedAt
                  ? "Cambios guardados"
                  : "Sin cambios pendientes"}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(initialForm)}
                disabled={!hasChanges}
                className={`rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  hasChanges
                    ? "text-gray-600 hover:bg-gray-50"
                    : "cursor-not-allowed text-gray-300 opacity-60"
                }`}
              >
                Descartar
              </button>
              <button
                id="association-save"
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className={`rounded-2xl px-5 py-2 text-sm font-semibold text-white shadow transition ${
                  canSave
                    ? "bg-primary hover:bg-primary/90"
                    : "cursor-not-allowed bg-primary/50"
                }`}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </>
      )}

      {portalReady && deleteOpen
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={() => setDeleteOpen(false)}
              />
              <div className="relative w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                    <span className="material-symbols-outlined text-[20px]">
                      delete
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Confirmar eliminación
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      ¿Eliminar la asociación activa? Esta acción no se puede
                      deshacer.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(false)}
                    className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAssociation}
                    className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    Eliminar asociación
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
