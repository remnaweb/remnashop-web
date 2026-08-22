import { shopApi } from "./shop-api";
import { captureTelegramInitData, getTelegramWebApp, initTelegramWebApp } from "./telegram";

let lastBootstrapError: string | null = null;
let bootstrapPromise: Promise<boolean> | null = null;

export function getTelegramBootstrapError(): string | null {
  return lastBootstrapError;
}

export async function waitForTelegramInitData(maxMs = 1500): Promise<string | null> {
  initTelegramWebApp();
  const immediate = captureTelegramInitData();
  if (immediate) return immediate;

  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (!getTelegramWebApp() && !captureTelegramInitData()) {
      await new Promise((r) => setTimeout(r, 50));
      if (!getTelegramWebApp() && Date.now() - (deadline - maxMs) > 250) {
        return captureTelegramInitData();
      }
      continue;
    }
    const data = captureTelegramInitData();
    if (data) return data;
    await new Promise((r) => setTimeout(r, 50));
  }
  return captureTelegramInitData();
}

/** Silent Telegram Mini App login — call before tryMe(). */
export async function bootstrapTelegramAuth(): Promise<boolean> {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = runBootstrap();
  try {
    return await bootstrapPromise;
  } finally {
    bootstrapPromise = null;
  }
}

async function runBootstrap(): Promise<boolean> {
  lastBootstrapError = null;
  const initData = await waitForTelegramInitData();
  if (!initData) {
    lastBootstrapError = "Telegram initData не получен. Откройте кабинет кнопкой в боте.";
    return false;
  }

  try {
    await shopApi.loginWebApp(initData);
  } catch (err) {
    lastBootstrapError =
      err instanceof Error ? err.message : "Не удалось авторизоваться через Telegram";
    return false;
  }

  try {
    const { ensurePurchaseReady } = await import("./shop-api");
    await ensurePurchaseReady();
  } catch {
    /* purchase flag is optional for login */
  }

  return true;
}
