"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import CabinetNav from "@/components/dashboard/CabinetNav";
import DashboardConnectView from "@/components/dashboard/DashboardConnectView";
import DashboardDesignView from "@/components/dashboard/DashboardDesignView";
import DashboardDevicesView from "@/components/dashboard/DashboardDevicesView";
import DashboardHelpView, { DashboardAddDeviceView } from "@/components/dashboard/DashboardHelpView";
import DashboardHomeView from "@/components/dashboard/DashboardHomeView";
import DashboardReferralView from "@/components/dashboard/DashboardReferralView";
import {
  shopApi,
  tryCurrent,
  tryMe,
  ensurePurchaseReady,
  type ShopSubscription,
  type ShopUser,
} from "@/lib/shop-api";
import {
  parseDashboardView,
  type DashboardView,
  type DevicePlatform,
} from "@/lib/dashboard-views";
import { captureTelegramInitData, initTelegramWebApp } from "@/lib/telegram";
import { bootstrapTelegramAuth } from "@/lib/tg-mini-auth";
import { resolveDeviceLimit } from "@/lib/device-limit";
import "../dashboard-theme.css";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<ShopUser | null>(null);
  const [subscription, setSubscription] = useState<ShopSubscription | null>(null);
  const [deviceCount, setDeviceCount] = useState(0);
  const [deviceLimit, setDeviceLimit] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [trialBusy, setTrialBusy] = useState(false);
  const [connectPlatform, setConnectPlatform] = useState<DevicePlatform>("ios");
  const [isAdmin, setIsAdmin] = useState(false);

  const view = parseDashboardView(searchParams.get("view"));

  useEffect(() => {
    const platform = searchParams.get("platform") as DevicePlatform | null;
    if (platform) setConnectPlatform(platform);
  }, [searchParams]);

  const navigate = useCallback(
    (nextView: DashboardView, params?: { platform?: DevicePlatform }) => {
      const query = new URLSearchParams();
      if (nextView !== "home") query.set("view", nextView);
      if (params?.platform) query.set("platform", params.platform);
      const qs = query.toString();
      router.push(qs ? `/dashboard?${qs}` : "/dashboard");
    },
    [router]
  );

  useEffect(() => {
    if (!loading && view === "design" && !isAdmin) {
      navigate("home");
    }
  }, [loading, view, isAdmin, navigate]);

  const refreshData = useCallback(async () => {
    const [current, ref] = await Promise.all([
      tryCurrent(),
      shopApi.referral().catch(() => null),
    ]);
    setSubscription(current);
    setReferralCount(ref?.invited_count ?? 0);

    if (current) {
      try {
        const d = await shopApi.devices();
        setDeviceCount(Math.max(Number(d.current_count) || 0, d.devices.length));
        setDeviceLimit(resolveDeviceLimit(d.max_count, current.device_limit));
      } catch {
        setDeviceCount(0);
        setDeviceLimit(resolveDeviceLimit(0, current.device_limit));
      }
    } else {
      setDeviceCount(0);
      setDeviceLimit(0);
    }
  }, []);

  useEffect(() => {
    async function load() {
      initTelegramWebApp();
      captureTelegramInitData();

      let me = await tryMe();
      if (!me) {
        await bootstrapTelegramAuth();
        me = await tryMe();
      }
      if (!me) {
        router.replace("/login?redirect=/dashboard");
        return;
      }
      setUser(me);
      const admin = await fetch("/api/auth/admin-status", { credentials: "include", cache: "no-store" })
        .then((res) => res.json())
        .then((data) => Boolean(data.admin))
        .catch(() => false);
      setIsAdmin(admin);
      try {
        await ensurePurchaseReady();
      } catch {
        /* ignore */
      }
      await refreshData();
      setLoading(false);
    }
    load();
  }, [router, refreshData]);

  async function handleLogout() {
    try {
      await shopApi.logout();
    } catch {
      /* ignore */
    }
    router.replace("/login");
  }

  async function handleTrial() {
    setTrialBusy(true);
    try {
      await ensurePurchaseReady();
      await shopApi.trial();
      await refreshData();
    } catch {
      /* ignore */
    } finally {
      setTrialBusy(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="dash-spinner" />
        </div>
      </DashboardShell>
    );
  }

  if (!user) return null;

  const displayName = user.username ? `@${user.username}` : user.name;
  const subUrl = subscription?.url ?? null;

  return (
    <DashboardShell>
      <div className="dash-main mx-auto max-w-lg px-4 py-8 sm:max-w-xl sm:px-6 md:py-10">
        {view === "home" && (
          <DashboardHomeView
            user={user}
            subscription={subscription}
            deviceCount={deviceCount}
            deviceLimit={deviceLimit}
            referralCount={referralCount}
            onNavigate={navigate}
            onLogout={handleLogout}
            onTrial={!subscription ? handleTrial : undefined}
            trialBusy={trialBusy}
          />
        )}

        {view === "referral" && <DashboardReferralView onBack={() => navigate("home")} />}

        {view === "devices" && (
          <DashboardDevicesView
            deviceLimit={deviceLimit}
            subscriptionLimit={subscription?.device_limit ?? 0}
            hasSubscription={Boolean(subscription)}
            subscriptionUrl={subUrl}
            onBack={() => navigate("home")}
            onNavigate={navigate}
          />
        )}

        {view === "add-device" && (
          <DashboardAddDeviceView
            onBack={() => navigate(subscription ? "devices" : "home")}
            onSelectPlatform={(platform) => navigate("connect", { platform })}
          />
        )}

        {view === "connect" && (
          <DashboardConnectView
            platform={connectPlatform}
            subscriptionUrl={subUrl}
            onBack={() => navigate(subscription ? "devices" : "home")}
          />
        )}

        {view === "help" && (
          <DashboardHelpView
            userName={displayName}
            subscription={subscription}
            onBack={() => navigate("home")}
            onNavigate={navigate}
            onPromoActivated={refreshData}
          />
        )}

        {view === "design" && isAdmin && (
          <DashboardDesignView onBack={() => navigate("home")} />
        )}
      </div>
      <CabinetNav />
    </DashboardShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="dash-spinner" />
          </div>
        </DashboardShell>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
