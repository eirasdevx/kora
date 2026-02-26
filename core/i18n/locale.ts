import { normalizeLanguage } from "@/core/users/users.store";

export const SUPPORTED_LOCALES = [
  "es",
  "es-419",
  "gl",
  "eu",
  "ca",
  "va",
  "en",
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: LocaleCode = "es";

const LOCALE_LOOKUP = new Set<string>(SUPPORTED_LOCALES);

export const LOCALE_DATE_FORMATS: Record<LocaleCode, string> = {
  es: "es-ES",
  "es-419": "es-419",
  gl: "gl-ES",
  eu: "eu-ES",
  ca: "ca-ES",
  va: "ca-ES-valencia",
  en: "en-US",
};

export const LOCALE_HTML_LANG: Record<LocaleCode, string> = {
  es: "es-ES",
  "es-419": "es-419",
  gl: "gl-ES",
  eu: "eu-ES",
  ca: "ca-ES",
  va: "ca-ES-valencia",
  en: "en-US",
};

export const resolveLocale = (value?: string): LocaleCode => {
  const normalized = normalizeLanguage(value);
  if (LOCALE_LOOKUP.has(normalized)) {
    return normalized as LocaleCode;
  }
  return DEFAULT_LOCALE;
};
