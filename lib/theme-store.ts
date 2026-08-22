import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_THEME, normalizeTheme, type SiteTheme } from "@/lib/theme";

const THEME_PATH = process.env.THEME_FILE ?? path.join(process.cwd(), "data", "theme.json");

export async function readSiteTheme(): Promise<SiteTheme> {
  try {
    const raw = await readFile(THEME_PATH, "utf8");
    return normalizeTheme(JSON.parse(raw) as Partial<SiteTheme>);
  } catch {
    return DEFAULT_THEME;
  }
}

export async function writeSiteTheme(theme: Partial<SiteTheme>): Promise<SiteTheme> {
  const current = await readSiteTheme();
  const next = normalizeTheme({ ...current, ...theme });
  await mkdir(path.dirname(THEME_PATH), { recursive: true });
  await writeFile(THEME_PATH, JSON.stringify(next, null, 2), "utf8");
  return next;
}
