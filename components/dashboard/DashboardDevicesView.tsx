"use client";

import { useCallback, useEffect, useState } from "react";
import { shopApi, type ShopDevice } from "@/lib/shop-api";
import { formatDeviceLimit, resolveDeviceLimit } from "@/lib/device-limit";
import { openSubscriptionPage } from "@/lib/subscription-page";
import type { DashboardView, DevicePlatform } from "@/lib/dashboard-views";
import DashboardPageHeader from "./DashboardPageHeader";
import PlatformIcon from "./PlatformIcon";

function deviceLabel(d: ShopDevice): string {
  const parts = [d.platform, d.device_model].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Устройство";
}

function guessPlatform(device: ShopDevice): DevicePlatform {
  const p = (device.platform ?? device.os_version ?? "").toLowerCase();
  if (p.includes("ios") || p.includes("iphone") || p.includes("ipad")) return "ios";
  if (p.includes("android")) return "android";
  if (p.includes("windows")) return "windows";
  if (p.includes("mac")) return "macos";
  if (p.includes("linux")) return "linux";
  if (p.includes("tv")) return "tv";
  return "android";
}

interface DashboardDevicesViewProps {
  deviceLimit: number;
  subscriptionLimit?: number;
  hasSubscription: boolean;
  subscriptionUrl: string | null;
  onBack: () => void;
  onNavigate: (view: DashboardView, params?: { platform?: DevicePlatform }) => void;
}

export default function DashboardDevicesView({
  deviceLimit,
  subscriptionLimit = 0,
  hasSubscription,
  subscriptionUrl,
  onBack,
  onNavigate,
}: DashboardDevicesViewProps) {
  const [devices, setDevices] = useState<ShopDevice[]>([]);
  const [limit, setLimit] = useState(deviceLimit);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await shopApi.devices();
      setDevices(data.devices);
      setLimit(resolveDeviceLimit(data.max_count, subscriptionLimit || deviceLimit));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить устройства");
    } finally {
      setLoading(false);
    }
  }, [deviceLimit, subscriptionLimit]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(hwid: string) {
    if (!confirm("Удалить это устройство?")) return;
    setDeleting(hwid);
    try {
      await shopApi.deleteDevice(hwid);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <DashboardPageHeader
        title="Устройства"
        onBack={onBack}
        right={
          <span className="dash-badge dash-badge--muted">
            {devices.length} из {formatDeviceLimit(limit)}
          </span>
        }
      />

      {hasSubscription && (
        <div className="dash-billing-card">
          <div>
            <p className="dash-billing-label">Слоты устройств</p>
            <p className="dash-billing-value">{limit > 0 ? `${limit} устройств` : "Без лимита"}</p>
          </div>
          <div className="text-right">
            <p className="dash-billing-label">Занято</p>
            <p className="dash-billing-value">{devices.length}</p>
          </div>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <p className="dash-section-label">Мои устройства</p>

      {loading ? (
        <div className="dash-card flex justify-center p-10">
          <div className="dash-spinner" />
        </div>
      ) : devices.length === 0 ? (
        <div className="dash-card p-6 text-center dash-subheading">
          Нет зарегистрированных устройств. Добавьте первое устройство ниже.
        </div>
      ) : (
        <ul className="dash-device-list">
          {devices.map((device) => {
            const platform = guessPlatform(device);
            return (
              <li key={device.hwid} className="dash-device-item">
                <div className="dash-device-icon-wrap">
                  <PlatformIcon platform={platform} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="dash-device-name">{deviceLabel(device)}</p>
                  <p className="dash-device-meta">{device.os_version || device.hwid.slice(0, 14)}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => subscriptionUrl && openSubscriptionPage(subscriptionUrl)}
                    disabled={!subscriptionUrl}
                    className="dash-btn-white dash-btn-white--sm"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 2L3 14h8l-1 10 10-12h-8l1-10z" />
                    </svg>
                    Подключиться
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(device.hwid)}
                    disabled={deleting !== null}
                    className="dash-btn-ghost dash-btn-ghost--sm text-red-300"
                  >
                    {deleting === device.hwid ? "…" : "Удалить"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasSubscription && devices.length < limit && (
        <button type="button" onClick={() => onNavigate("add-device")} className="dash-add-device-btn">
          + Добавить устройство
        </button>
      )}

      {devices.length > 0 && (
        <button
          type="button"
          onClick={async () => {
            if (!confirm("Удалить все устройства?")) return;
            setDeleting("all");
            try {
              await shopApi.deleteAllDevices();
              await load();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Ошибка");
            } finally {
              setDeleting(null);
            }
          }}
          className="mt-4 w-full text-center text-sm text-red-400/80 hover:text-red-300"
        >
          Сбросить все устройства
        </button>
      )}
    </div>
  );
}
