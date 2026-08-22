"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EmailVerifyCard from "@/components/EmailVerifyCard";
import CabinetNav from "@/components/dashboard/CabinetNav";
import {
  shopApi,
  tryMe,
  ensurePurchaseReady,
  needsEmailVerification,
  type GatewayPrice,
  type Offers,
  type PlanOffer,
  type ShopUser,
} from "@/lib/shop-api";
import { gatewayMeta } from "@/lib/gateways";
import { bootstrapTelegramAuth } from "@/lib/tg-mini-auth";
import { openExternalUrl } from "@/lib/telegram";
import "../dashboard-theme.css";
import "./plans-v2.css";

function trafficLabel(bytes: number): string {
  if (bytes <= 0) return "Безлимит";
  return `${Math.round(bytes / 1073741824)} ГБ`;
}

function filterPrices(prices: GatewayPrice[], enabled: Set<string>): GatewayPrice[] {
  if (!enabled.size) return prices;
  return prices.filter((p) => enabled.has(p.gateway_type.toLowerCase()));
}

function minPrice(prices: GatewayPrice[]): number {
  if (!prices.length) return 0;
  return Math.min(...prices.map((p) => Number(p.final_amount)));
}

function PlansContent() {
  const router = useRouter();
  const [user, setUser] = useState<ShopUser | null>(null);
  const [offers, setOffers] = useState<Offers | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);

  const needsEmailVerify = Boolean(user && needsEmailVerification(user));

  const enabledGateways = useMemo(() => {
    if (!offers?.gateways?.length) return new Set<string>();
    return new Set(offers.gateways.map((g) => g.gateway_type.toLowerCase()));
  }, [offers]);

  const plans = offers?.plans ?? [];
  const selected = plans.find((p) => p.public_code === selectedCode) ?? plans[0] ?? null;
  const duration =
    selected?.durations.find((d) => d.days === selectedDays) ?? selected?.durations[0] ?? null;
  const prices = duration ? filterPrices(duration.prices, enabledGateways) : [];

  useEffect(() => {
    async function load() {
      let me = await tryMe();
      if (!me) {
        await bootstrapTelegramAuth();
        me = await tryMe();
      }
      if (!me) {
        router.replace("/login?redirect=/plans");
        return;
      }
      setUser(me);
      try {
        await ensurePurchaseReady();
      } catch {
        /* ignore */
      }
      try {
        const data = await shopApi.offers();
        setOffers(data);
        const first = data.plans[0];
        if (first) {
          setSelectedCode(first.public_code);
          const preferred =
            first.durations.find((d) => d.days === 30) ?? first.durations[0];
          setSelectedDays(preferred?.days ?? null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить тарифы");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  function pickPlan(plan: PlanOffer) {
    setSelectedCode(plan.public_code);
    const preferred = plan.durations.find((d) => d.days === 30) ?? plan.durations[0];
    setSelectedDays(preferred?.days ?? null);
    setError(null);
  }

  async function buy(gateway: string) {
    if (!selected || !duration) return;
    if (needsEmailVerify) {
      setError("Подтвердите email перед оплатой");
      return;
    }
    const key = `${selected.public_code}-${duration.days}-${gateway}`;
    setBusyKey(key);
    setError(null);
    try {
      await ensurePurchaseReady();
      const pay = offers?.has_current_subscription
        ? await shopApi.extend(duration.days, gateway)
        : await shopApi.purchase(selected.public_code, duration.days, gateway);
      if (pay.payment_url) {
        openExternalUrl(pay.payment_url);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Оплата не создалась");
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-theme flex min-h-screen items-center justify-center">
        <div className="dash-spinner" />
      </div>
    );
  }

  return (
    <div className="dashboard-theme plans-mini mx-auto max-w-lg px-4 py-6 pb-10 sm:max-w-xl sm:px-6">
      <header className="plans-hero">
        <p className="plans-hero-kicker">Тарифы</p>
        <h1 className="plans-hero-title">Выберите тариф</h1>
        <p className="plans-hero-sub">
          {offers?.has_current_subscription ? "Продление текущей подписки" : "План, срок и способ оплаты"}
        </p>
      </header>

      {needsEmailVerify && user?.email && (
        <div className="mb-5">
          <EmailVerifyCard
            email={user.email}
            onVerified={() => {
              tryMe().then((me) => me && setUser(me));
              setError(null);
            }}
          />
        </div>
      )}

      {error && (
        <p className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <p className="plans-step-label">1. План</p>
      <div className="plans-pick">
        {plans.map((plan) => {
          const active = selected?.public_code === plan.public_code;
          const from = minPrice(plan.durations.flatMap((d) => filterPrices(d.prices, enabledGateways)));
          return (
            <button
              key={plan.public_code}
              type="button"
              onClick={() => pickPlan(plan)}
              className={`plans-pick-card ${active ? "plans-pick-card--active" : ""}`}
            >
              <span className="plans-pick-name">{plan.name}</span>
              {plan.description && <span className="plans-pick-desc">{plan.description}</span>}
              <span className="plans-pick-meta">
                {plan.device_limit} устр. · {trafficLabel(plan.traffic_limit)}
              </span>
              {from > 0 && <span className="plans-pick-from">от {from} ₽</span>}
            </button>
          );
        })}
        {plans.length === 0 && (
          <div className="dash-card p-8 text-center dash-subheading">
            Нет доступных тарифов — добавьте планы в админке бота
          </div>
        )}
      </div>

      {selected && selected.durations.length > 0 && (
        <>
          <p className="plans-step-label">2. Срок</p>
          <div className="plans-duration-row">
            {selected.durations.map((d) => {
              const visible = filterPrices(d.prices, enabledGateways);
              const price = minPrice(visible);
              const active = duration?.days === d.days;
              return (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setSelectedDays(d.days)}
                  className={`plans-duration-btn ${active ? "plans-duration-btn--active" : ""}`}
                >
                  <p className="plans-duration-days">{d.days} дн.</p>
                  {price > 0 && <p className="plans-duration-hint">{price} ₽</p>}
                </button>
              );
            })}
          </div>
        </>
      )}

      {selected && duration && prices.length > 0 && (
        <>
          <p className="plans-step-label">3. Оплата</p>
          <div className="plans-pay-row">
            {prices.map((p) => {
              const meta = gatewayMeta(p.gateway_type);
              const busy = busyKey === `${selected.public_code}-${duration.days}-${p.gateway_type}`;
              return (
                <button
                  key={p.gateway_type}
                  type="button"
                  disabled={Boolean(busyKey)}
                  onClick={() => buy(p.gateway_type)}
                  className="plans-pay-btn plans-pay-btn--primary"
                >
                  <span className="plans-pay-left">
                    <span className="plans-pay-icon" aria-hidden>{meta.icon}</span>
                    <span>
                      <span className="plans-pay-name">{meta.label}</span>
                      <span className="plans-pay-sub">{meta.hint}</span>
                    </span>
                  </span>
                  <span className="plans-pay-price">
                    {busy ? "…" : p.is_free ? "Бесплатно" : `${p.final_amount} ${p.currency_symbol}`}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <CabinetNav />
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense
      fallback={
        <div className="dashboard-theme flex min-h-screen items-center justify-center">
          <div className="dash-spinner" />
        </div>
      }
    >
      <PlansContent />
    </Suspense>
  );
}
