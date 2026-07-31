"use client";

import type { ChangeEvent, ReactElement } from "react";
import { useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "chaosdeck-theme";
const THEME_CHANGE_EVENT = "chaosdeck-theme-change";

const THEME_OPTIONS = [
  { value: "default", label: "Original" },
  { value: "default-light", label: "Original Light" },
  { value: "charcoal", label: "Charcoal" },
  { value: "charcoal-light", label: "Charcoal Light" },
  { value: "plum", label: "Plum" },
  { value: "plum-light", label: "Plum Light" },
  { value: "tide", label: "Tide" },
  { value: "tide-light", label: "Tide Light" },
] as const;

type ThemeValue = (typeof THEME_OPTIONS)[number]["value"];

const isThemeValue = (value: string | null): value is ThemeValue => {
  return THEME_OPTIONS.some((theme) => theme.value === value);
};

const applyTheme = (theme: ThemeValue) => {
  const root = document.documentElement;
  if (theme === "default") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", theme);
};

export default function ThemeSelector(): ReactElement {
  const theme = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
      };
    },
    () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      return isThemeValue(currentTheme) ? currentTheme : "default";
    },
    () => "default",
  );

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextTheme = event.target.value;
    if (!isThemeValue(nextTheme)) return;
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <label className="flex items-center gap-2 rounded-full border border-foreground/15 bg-background/85 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-ash-grey/80 shadow-lg shadow-black/15 backdrop-blur-sm">
        <span>Theme</span>
        <select
          value={theme}
          onChange={handleChange}
          className="tech-control min-w-24 bg-background/60 px-2 py-1 text-[11px] text-orchid-hush outline-none"
          aria-label="Theme"
        >
          {THEME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
