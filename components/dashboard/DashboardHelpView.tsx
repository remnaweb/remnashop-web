"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DEVICE_PLATFORMS,
  DASHBOARD_FAQ,
  type DevicePlatform,
  type DashboardView,
} from "@/lib/dashboard-views";
import { formatBytesGb } from "@/lib/format";
import type { ShopSubscription } from "@/lib/shop-api";
import DashboardPageHeader from "./DashboardPageHeader";
import DashboardPromoSection from "./DashboardPromoSection";
import PlatformIcon from "./PlatformIcon";

const SUPPORT_LINK = process.env.NEXT_PUBLIC_SUPPORT_LINK?.trim() || "https://t.me/reasonsupport";

interface DashboardHelpViewProps {
  userName: string;
  subscription: ShopSubscription | null;
  onBack: () => void;
  onNavigate: (view: DashboardView) => void;
  onPromoActivated?: () => void;
}

export default function DashboardHelpView({
  userName,
  subscription,
  onBack,
  onNavigate,
  onPromoActivated,
}: DashboardHelpViewProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const usedGb = formatBytesGb(subscription?.used_traffic_bytes);
  const limitGb = subscription ? formatBytesGb(subscription.traffic_limit) : 0;
  const unlimited = Boolean(subscription && subscription.traffic_limit <= 0);

  return (
    <div>
      <DashboardPageHeader title={userName} onBack={onBack} />

      <p className="dash-section-label">Промокод</p>
      <DashboardPromoSection onActivated={onPromoActivated} />

      <p className="dash-section-label mt-6">Трафик</p>
      <div className="dash-section-card">
        <p className="dash-section-card-title">
          {subscription ? (unlimited ? "Безлимит" : `${usedGb} / ${limitGb} ГБ`) : "Нет подписки"}
        </p>
        <p className="dash-section-card-sub">
          {subscription ? (unlimited ? "Без ограничений" : "Использовано за период") : "Оформите тариф в разделе «Тарифы»"}
        </p>
        {!subscription && (
          <Link href="/plans" className="dash-btn-outline dash-btn-outline--block mt-3 text-center">
            Смотреть тарифы
          </Link>
        )}
      </div>

      <p className="dash-section-label mt-6">Частые вопросы</p>
      <div className="dash-faq-list">
        {DASHBOARD_FAQ.map((item, i) => (
          <div key={item.q} className="dash-faq-item">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="dash-faq-question"
            >
              <span>{item.q}</span>
              <svg
                className={`dash-faq-chevron ${openFaq === i ? "dash-faq-chevron--open" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openFaq === i && <div className="dash-faq-answer">{item.a}</div>}
          </div>
        ))}
      </div>

      <p className="dash-section-label mt-6">Поддержка</p>
      <div className="dash-support-list">
        <button type="button" onClick={() => onNavigate("add-device")} className="dash-support-row">
          <div className="dash-support-icon">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="dash-support-title">Как подключить устройство?</p>
            <p className="dash-support-sub">Выберите платформу и следуйте инструкции</p>
          </div>
          <svg className="h-4 w-4 shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <a href={SUPPORT_LINK} target="_blank" rel="noopener noreferrer" className="dash-support-row">
          <div className="dash-support-icon">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="dash-support-title">Написать в поддержку</p>
            <p className="dash-support-sub">Telegram · ответим в течение часа</p>
          </div>
          <svg className="h-4 w-4 shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
}

interface DashboardAddDeviceViewProps {
  onBack: () => void;
  onSelectPlatform: (platform: DevicePlatform) => void;
}

export function DashboardAddDeviceView({ onBack, onSelectPlatform }: DashboardAddDeviceViewProps) {
  return (
    <div>
      <DashboardPageHeader
        title="Добавить устройство"
        subtitle="Выберите платформу устройства, которое хотите подключить."
        onBack={onBack}
      />

      <p className="dash-section-label">Платформа</p>
      <div className="dash-platform-list">
        {DEVICE_PLATFORMS.map((platform, index) => (
          <button
            key={platform.id}
            type="button"
            onClick={() => onSelectPlatform(platform.id)}
            className={`dash-platform-row ${index < DEVICE_PLATFORMS.length - 1 ? "dash-platform-row--border" : ""}`}
          >
            <div className="dash-platform-icon-wrap">
              <PlatformIcon platform={platform.icon} />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="dash-platform-name">{platform.label}</p>
              <p className="dash-platform-sub">{platform.subtitle}</p>
            </div>
            <svg className="h-4 w-4 shrink-0 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
