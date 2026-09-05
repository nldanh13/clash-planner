import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { vi } from "./locales/vi";

/**
 * `vi` is the reference dictionary. Adding a language later means creating
 * `locales/en.ts` with this exact same nested shape — TypeScript will refuse
 * to compile until every key has a translation, so a locale can't ship
 * half-finished — then adding it to `dictionaries` and `Locale` below.
 */
export type Dictionary = typeof vi;
export type Locale = "vi";

export const dictionaries: Record<Locale, Dictionary> = { vi };
export const DEFAULT_LOCALE: Locale = "vi";

const STORAGE_KEY = "clash-path-locale";

// Dot-joined union of every string leaf's path, e.g. "common.hero" —
// gives t() autocomplete and a compile error on a typo'd or removed key.
type DotPaths<T> = T extends string
  ? never
  : { [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPaths<T[K]>}` }[keyof T & string];

export type TranslationKey = DotPaths<Dictionary>;

function resolve(dict: Dictionary, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown> | undefined)?.[key], dict);
  if (typeof value !== "string") {
    console.warn(`[i18n] Missing translation for key "${path}"`);
    return path;
  }
  return value;
}

/** Fills `{name}`-style placeholders in a translated string. */
function interpolate(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({ locale: DEFAULT_LOCALE, setLocale: () => {} });

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved in dictionaries) return saved as Locale;
    } catch {
      // localStorage unavailable (private mode, etc.) — fall back silently.
    }
    return DEFAULT_LOCALE;
  });

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore — the choice just won't persist across reloads.
    }
  }, []);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return React.createElement(LocaleContext.Provider, { value }, children);
}

export function useTranslation() {
  const { locale, setLocale } = useContext(LocaleContext);
  const dict = dictionaries[locale];

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => interpolate(resolve(dict, key), vars),
    [dict]
  );

  return { t, locale, setLocale };
}
