"use client";

import { useEffect } from "react";
import { useAppearanceStore } from "@/core/appearance/appearance.store";

const DEFAULT_PRIMARY = "#1152D4";

function hexToRgbChannels(hex: string) {
  const clean = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export default function AppearanceSync() {
  const brandColor = useAppearanceStore((s) => s.brandColor);
  const theme = useAppearanceStore((s) => s.theme);
  const fontScale = useAppearanceStore((s) => s.fontScale);

  useEffect(() => {
    const root = document.documentElement;
    const rgb =
      hexToRgbChannels(brandColor) ?? hexToRgbChannels(DEFAULT_PRIMARY);
    if (rgb) {
      root.style.setProperty("--color-primary", rgb);
    }
    root.style.setProperty("--font-scale", String(fontScale || 1));

    if (theme !== "system") {
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const next = media.matches ? "dark" : "light";
      root.dataset.theme = next;
      root.style.colorScheme = next;
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => {
      media.removeEventListener("change", applyTheme);
    };
  }, [brandColor, fontScale, theme]);

  return null;
}
