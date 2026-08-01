import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Theme = "crimson" | "arctic" | "gold";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "crimson",
  setTheme: () => {},
});

const THEME_STORAGE_KEY = "opus-devia-theme";

const THEME_GRADIENTS: Record<Theme, { before: string; after: string }> = {
  crimson: {
    before:
      "radial-gradient(ellipse 1200px 1000px at 50% 90%, rgba(180, 0, 0, 0.72) 0%, rgba(154, 0, 0, 0.42) 14%, rgba(90, 0, 0, 0.18) 36%, transparent 58%)",
    after:
      "linear-gradient(0deg, rgba(154, 0, 0, 0.24) 0%, rgba(100, 0, 0, 0.10) 20%, rgba(60, 0, 0, 0.04) 45%, transparent 70%)",
  },
  arctic: {
    before:
      "radial-gradient(ellipse 1200px 1000px at 50% 85%, rgba(120, 200, 255, 0.38) 0%, rgba(60, 160, 230, 0.22) 14%, rgba(20, 100, 180, 0.10) 36%, rgba(0, 40, 80, 0.04) 52%, transparent 62%)",
    after:
      "linear-gradient(0deg, rgba(80, 180, 240, 0.14) 0%, rgba(40, 130, 200, 0.06) 20%, rgba(10, 60, 120, 0.03) 45%, transparent 70%)",
  },
  gold: {
    before:
      "radial-gradient(ellipse 1200px 1000px at 50% 90%, rgba(255, 200, 20, 0.22) 0%, rgba(240, 180, 10, 0.14) 14%, rgba(200, 145, 0, 0.07) 36%, rgba(255, 235, 180, 0.03) 52%, transparent 62%)",
    after:
      "linear-gradient(0deg, rgba(250, 240, 220, 0.35) 0%, rgba(245, 235, 210, 0.20) 20%, rgba(255, 245, 225, 0.08) 45%, transparent 70%)",
  },
};

const THEME_ACCENT: Record<Theme, string> = {
  crimson: "#9a0000",
  arctic: "#5bb8f0",
  gold: "#e6a800",
};

/* Arctic-specific glass & dock variables */
const ARCTIC_GLASS = {
  "--glass-base-top": "rgba(14, 22, 30, 0.45)",
  "--glass-base-bot": "rgba(10, 16, 22, 0.52)",
  "--glass-border": "rgba(140, 210, 255, 0.25)",
  "--glass-highlight": "rgba(200, 230, 255, 0.10)",
  "--glass-blur": "16px",
  "--glass-saturate": "140%",
  "--dock-bg-top": "rgba(16, 24, 34, 0.55)",
  "--dock-bg-bot": "rgba(10, 16, 24, 0.65)",
  "--dock-border": "rgba(140, 210, 255, 0.30)",
  "--dock-accent-glow": "rgba(80, 180, 240, 0.5)",
  "--card-accent-glow": "rgba(80, 160, 230, 0.08)",
  "--dock-bg":
    "linear-gradient(180deg, rgba(18, 28, 40, 0.6) 0%, rgba(10, 18, 30, 0.72) 100%)",
  "--dock-border-style": "1px solid rgba(130, 200, 250, 0.28)",
  "--dock-shadow":
    "0 12px 48px rgba(0, 20, 50, 0.55), 0 0 0 1px rgba(140, 210, 255, 0.06) inset, 0 1px 0 rgba(180, 220, 255, 0.1)",
  "--theme-accent-glow": "rgba(90, 195, 250, 0.7)",
  "--theme-accent-dim": "rgba(80, 180, 240, 0.35)",
  "--pill-bg":
    "linear-gradient(135deg, rgba(20,50,80,0.85) 0%, rgba(10,25,45,0.9) 100%)",
  "--settings-card-bg": "rgba(12, 22, 34, 0.65)",
  "--settings-avatar-bg": "#06101c",
  /* Glossy pill (arctic = icy blue solid 45%) */
  "--glossy-pill-bg": "linear-gradient(180deg, rgba(120,200,240,0.45) 0%, rgba(60,150,210,0.45) 50%, rgba(30,100,170,0.45) 100%)",
  "--glossy-pill-border": "rgba(140,210,255,0.5)",
  "--glossy-pill-shadow": "inset 0 2px 0 rgba(200,235,255,0.4), inset 0 -1px 0 rgba(30,80,140,0.3), 0 4px 18px rgba(30,110,180,0.3), 0 0 24px rgba(60,160,220,0.2)",
  "--glossy-pill-shine": "linear-gradient(180deg, rgba(220,245,255,0.55) 0%, rgba(180,225,250,0.15) 50%, transparent 100%)",
  "--glossy-pill-shadow-hover": "inset 0 2px 0 rgba(210,240,255,0.5), 0 6px 22px rgba(30,110,180,0.4), 0 0 32px rgba(80,180,240,0.3)",
};

