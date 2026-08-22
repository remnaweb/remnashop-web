import { parsePaymentError } from "@/lib/gateways";

const BASE = "/api/v1/public";

function formatApiError(status: number, data: unknown): string {
  let detail = `Ошибка ${status}`;
  if (typeof data === "object" && data && "detail" in data) {
    const raw = (data as { detail: unknown }).detail;
    if (typeof raw === "string") detail = raw;
    else if (Array.isArray(raw) && raw[0] && typeof raw[0] === "object" && "msg" in raw[0]) {
      detail = String((raw[0] as { msg: unknown }).msg);
    }
  } else if (typeof data === "string" && data.trim()) {
    detail = data.trim().slice(0, 300);
  }
  if (status === 502) {
    detail = detail.includes("RemnaShop") ? detail : `Сервер оплаты недоступен: ${detail}`;
  }
  return parsePaymentError(detail);
}

async function shopFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    throw new Error(formatApiError(res.status, data));
  }
  return data as T;
}

export interface ShopUser {
  telegram_id?: number | null;
  auth_type?: string;
  email?: string | null;
  is_email_verified: boolean;
  pending_email?: string | null;
  name: string;
  username?: string | null;
  language?: string;
}

export interface ShopSubscription {
  user_remna_id: string;
  status: string;
  is_trial: boolean;
  traffic_limit: number;
  device_limit: number;
  traffic_limit_strategy: string;
  expire_at: string;
  url: string;
  plan_name: string;
  plan_duration_days: number;
  used_traffic_bytes?: number | null;
  lifetime_used_traffic_bytes?: number | null;
  online_at?: string | null;
}

export interface ShopDevice {
  hwid: string;
  platform?: string | null;
  device_model?: string | null;
  os_version?: string | null;
  user_agent?: string | null;
}

export interface ShopDevices {
  devices: ShopDevice[];
  current_count: number;
  max_count: number;
}

export interface GatewayPrice {
  gateway_type: string;
  currency: string;
  currency_symbol: string;
  original_amount: string;
  discount_percent: number;
  final_amount: string;
  is_free: boolean;
}

export interface DurationOffer {
  days: number;
  prices: GatewayPrice[];
}

export interface PlanOffer {
  id: number;
  public_code: string;
  name: string;
  description?: string | null;
  traffic_limit: number;
  device_limit: number;
  type: string;
  recommended_purchase_type: string;
  durations: DurationOffer[];
}

export interface Offers {
  gateways: { gateway_type: string; currency: string; currency_symbol: string }[];
  plans: PlanOffer[];
  has_current_subscription: boolean;
  current_subscription_status?: string | null;
}

export interface PaymentInit {
  payment_id: string;
  payment_url?: string | null;
  purchase_type: string;
  status: string;
  is_free: boolean;
  final_amount: string;
  currency: string;
}

export interface ReferralProgram {
  enabled: boolean;
  referral_code: string;
  invited_count: number;
  invited_with_payment_count: number;
  reward_type: string;
  reward_strategy: string;
  accrual_strategy: string;
  max_level: number;
  reward_levels: { level: number; value: number }[];
}

export const shopApi = {
  me: () => shopFetch<ShopUser>("/auth/me"),
  loginEmail: (email: string, password: string) =>
    shopFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string, name?: string) =>
    shopFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  loginTelegram: (widget: Record<string, string | number>) =>
    shopFetch("/auth/telegram", { method: "POST", body: JSON.stringify(widget) }),
  loginWebApp: (initData: string) =>
    shopFetch("/auth/telegram/webapp", {
      method: "POST",
      body: JSON.stringify({ init_data: initData }),
    }),
  logout: () => shopFetch("/auth/logout", { method: "POST" }),
  current: () => shopFetch<ShopSubscription | null>("/subscription/current"),
  devices: () => shopFetch<ShopDevices>("/subscription/devices"),
  deleteDevice: (hwid: string) =>
    shopFetch(`/subscription/devices/${encodeURIComponent(hwid)}`, { method: "DELETE" }),
  deleteAllDevices: () => shopFetch("/subscription/devices", { method: "DELETE" }),
  offers: () => shopFetch<Offers>("/subscription/offers"),
  purchase: (planCode: string, durationDays: number, gateway: string) =>
    shopFetch<PaymentInit>("/subscription/purchase", {
      method: "POST",
      body: JSON.stringify({
        plan_code: planCode,
        duration_days: durationDays,
        gateway_type: gateway,
      }),
    }),
  extend: (durationDays: number, gateway: string) =>
    shopFetch<PaymentInit>("/subscription/extend", {
      method: "POST",
      body: JSON.stringify({ duration_days: durationDays, gateway_type: gateway }),
    }),
  trial: () => shopFetch("/subscription/trial", { method: "POST" }),
  promocode: (code: string) =>
    shopFetch("/subscription/promocode", { method: "POST", body: JSON.stringify({ code }) }),
  referral: () => shopFetch<ReferralProgram>("/referral/program"),
  changePassword: (currentPassword: string, newPassword: string) =>
    shopFetch("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
  requestEmailVerification: (email?: string) =>
    shopFetch<{ success: boolean; target_email: string }>("/auth/email/request-verification", {
      method: "POST",
      body: JSON.stringify(email ? { email } : {}),
    }),
  confirmEmailVerification: (code: string) =>
    shopFetch<{ success: boolean; email: string }>("/auth/email/confirm", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
};

async function authAction<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error ?? `Ошибка ${res.status}`);
  }
  return data;
}

export const emailAuth = {
  registerSend: (email: string, password: string, firstName: string) =>
    authAction("/api/auth/register", { action: "send", email, password, first_name: firstName }),
  registerVerify: (email: string, code: string) =>
    authAction("/api/auth/register", { action: "verify", email, code }),
  resetSend: (email: string) => authAction("/api/auth/reset-password", { action: "send", email }),
  resetVerify: (email: string, code: string, newPassword: string) =>
    authAction("/api/auth/reset-password", { action: "verify", email, code, newPassword }),
};

export async function tryMe(): Promise<ShopUser | null> {
  try {
    return await shopApi.me();
  } catch {
    return null;
  }
}

export async function tryCurrent(): Promise<ShopSubscription | null> {
  try {
    return await shopApi.current();
  } catch {
    return null;
  }
}

/** Telegram web: RemnaShop requires is_email_verified in DB even for TG login. */
export async function ensurePurchaseReady(): Promise<{
  ok: boolean;
  needsVerify?: boolean;
  email?: string;
}> {
  const res = await fetch("/api/auth/ensure-purchase-ready", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    needs_verify?: boolean;
    email?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error ?? `Ошибка ${res.status}`);
  }
  return {
    ok: Boolean(data.ok),
    needsVerify: data.needs_verify,
    email: data.email,
  };
}

export function isTelegramAuthUser(user: ShopUser): boolean {
  const authType = (user.auth_type ?? "").toUpperCase();
  return authType === "TELEGRAM" || Boolean(user.telegram_id);
}

export function needsEmailVerification(user: ShopUser): boolean {
  if (isTelegramAuthUser(user)) return false;
  return Boolean(user.email && !user.is_email_verified);
}
