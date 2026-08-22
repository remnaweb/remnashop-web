export type DashboardView =
  | "home"
  | "devices"
  | "add-device"
  | "connect"
  | "referral"
  | "help"
  | "design";

export const DASHBOARD_VIEWS: DashboardView[] = [
  "home",
  "devices",
  "add-device",
  "connect",
  "referral",
  "help",
  "design",
];

export function parseDashboardView(value: string | null): DashboardView {
  if (value && DASHBOARD_VIEWS.includes(value as DashboardView)) {
    return value as DashboardView;
  }
  return "home";
}

export type DevicePlatform = "ios" | "android" | "windows" | "linux" | "tv" | "macos";

export const DEVICE_PLATFORMS: {
  id: DevicePlatform;
  label: string;
  subtitle: string;
  icon: DevicePlatform;
}[] = [
  { id: "ios", label: "iOS", subtitle: "iPhone, iPad · HAPP, INCY", icon: "ios" },
  { id: "android", label: "Android", subtitle: "v2rayNG, Hiddify", icon: "android" },
  { id: "windows", label: "Windows", subtitle: "Hiddify, v2rayN", icon: "windows" },
  { id: "macos", label: "macOS", subtitle: "V2Box, Hiddify", icon: "macos" },
  { id: "linux", label: "Linux", subtitle: "Nekoray, sing-box", icon: "linux" },
  { id: "tv", label: "TV", subtitle: "Android TV · v2rayNG", icon: "tv" },
];

export const PLATFORM_CONNECT_HINT: Record<DevicePlatform, string> = {
  ios: "HAPP PLUS, INCY, Shadowrocket",
  android: "v2rayNG, Hiddify",
  windows: "Hiddify, v2rayN",
  macos: "V2Box, Hiddify",
  linux: "Nekoray, sing-box",
  tv: "v2rayNG",
};

export const DASHBOARD_FAQ = [
  {
    q: "Как подключить устройство?",
    a: "Откройте «Устройства» → «Добавить устройство», выберите платформу и нажмите «Подключиться». Если нужного клиента нет — скопируйте ссылку подписки и вставьте в HAPP, v2rayNG или другой клиент.",
  },
  {
    q: "VPN не подключается — что делать?",
    a: "Обновите подписку в приложении, попробуйте другой сервер или перезапустите VPN-клиент. Если проблема сохраняется — напишите в поддержку.",
  },
  {
    q: "Сколько устройств можно подключить?",
    a: "Количество слотов зависит от тарифа. Управляйте устройствами в разделе «Устройства».",
  },
  {
    q: "Как оплатить VPN?",
    a: "Откройте «Тарифы» в кабинете и выберите план. Способы оплаты те же, что в админке бота.",
  },
];
