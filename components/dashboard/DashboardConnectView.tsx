"use client";

import { useState } from "react";
import { DEVICE_PLATFORMS, PLATFORM_CONNECT_HINT, type DevicePlatform } from "@/lib/dashboard-views";
import { openSubscriptionPage } from "@/lib/subscription-page";
import DashboardPageHeader from "./DashboardPageHeader";
import PlatformIcon from "./PlatformIcon";

interface DashboardConnectViewProps {
  platform: DevicePlatform;
  subscriptionUrl: string | null;
  onBack: () => void;
}

export default function DashboardConnectView({
  platform,
  subscriptionUrl,
  onBack,
}: DashboardConnectViewProps) {
  const [copied, setCopied] = useState(false);
  const platformMeta = DEVICE_PLATFORMS.find((p) => p.id === platform) ?? DEVICE_PLATFORMS[0];

  function copyLink() {
    if (!subscriptionUrl) return;
    navigator.clipboard.writeText(subscriptionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <DashboardPageHeader title="Подключение" onBack={onBack} />

      <div className="dash-connect-device">
        <div className="dash-platform-icon-wrap dash-platform-icon-wrap--lg">
          <PlatformIcon platform={platformMeta.icon} />
        </div>
        <div>
          <p className="dash-connect-device-name">{platformMeta.label}</p>
          <p className="dash-connect-device-sub">{PLATFORM_CONNECT_HINT[platform]}</p>
        </div>
      </div>

      <p className="dash-section-label">Инструкция</p>
      <div className="dash-card p-5">
        <p className="text-sm leading-relaxed text-zinc-300">
          Нажмите «Подключиться» — откроется страница подписки с выбором приложения и инструкцией.
        </p>

        <div className="dash-warning-box">
          <svg className="h-5 w-5 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm leading-relaxed text-amber-100/90">
            <strong className="text-amber-200">Важно.</strong> Если на странице не оказалось нужного клиента, скопируйте ссылку подписки и вставьте её в {PLATFORM_CONNECT_HINT[platform]} или другой клиент.
          </p>
        </div>
      </div>

      <div className="dash-connect-actions">
        {subscriptionUrl ? (
          <>
            <button
              type="button"
              onClick={() => openSubscriptionPage(subscriptionUrl)}
              className="dash-btn-white dash-btn-white--block dash-btn-white--connect"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 2L3 14h8l-1 10 10-12h-8l1-10z" />
              </svg>
              Подключиться
            </button>
            <button type="button" onClick={copyLink} className="dash-btn-outline dash-btn-outline--block">
              {copied ? "Ссылка скопирована ✓" : "Копировать ссылку"}
            </button>
          </>
        ) : (
          <p className="text-center text-sm text-red-400">Нет активной подписки для подключения</p>
        )}
        <button type="button" onClick={onBack} className="dash-btn-ghost dash-btn-ghost--block">
          Назад
        </button>
      </div>
    </div>
  );
}
