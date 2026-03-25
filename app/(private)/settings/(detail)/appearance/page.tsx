"use client";

import { useMemo, useState } from "react";
import SettingsPageHeader from "@/components/shared/SettingsPageHeader";
import { useAppearanceStore } from "@/core/appearance/appearance.store";

const colorSwatches = [
  "#1D4ED8",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
];

const themeOptions = [
  {
    id: "light",
    label: "Tema Claro",
    previewClass: "bg-white",
  },
  {
    id: "dark",
    label: "Tema Oscuro",
    previewClass: "bg-gray-900",
  },
  {
    id: "system",
    label: "Tema del Sistema",
    previewClass: "bg-gradient-to-br from-white to-gray-900",
  },
] as const;

function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return withHash.toUpperCase();
}

function isValidHex(value: string) {
  return /^#[0-9A-F]{6}$/.test(value);
}

export default function AppearanceSettingsPage() {
  const brandColor = useAppearanceStore((s) => s.brandColor);
  const theme = useAppearanceStore((s) => s.theme);
  const fontScale = useAppearanceStore((s) => s.fontScale);
  const setAppearance = useAppearanceStore((s) => s.setAppearance);

  const [draft, setDraft] = useState(() => ({
    brandColor,
    theme,
    fontScale,
  }));

  const normalizedDraftColor = useMemo(
    () => normalizeHex(draft.brandColor),
    [draft.brandColor]
  );
  const normalizedStoredColor = useMemo(
    () => normalizeHex(brandColor),
    [brandColor]
  );
  const hasValidColor = isValidHex(normalizedDraftColor);

  const hasChanges =
    normalizedDraftColor !== normalizedStoredColor ||
    draft.theme !== theme ||
    draft.fontScale !== fontScale;

  const previewColor = hasValidColor
    ? normalizedDraftColor
    : normalizedStoredColor;

  const sliderValue = Math.round((draft.fontScale || 1) * 100);

  const applyChanges = () => {
    if (!hasValidColor) return;
    setAppearance({
      brandColor: normalizedDraftColor,
      theme: draft.theme,
      fontScale: draft.fontScale,
    });
  };

  const discardChanges = () => {
    setDraft({ brandColor, theme, fontScale });
  };

  return (
    <div className="space-y-8">
      <SettingsPageHeader
        section="Apariencia"
        title="Apariencia"
        subtitle="Personaliza el aspecto visual de tu plataforma para adaptarla a tu imagen corporativa."
      />

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Color de Marca</h2>
          <p className="mt-2 text-sm text-gray-500">
            Define el color principal que se utilizara en botones, enlaces y
            elementos destacados.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {colorSwatches.map((color) => {
              const isActive =
                normalizeHex(color) === normalizedDraftColor;
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Color ${color}`}
                  onClick={() =>
                    setDraft((prev) => ({ ...prev, brandColor: color }))
                  }
                  className={`h-12 w-12 rounded-2xl border-2 transition ${
                    isActive ? "border-primary" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              );
            })}
          </div>
          <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Código hexadecimal
              </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                value={draft.brandColor}
                onChange={(e) => {
                  const raw = e.target.value;
                  const next = raw
                    ? raw.startsWith("#")
                      ? raw
                      : `#${raw}`
                    : "";
                  setDraft((prev) => ({
                    ...prev,
                    brandColor: next.toUpperCase(),
                  }));
                }}
                className={`w-full rounded-2xl border px-4 py-3 text-sm text-gray-700 shadow-sm ${
                  hasValidColor ? "border-gray-200" : "border-rose-300"
                }`}
                placeholder="#1152D4"
              />
              <div
                className="h-12 w-24 rounded-2xl border border-gray-200"
                style={{ backgroundColor: previewColor || "#FFFFFF" }}
              />
            </div>
            {!hasValidColor && draft.brandColor ? (
              <p className="mt-2 text-xs text-rose-500">
                Usa un código HEX válido de 6 caracteres.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tema de Interfaz</h2>
          <p className="mt-2 text-sm text-gray-500">
            Elige entre una apariencia clara para mayor legibilidad o una
            oscura para reducir la fatiga visual.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {themeOptions.map((option) => {
            const active = draft.theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  setDraft((prev) => ({ ...prev, theme: option.id }))
                }
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={`h-28 rounded-xl shadow-sm ${option.previewClass}`}
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">
                    {option.label}
                  </span>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      active
                        ? "bg-primary text-white"
                        : "border border-gray-300"
                    }`}
                  >
                    {active ? (
                      <span className="material-symbols-outlined text-[16px] leading-none">
                        check
                      </span>
                    ) : null}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Escala tipografica
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Ajusta el tamaño base del texto para optimizar la experiencia de
            lectura.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
            <span>Compacto</span>
            <span>Estandar</span>
            <span>Accesible</span>
          </div>
          <input
            type="range"
            min={90}
            max={110}
            step={1}
            value={sliderValue}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                fontScale: Number(e.target.value) / 100,
              }))
            }
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            Previsualizacion de texto:{" "}
            <span
              style={{
                fontSize: `${draft.fontScale}rem`,
              }}
            >
              La asociación gestiona eficazmente sus recursos.
            </span>
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white px-6 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-500">
          {hasChanges
            ? "Cambios sin guardar en la apariencia."
            : "No hay cambios pendientes."}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={discardChanges}
            disabled={!hasChanges}
            className={`rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold ${
              hasChanges
                ? "text-gray-600 hover:bg-gray-50"
                : "cursor-not-allowed text-gray-300"
            }`}
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={applyChanges}
            disabled={!hasChanges || !hasValidColor}
            className={`rounded-2xl px-5 py-2 text-sm font-semibold text-white shadow ${
              hasChanges && hasValidColor
                ? "bg-primary hover:bg-primary/90"
                : "cursor-not-allowed bg-primary/50"
            }`}
          >
            Aplicar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
