const INIT_DATA_KEY = "tg_init_data";

export function getTelegramWebApp() {
  if (typeof window === "undefined") return null;
  return (window as Window & { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp ?? null;
}

export interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: { user?: { id?: number } };
  platform?: string;
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  openLink?: (url: string) => void;
}

function initDataFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const fromHash = params.get("tgWebAppData");
  if (fromHash) return fromHash;
  if (params.get("hash") && params.get("auth_date") && params.get("user")) {
    return hash;
  }
  return null;
}

export function captureTelegramInitData(): string | null {
  if (typeof window === "undefined") return null;
  const tg = getTelegramWebApp();
  try {
    tg?.ready();
  } catch {
    /* ignore */
  }
  const live = tg?.initData?.trim() || initDataFromHash();
  if (live) {
    try {
      sessionStorage.setItem(INIT_DATA_KEY, live);
    } catch {
      /* ignore */
    }
    return live;
  }
  try {
    return sessionStorage.getItem(INIT_DATA_KEY);
  } catch {
    return null;
  }
}

export function isTelegramMiniApp(): boolean {
  const tg = getTelegramWebApp();
  if (tg?.initData) return true;
  if (initDataFromHash()) return true;
  try {
    if (sessionStorage.getItem(INIT_DATA_KEY)) return true;
  } catch {
    /* ignore */
  }
  if (tg?.platform && tg.platform !== "unknown") return true;
  return false;
}

export function openExternalUrl(url: string): void {
  if (typeof window === "undefined") return;
  const tg = getTelegramWebApp();
  if (tg?.openLink) {
    tg.openLink(url);
    return;
  }
  window.location.href = url;
}

export function initTelegramWebApp(): void {
  const tg = getTelegramWebApp();
  if (!tg) return;
  tg.ready();
  tg.expand();
  captureTelegramInitData();
}
