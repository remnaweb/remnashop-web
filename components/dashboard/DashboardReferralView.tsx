"use client";

import { useEffect, useState } from "react";
import { shopApi } from "@/lib/shop-api";
import DashboardPageHeader from "./DashboardPageHeader";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

interface DashboardReferralViewProps {
  onBack: () => void;
}

export default function DashboardReferralView({ onBack }: DashboardReferralViewProps) {
  const [code, setCode] = useState<string | null>(null);
  const [invited, setInvited] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    shopApi
      .referral()
      .then((d) => {
        setEnabled(d.enabled);
        setCode(d.referral_code);
        setInvited(d.invited_count);
      })
      .catch(() => setEnabled(false))
      .finally(() => setLoading(false));
  }, []);

  const link = code && BOT ? `https://t.me/${BOT}?start=${code}` : null;

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const linkPreview = link ? (link.length > 36 ? `${link.slice(0, 36)}…` : link) : "";

  return (
    <div>
      <DashboardPageHeader
        title="Реферальная программа"
        subtitle={code ? `${invited} приглашено` : undefined}
        onBack={onBack}
      />

      {loading ? (
        <div className="dash-card flex justify-center p-8">
          <div className="dash-spinner" />
        </div>
      ) : !enabled || !code ? (
        <div className="dash-card p-6 text-center dash-subheading">Реферальная программа недоступна</div>
      ) : (
        <>
          <div className="dash-stat-row">
            <div className="dash-stat-box">
              <p className="dash-stat-value">{invited}</p>
              <p className="dash-stat-label">Приглашено</p>
            </div>
            <div className="dash-stat-box">
              <p className="dash-stat-value dash-stat-value--cyan">—</p>
              <p className="dash-stat-label">Бонус</p>
            </div>
            <div className="dash-stat-box">
              <p className="dash-stat-value dash-stat-value--green">{invited}</p>
              <p className="dash-stat-label">Рефералов</p>
            </div>
          </div>

          <p className="dash-section-label mt-6">Ваша ссылка</p>
          <div className="dash-link-bar">
            <span className="dash-link-text">{linkPreview}</span>
            <button type="button" onClick={copyLink} className="dash-btn-white dash-btn-white--sm">
              {copied ? "✓" : "Копировать"}
            </button>
          </div>

          <div className="dash-card mt-4 p-5">
            <p className="text-sm dash-subheading leading-relaxed">
              Поделитесь ссылкой — друг получит доступ, вы бонус по программе RemnaShop.
            </p>
            <p className="mt-3 font-mono text-sm text-cyan-200/70">Код: {code}</p>
          </div>
        </>
      )}
    </div>
  );
}