const CRIMSON_GLASS = {
  "--glass-base-top": "rgba(22, 22, 26, 0.9)",
  "--glass-base-bot": "rgba(14, 14, 18, 0.94)",
  "--glass-border": "rgba(255, 255, 255, 0.12)",
  "--glass-highlight": "rgba(255, 255, 255, 0.04)",
  "--glass-blur": "4px",
  "--glass-saturate": "100%",
  "--dock-bg-top": "rgba(26, 26, 30, 0.95)",
  "--dock-bg-bot": "rgba(14, 14, 18, 0.97)",
  "--dock-border": "rgba(255, 255, 255, 0.18)",
  "--dock-accent-glow": "rgba(193, 0, 0, 0.7)",
  "--card-accent-glow": "rgba(154, 0, 0, 0.04)",
  "--dock-bg":
    "linear-gradient(180deg, rgba(26, 26, 30, 0.95) 0%, rgba(14, 14, 18, 0.97) 100%)",
  "--dock-border-style": "1px solid rgba(255, 255, 255, 0.18)",
  "--dock-shadow":
    "0 10px 30px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(0, 0, 0, 0.4)",
  "--theme-accent-glow": "rgba(193, 0, 0, 0.7)",
  "--theme-accent-dim": "rgba(154, 0, 0, 0.5)",
  "--pill-bg":
    "linear-gradient(135deg, rgba(120,10,10,0.9) 0%, rgba(40,4,4,0.95) 100%)",
  "--settings-card-bg": "rgba(22, 14, 14, 0.75)",
  "--settings-avatar-bg": "#140505",
  /* Glossy pill (crimson = same as current, no change) */
  "--glossy-pill-bg": "linear-gradient(180deg, rgba(193,0,0,0.9) 0%, rgba(120,0,0,0.9) 50%, rgba(60,0,0,0.95) 100%)",
  "--glossy-pill-border": "rgba(220,60,60,0.5)",
  "--glossy-pill-shadow": "inset 0 2px 0 rgba(255,255,255,0.15), 0 4px 16px rgba(154,0,0,0.4)",
  "--glossy-pill-shine": "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
  "--glossy-pill-shadow-hover": "inset 0 2px 0 rgba(255,255,255,0.2), 0 6px 22px rgba(154,0,0,0.5), 0 0 28px rgba(193,0,0,0.3)",
};

const GOLD_GLASS = {
  "--glass-base-top": "rgba(255, 255, 255, 0.75)",
  "--glass-base-bot": "rgba(250, 248, 242, 0.82)",
  "--glass-border": "rgba(230, 168, 0, 0.35)",
  "--glass-highlight": "rgba(255, 252, 240, 0.25)",
  "--glass-blur": "20px",
  "--glass-saturate": "150%",
  "--dock-bg-top": "rgba(255, 255, 255, 0.78)",
  "--dock-bg-bot": "rgba(248, 245, 238, 0.85)",
  "--dock-border": "rgba(230, 168, 0, 0.40)",
  "--dock-accent-glow": "rgba(230, 168, 0, 0.65)",
  "--card-accent-glow": "rgba(240, 180, 10, 0.18)",
  "--dock-bg":
    "linear-gradient(180deg, rgba(255, 255, 255, 0.78) 0%, rgba(248, 245, 238, 0.85) 100%)",
  "--dock-border-style": "1px solid rgba(230, 168, 0, 0.38)",
  "--dock-shadow":
    "0 12px 48px rgba(180, 130, 20, 0.25), 0 0 0 1px rgba(240, 180, 10, 0.10) inset, 0 2px 0 rgba(255, 252, 240, 0.4)",
  "--theme-accent-glow": "rgba(240, 180, 10, 0.8)",
  "--theme-accent-dim": "rgba(230, 168, 0, 0.45)",
  "--pill-bg":
    "linear-gradient(135deg, rgba(255, 210, 40, 0.55) 0%, rgba(230, 168, 0, 0.65) 100%)",
  "--settings-card-bg": "rgba(255, 252, 242, 0.8)",
  "--settings-avatar-bg": "#faf7ed",
  /* Glossy pill (gold = rich gold solid 45%) */
  "--glossy-pill-bg": "linear-gradient(180deg, rgba(255,210,40,0.45) 0%, rgba(230,168,0,0.45) 50%, rgba(180,120,0,0.45) 100%)",
  "--glossy-pill-border": "rgba(200,140,0,0.55)",
  "--glossy-pill-shadow": "inset 0 2px 0 rgba(255,250,220,0.5), inset 0 -1px 0 rgba(140,90,0,0.35), 0 4px 18px rgba(180,120,0,0.3), 0 0 24px rgba(230,165,0,0.22)",
  "--glossy-pill-shine": "linear-gradient(180deg, rgba(255,255,250,0.65) 0%, rgba(255,245,200,0.2) 50%, transparent 100%)",
  "--glossy-pill-shadow-hover": "inset 0 2px 0 rgba(255,252,235,0.6), 0 6px 22px rgba(180,120,0,0.4), 0 0 32px rgba(240,180,10,0.35)",
};

const THEME_GLASS: Record<Theme, Record<string, string>> = {
  crimson: CRIMSON_GLASS,
  arctic: ARCTIC_GLASS,
  gold: GOLD_GLASS,
};

export function getThemeAccent(): string {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  return THEME_ACCENT[stored ?? "crimson"];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return (stored as Theme) ?? "crimson";
  });

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    const g = THEME_GRADIENTS[theme];
    const glass = THEME_GLASS[theme];
    document.documentElement.style.setProperty("--body-before-bg", g.before);
    document.documentElement.style.setProperty("--body-after-bg", g.after);
    document.documentElement.style.setProperty("--theme-accent", THEME_ACCENT[theme]);
    for (const [key, val] of Object.entries(glass)) {
      document.documentElement.style.setProperty(key, val);
    }
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/* Export gradient labels for the settings UI */
export const THEME_LABELS: Record<Theme, { name: string; swatch: string }> = {
  crimson: { name: "Crimson Wash", swatch: "radial-gradient(circle, #9a0000 0%, #3a0000 100%)" },
  arctic: { name: "Arctic Blue", swatch: "radial-gradient(circle at 40% 40%, #c8e8ff 0%, #5bb8f0 40%, #0a1620 100%)" },
  gold: { name: "Radiant Gold", swatch: "radial-gradient(circle at 40% 40%, #fff8e1 0%, #ffd700 35%, #b8860b 100%)" },
};
