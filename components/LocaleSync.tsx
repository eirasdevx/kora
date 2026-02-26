"use client";

import { useEffect } from "react";
import { useLocale } from "@/core/i18n/use-locale";

export default function LocaleSync() {
  const { htmlLang } = useLocale();

  useEffect(() => {
    document.documentElement.lang = htmlLang;
  }, [htmlLang]);

  return null;
}
