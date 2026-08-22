"use client";

import { useEffect } from "react";
import { captureTelegramInitData, initTelegramWebApp } from "@/lib/telegram";

export default function Home() {
  useEffect(() => {
    initTelegramWebApp();
    captureTelegramInitData();
    const hash = window.location.hash || "";
    window.location.replace(`/dashboard${hash}`);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
    </div>
  );
}
