"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import type { ChangeEvent } from "react";
import { useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "chaosdeck-theme";
const THEME_CHANGE_EVENT = "chaosdeck-theme-change";

const THEME_OPTIONS = [
  { value: "default", label: "Original" },
  { value: "charcoal", label: "Charcoal" },
  { value: "plum", label: "Plum" },
  { value: "tide", label: "Tide" },
] as const;

type ThemeFamily = (typeof THEME_OPTIONS)[number]["value"];
type ThemeMode = "dark" | "light";
type ThemeValue = ThemeFamily | `${Exclude<ThemeFamily, "default">}-light` | "default-light";

const isThemeValue = (value: string | null): value is ThemeValue => {
  return value === "default" || value === "default-light" || THEME_OPTIONS.some((theme) => theme.value === value || `${theme.value}-light` === value);
};

const parseThemeValue = (value: string | null): { family: ThemeFamily; mode: ThemeMode } => {
  if (!isThemeValue(value)) {
    return { family: "default", mode: "dark" };
  }

  if (value.endsWith("-light")) {
    return { family: value.slice(0, -6) as ThemeFamily, mode: "light" };
  }

  return { family: value as ThemeFamily, mode: "dark" };
};

const toThemeValue = (family: ThemeFamily, mode: ThemeMode): ThemeValue => {
  if (family === "default" && mode === "dark") return "default";
  return `${family}${mode === "light" ? "-light" : ""}` as ThemeValue;
};

const applyTheme = (theme: ThemeValue) => {
  const root = document.documentElement;
  if (theme === "default") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", theme);
};

function SwordIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-orchid-hush">
      <path
        d="M5 19l4.5-4.5m0 0L20 4l-3 1-1-3-10.5 10.5M9.5 14.5L4 20l3-1 1 3 5.5-5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ThemeSelector() {
  const { isLoaded, isSignedIn } = useUser();
  const themeValue = useSyncExternalStore(
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

  const { family, mode } = parseThemeValue(themeValue);

  const handleFamilyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextFamily = event.target.value;
    if (!THEME_OPTIONS.some((theme) => theme.value === nextFamily)) return;
    const nextTheme = toThemeValue(nextFamily as ThemeFamily, mode);
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  const handleModeToggle = () => {
    const nextMode: ThemeMode = mode === "dark" ? "light" : "dark";
    const nextTheme = toThemeValue(family, nextMode);
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <header className="fixed inset-x-4 top-4 z-50">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 rounded-[18px] border border-foreground/15 bg-background/90 px-4 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <Link href="/" className="flex items-center gap-3" aria-label="ChaosDeck home">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-foreground/15 bg-background/70 shadow-inner shadow-black/10">
            <SwordIcon />
          </span>
          <span className="flex flex-col">
            <span className="font-semibold tracking-tight text-orchid-hush">ChaosDeck</span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.28em] text-ash-grey/80 sm:inline">MTG deckbuilder</span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-full border border-foreground/15 bg-background/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-ash-grey/80">
            <span className="hidden sm:inline">Themes</span>
            <select
              value={family}
              onChange={handleFamilyChange}
              className="tech-control min-w-24 bg-background/70 px-2 py-1 text-[11px] text-orchid-hush outline-none"
              aria-label="Theme family"
            >
              {THEME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleModeToggle}
              className="tech-button px-3 py-1 text-[11px] font-semibold text-orchid-hush transition"
              aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
            >
              {mode === "dark" ? "Dark" : "Light"}
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-foreground/15 bg-background/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-ash-grey/80">
            <span className="hidden sm:inline">Profile</span>
            {isLoaded ? (
              isSignedIn ? (
                <UserButton />
              ) : (
                <Link href="/sign-in" className="rounded-full border border-foreground/10 px-3 py-1 text-[11px] text-orchid-hush transition hover:border-orchid-hush/40">
                  Sign in
                </Link>
              )
            ) : (
              <span className="text-ash-grey/60">…</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
