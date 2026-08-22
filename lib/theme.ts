export interface SiteTheme {
  accent: string;
  accent2: string;
  background: string;
  glassOpacity: number;
  glassBlur: number;
  glassBorder: number;
  glowStrength: number;
}

export const DEFAULT_THEME: SiteTheme = {
  accent: "#007bff",
  accent2: "#00c2ff",
  background: "#0a0b12",
  glassOpacity: 0.09,
  glassBlur: 56,
  glassBorder: 0.1,
  glowStrength: 0.22,
};

export const THEME_PRESETS: { id: string; label: string; accent: string; accent2: string }[] = [
  { id: "blue", label: "Синий", accent: "#007bff", accent2: "#00c2ff" },
  { id: "violet", label: "Фиолет", accent: "#7c5cff", accent2: "#c4b5fd" },
  { id: "emerald", label: "Зелёный", accent: "#10b981", accent2: "#6ee7b7" },
  { id: "amber", label: "Янтарь", accent: "#f59e0b", accent2: "#fcd34d" },
  { id: "rose", label: "Розовый", accent: "#f43f5e", accent2: "#fda4af" },
  { id: "cyan", label: "Бирюза", accent: "#06b6d4", accent2: "#67e8f9" },
];

export function hexToRgb(hex: string): string | null {
  const value = hex.replace("#", "").trim();
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const n = Number.parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `${r}, ${g}, ${b}`;
}

export function normalizeHex(hex: string, fallback: string): string {
  const raw = hex.trim();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return hexToRgb(withHash) ? withHash.toLowerCase() : fallback;
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizeTheme(raw: Partial<SiteTheme> | null | undefined): SiteTheme {
  return {
    accent: normalizeHex(String(raw?.accent ?? ""), DEFAULT_THEME.accent),
    accent2: normalizeHex(String(raw?.accent2 ?? ""), DEFAULT_THEME.accent2),
    background: normalizeHex(String(raw?.background ?? ""), DEFAULT_THEME.background),
    glassOpacity: num(raw?.glassOpacity, DEFAULT_THEME.glassOpacity, 0.02, 0.35),
    glassBlur: num(raw?.glassBlur, DEFAULT_THEME.glassBlur, 8, 80),
    glassBorder: num(raw?.glassBorder, DEFAULT_THEME.glassBorder, 0.02, 0.4),
    glowStrength: num(raw?.glowStrength, DEFAULT_THEME.glowStrength, 0, 0.55),
  };
}

export function applySiteTheme(theme: SiteTheme): void {
  if (typeof document === "undefined") return;
  const next = normalizeTheme(theme);
  const root = document.documentElement;
  const rgb = hexToRgb(next.accent) ?? "0, 123, 255";
  const rgb2 = hexToRgb(next.accent2) ?? "0, 194, 255";
  const bgRgb = hexToRgb(next.background) ?? "10, 11, 18";

  root.style.setProperty("--rv-blue", next.accent);
  root.style.setProperty("--rv-cyan", next.accent2);
  root.style.setProperty("--accent", next.accent);
  root.style.setProperty("--accent-2", next.accent2);
  root.style.setProperty("--accent-rgb", rgb);
  root.style.setProperty("--accent-2-rgb", rgb2);
  root.style.setProperty("--bg", next.background);
  root.style.setProperty("--bg-rgb", bgRgb);
  root.style.setProperty("--glass-alpha", String(next.glassOpacity));
  root.style.setProperty("--glass-blur-px", String(next.glassBlur));
  root.style.setProperty("--glass-line-alpha", String(next.glassBorder));
  root.style.setProperty("--glow-alpha", String(next.glowStrength));
  document.body.style.backgroundColor = next.background;
}
