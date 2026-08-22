"use client";

import { useEffect } from "react";
import { applySiteTheme, DEFAULT_THEME, type SiteTheme } from "@/lib/theme";

export default function ThemeRoot() {
  useEffect(() => {
    let cancelled = false;
    fetch("/api/theme", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: SiteTheme) => {
        if (!cancelled) applySiteTheme(data);
      })
      .catch(() => {
        if (!cancelled) applySiteTheme(DEFAULT_THEME);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
