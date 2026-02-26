"use client";

import { useMemo } from "react";
import { useSessionStore } from "@/core/session/session.store";
import {
  createDefaultPreferences,
  useUsersStore,
} from "@/core/users/users.store";
import {
  LOCALE_DATE_FORMATS,
  LOCALE_HTML_LANG,
  resolveLocale,
} from "./locale";

const DEFAULT_LANGUAGE = createDefaultPreferences().language;

export const useLocale = () => {
  const activeUserId = useSessionStore((s) => s.activeUserId);
  const users = useUsersStore((s) => s.users);

  const activeUser = useMemo(
    () => users.find((user) => user.id === activeUserId) ?? null,
    [users, activeUserId]
  );

  const language = activeUser?.preferences?.language ?? DEFAULT_LANGUAGE;
  const locale = resolveLocale(language);

  return {
    language,
    locale,
    formatLocale: LOCALE_DATE_FORMATS[locale],
    htmlLang: LOCALE_HTML_LANG[locale],
  };
};
