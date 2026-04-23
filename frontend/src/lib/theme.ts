"use client";

import { useEffect, useState } from "react";

export type AccentKey = "clay" | "sage" | "navy" | "terra";
export type ThemeMode = "light" | "dark";
export type SidebarVariant = "dark" | "light";
export type Density = "balanced" | "compact";

export interface Tweaks {
  accent: AccentKey;
  theme: ThemeMode;
  sidebar: SidebarVariant;
  density: Density;
}

export const DEFAULT_TWEAKS: Tweaks = {
  accent: "clay",
  theme: "light",
  sidebar: "dark",
  density: "balanced",
};

export const ACCENTS: Record<AccentKey, { accent: string; accentSoft: string; accentInk: string }> = {
  clay: { accent: "#8a6d3b", accentSoft: "#f0e6d2", accentInk: "#5a4721" },
  sage: { accent: "#6b7a5a", accentSoft: "#e6ebdb", accentInk: "#3e4934" },
  navy: { accent: "#3b5a8a", accentSoft: "#dde4ef", accentInk: "#1f3459" },
  terra: { accent: "#935d4c", accentSoft: "#eddcd4", accentInk: "#5c3225" },
};

const STORAGE_KEY = "pmo.tweaks";

export function applyTweaks(t: Tweaks) {
  if (typeof document === "undefined") return;
  const a = ACCENTS[t.accent] ?? ACCENTS.clay;
  const r = document.documentElement;
  r.style.setProperty("--accent", a.accent);
  r.style.setProperty("--accent-soft", a.accentSoft);
  r.style.setProperty("--accent-ink", a.accentInk);

  document.body.classList.toggle("theme-dark", t.theme === "dark");
  document.body.classList.toggle("sidebar-light", t.sidebar === "light");

  if (t.sidebar === "light") {
    r.style.setProperty("--sidebar-bg", "#f5f2ec");
    r.style.setProperty("--sidebar-text", "#5a5852");
    r.style.setProperty("--sidebar-text-strong", "#1a1d21");
    r.style.setProperty("--sidebar-border", "#e6e1d5");
    r.style.setProperty("--sidebar-active", "#ffffff");
    r.style.setProperty("--sidebar-active-ink", "#1a1d21");
  } else {
    r.style.removeProperty("--sidebar-bg");
    r.style.removeProperty("--sidebar-text");
    r.style.removeProperty("--sidebar-text-strong");
    r.style.removeProperty("--sidebar-border");
    r.style.removeProperty("--sidebar-active");
    r.style.removeProperty("--sidebar-active-ink");
  }

  if (t.density === "compact") {
    r.style.setProperty("--row-h", "36px");
  } else {
    r.style.removeProperty("--row-h");
  }
}

export function loadTweaks(): Tweaks {
  if (typeof window === "undefined") return DEFAULT_TWEAKS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TWEAKS;
    const parsed = JSON.parse(raw) as Partial<Tweaks>;
    return { ...DEFAULT_TWEAKS, ...parsed };
  } catch {
    return DEFAULT_TWEAKS;
  }
}

export function saveTweaks(t: Tweaks) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  } catch {
    /* no-op */
  }
}

export function useTweaks() {
  const [tweaks, setTweaksState] = useState<Tweaks>(DEFAULT_TWEAKS);

  useEffect(() => {
    const t = loadTweaks();
    setTweaksState(t);
    applyTweaks(t);
  }, []);

  const setTweaks = (t: Tweaks) => {
    setTweaksState(t);
    applyTweaks(t);
    saveTweaks(t);
  };

  return { tweaks, setTweaks };
}
