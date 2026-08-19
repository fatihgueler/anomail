"use client";

import * as React from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "anomail-theme";

/**
 * Wird vor dem ersten Rendern ausgefuehrt, damit die Seite nie kurz in der
 * falschen Helligkeit aufblitzt. Setzt immer genau eine Klasse auf <html>.
 */
export const THEME_INIT_SCRIPT = `(function(){
  try {
    var stored = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = stored === "dark" || (stored !== "light" && prefersDark);
    document.documentElement.classList.add(dark ? "dark" : "light");
  } catch (error) {
    document.documentElement.classList.add("light");
  }
})();`;

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function readSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch (error) {
    // Privater Modus oder gesperrter Speicher: die Systemeinstellung bleibt gueltig.
    console.warn("Anomail: Helligkeit konnte nicht gelesen werden.", error);
    return "system";
  }
}

function writeStoredPreference(preference: ThemePreference) {
  try {
    if (preference === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch (error) {
    console.warn("Anomail: Helligkeit konnte nicht gespeichert werden.", error);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] =
    React.useState<ThemePreference>("system");
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>("light");

  React.useEffect(() => {
    setPreferenceState(readStoredPreference());
    setSystemTheme(readSystemTheme());

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved: ResolvedTheme =
    preference === "system" ? systemTheme : preference;

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
  }, [resolved]);

  const setPreference = React.useCallback((next: ThemePreference) => {
    writeStoredPreference(next);
    setPreferenceState(next);
  }, []);

  const value = React.useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme muss innerhalb von ThemeProvider genutzt werden.");
  }

  return context;
}
