"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, string>) => void;
  }
}

export default function TelegramWidget({
  botUsername,
  onAuth,
  onError,
}: {
  botUsername: string;
  onAuth: (user: Record<string, string>) => void;
  onError?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    window.onTelegramAuth = (user) => onAuth(user);

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.onerror = () => onError?.();
    el.appendChild(script);

    const timer = setTimeout(() => {
      if (!el.querySelector("iframe")) onError?.();
    }, 4000);

    return () => {
      clearTimeout(timer);
      el.innerHTML = "";
      delete window.onTelegramAuth;
    };
  }, [botUsername, onAuth, onError]);

  return <div ref={ref} className="flex min-h-[48px] items-center justify-center" />;
}
