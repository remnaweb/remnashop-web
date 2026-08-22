"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { tryMe } from "@/lib/shop-api";
import { bootstrapTelegramAuth } from "@/lib/tg-mini-auth";
import { isTelegramMiniApp } from "@/lib/telegram";

/** Auto-login in Telegram Mini App (including /login before redirect). */
export default function TelegramMiniAppBootstrap() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/api")) return;

    async function run() {
      if (!isTelegramMiniApp()) return;
      if (await tryMe()) return;

      const ok = await bootstrapTelegramAuth();
      if (!ok) return;

      if (await tryMe()) {
        if (pathname === "/login") {
          const params = new URLSearchParams(window.location.search);
          const redirect = params.get("redirect") ?? "/dashboard";
          router.replace(redirect);
        } else {
          router.refresh();
        }
      }
    }

    run();
  }, [pathname, router]);

  return null;
}
