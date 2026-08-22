"use client";

import { useEffect } from "react";
import { getTelegramWebApp, isTelegramMiniApp } from "@/lib/telegram";

export default function TgWebAppTheme() {
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg || !isTelegramMiniApp()) return;

    const root = document.documentElement;
    root.classList.add("tg-webapp");
    tg.ready();
    tg.expand();
    try {
      tg.setHeaderColor?.("#0a0b12");
      tg.setBackgroundColor?.("#0a0b12");
    } catch {
      /* ignore */
    }

    return () => {
      root.classList.remove("tg-webapp");
    };
  }, []);

  return null;
}
