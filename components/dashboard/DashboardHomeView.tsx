"use client";

import Link from "next/link";
import type { ShopSubscription, ShopUser } from "@/lib/shop-api";
import { daysUntil, formatBytesGb, formatDate, wordDays } from "@/lib/format";
import { formatDeviceLimit } from "@/lib/device-limit";
import { openSubscriptionPage } from "@/lib/subscription-page";
import type { DashboardView } from "@/lib/dashboard-views";

interface DashboardHomeViewProps {
  user: ShopUser;
  subscription: ShopSubscription | null;
  deviceCount: number;
  deviceLimit: number;
  referralCount: number;
  onNavigate: (view: DashboardView) => void;
  onLogout: () => void;
  onTrial?: () => void;
  trialBusy?: boolean;
}

export default function DashboardHomeView({
  user,
  subscription,
  deviceCount,
  deviceLimit,
  referralCount,
  onNavigate,
  onLogout,
  onTrial,
  trialBusy,
}: DashboardHomeViewProps) {
  const days = subscription ? daysUntil(subscription.expire_at) : 0;
  const isActive = Boolean(subscription && subscription.status.toLowerCase() === "active" && days > 0);
  const displayName = user.username ? `@${user.username}` : user.name;
  const safeDeviceLimit = deviceLimit > 0 ? deviceLimit : subscription?.device_limit ?? 0;
  const deviceLimitLabel = formatDeviceLimit(safeDeviceLimit);
  const progressPercent = days > 0 ? Math.min(100, Math.max(8, (Math.min(days, 30) / 30) * 100)) : 0;
  const usedGb = formatBytesGb(subscription?.used_traffic_bytes);
  const limitGb = subscription ? formatBytesGb(subscription.traffic_limit) : 0;
  const unlimited = Boolean(subscription && subscription.traffic_limit <= 0);

  return (
    <div className="dash-home">
      <div className="dash-home-header">
        <div>
          <p className="dash-home-kicker">Личный кабинет</p>
          <p className="dash-home-username">{displayName}</p>
        </div>
        <button type="button" onClick={onLogout} className="dash-logout-btn sm:hidden" aria-label="Выйти">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      <div className="dash-hero-card dash-card-glow">
        {isActive ? (
          <div className="dash-status-pill dash-status-pill--active">
            <span className="dash-status-dot dash-status-dot--active" />
            Активна
          </div>
        ) : (
          <div className="dash-status-pill">
            <span className="dash-status-dot dash-status-dot--expired" />
            {subscription ? "Истекла" : "Нет подписки"}
          </div>
        )}

        <p className="dash-hero-label">{isActive ? "Подписка" : "Кабинет"}</p>
        <p className="dash-hero-amount dash-hero-amount--days">
          {isActive ? `${days} ${wordDays(days)}` : "—"}
        </p>

        {subscription && (
          <div className="dash-info-pill">
            <svg className="h-4 w-4 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              {subscription.plan_name}
              {subscription.is_trial ? " · trial" : ""} · до {formatDate(subscription.expire_at)}
            </span>
          </div>
        )}

        {isActive && (
          <div className="dash-hero-progress">
            <div className="dash-hero-progress-labels">
              <span>Осталось</span>
              <span className="dash-hero-progress-days">{days} {wordDays(days)}</span>
            </div>
            <div className="dash-progress-track">
              <div
                className={`dash-progress-fill ${days > 0 ? "dash-progress-fill--active" : "dash-progress-fill--expired"}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <div className="dash-hero-actions">
          {subscription?.url && (
            <button type="button" onClick={() => openSubscriptionPage(subscription.url)} className="dash-btn-primary">
              Подключиться
            </button>
          )}
          <button type="button" onClick={() => onNavigate("devices")} className="dash-btn-glass">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Устройства
          </button>
        </div>
      </div>

      <section className="dash-section">
        <p className="dash-section-label">Трафик</p>
        <div className="dash-section-card">
          <p className="dash-section-card-title">
            {subscription ? (unlimited ? "Безлимит" : `${usedGb} / ${limitGb} ГБ`) : "Нет данных"}
          </p>
          <p className="dash-section-card-sub">
            {subscription ? (unlimited ? "Без ограничений" : "Использовано за период") : "Появится после покупки тарифа"}
          </p>
        </div>
      </section>

      {(subscription || isActive) && (
        <section className="dash-section">
          <p className="dash-section-label">Устройства</p>
          <div className="dash-section-card">
            <div className="dash-section-card-top">
              <div>
                <p className="dash-section-card-title">
                  {deviceCount}{" "}
                  {deviceCount === 1 ? "устройство" : deviceCount < 5 ? "устройства" : "устройств"}
                </p>
                <p className="dash-section-card-sub">
                  {safeDeviceLimit > 0 ? `Лимит ${deviceLimitLabel}` : "Без лимита"}
                </p>
              </div>
              <span className="dash-badge">{isActive ? `${days} дн.` : "—"}</span>
            </div>
            <button type="button" onClick={() => onNavigate("devices")} className="dash-section-card-btn">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Управление устройствами
            </button>
          </div>
        </section>
      )}

      <section className="dash-section">
        <p className="dash-section-label">Тариф</p>
        <Link href="/plans" className="dash-plan-cta">
          <span className="dash-plan-cta-icon" aria-hidden>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10M4 17h7" />
            </svg>
          </span>
          <span className="dash-plan-cta-text">
            <span className="dash-plan-cta-title">
              {isActive ? "Сменить тариф" : "Выбрать тариф"}
            </span>
            <span className="dash-plan-cta-sub">
              {subscription?.plan_name
                ? `${subscription.plan_name}${isActive ? ` · ещё ${days} ${wordDays(days)}` : ""}`
                : "Планы и сроки из админки бота"}
            </span>
          </span>
          <span className="dash-plan-cta-go" aria-hidden>
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </Link>
      </section>

      <section className="dash-section">
        <p className="dash-section-label">Рефералы</p>
        <button type="button" onClick={() => onNavigate("referral")} className="dash-section-card dash-section-card--link">
          <div className="dash-section-card-row">
            <div className="text-left">
              <p className="dash-section-card-title">Реферальная программа</p>
              <p className="dash-section-card-sub">{referralCount} приглашено</p>
            </div>
            <span className="dash-chevron-btn" aria-hidden>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </button>
      </section>

      {!isActive && onTrial && (
        <div className="dash-section">
          <button
            type="button"
            onClick={onTrial}
            disabled={trialBusy}
            className="dash-btn-primary dash-btn-primary--block"
          >
            {trialBusy ? "…" : "Активировать пробный период"}
          </button>
        </div>
      )}
    </div>
  );
}
