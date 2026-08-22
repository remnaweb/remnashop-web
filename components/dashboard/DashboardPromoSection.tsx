"use client";

import { useState } from "react";
import { shopApi, ensurePurchaseReady } from "@/lib/shop-api";

interface DashboardPromoSectionProps {
  onActivated?: () => void;
}

export default function DashboardPromoSection({ onActivated }: DashboardPromoSectionProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await ensurePurchaseReady();
      const result = await shopApi.promocode(trimmed);
      const reward =
        result && typeof result === "object" && "reward_type" in result
          ? String((result as { reward_type?: string }).reward_type ?? "")
          : "";
      setSuccess(reward ? `Промокод применён (${reward})` : "Промокод применён");
      setCode("");
      onActivated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось применить промокод");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dash-promo-card">
      <div className="dash-promo-header">
        <div className="dash-promo-icon" aria-hidden>
          <svg className="dash-promo-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        </div>
        <div>
          <p className="dash-promo-title">Промокод</p>
          <p className="dash-promo-sub">Код из админки бота — дни, трафик или скидка</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="dash-promo-form">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ВВЕДИТЕ КОД"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="dash-promo-input"
        />
        <button type="submit" disabled={loading || !code.trim()} className="dash-promo-btn">
          {loading ? "…" : "Активировать"}
        </button>
      </form>

      {error && <p className="dash-promo-msg dash-promo-msg--error">{error}</p>}
      {success && <p className="dash-promo-msg dash-promo-msg--success">{success}</p>}
    </div>
  );
}
