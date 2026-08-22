/** Labels for RemnaShop gateway_type — new gateways from admin still show with a readable name. */

export interface GatewayMeta {
  label: string;
  icon: string;
  hint: string;
}

const KNOWN: Record<string, GatewayMeta> = {
  yookassa: { label: "Банковская карта", icon: "💳", hint: "Visa, Mastercard, МИР" },
  yoomoney: { label: "ЮMoney", icon: "🟣", hint: "Кошелёк ЮMoney" },
  cryptomus: { label: "Cryptomus", icon: "₿", hint: "USDT, BTC и др." },
  heleket: { label: "Heleket", icon: "₿", hint: "Криптовалюта" },
  cryptopay: { label: "CryptoBot", icon: "🤖", hint: "Оплата в Telegram" },
  telegram_stars: { label: "Telegram Stars", icon: "⭐", hint: "Звёзды Telegram" },
  telegramstars: { label: "Telegram Stars", icon: "⭐", hint: "Звёзды Telegram" },
  stars: { label: "Telegram Stars", icon: "⭐", hint: "Звёзды Telegram" },
  robokassa: { label: "Robokassa", icon: "💳", hint: "Карта / СБП" },
  freekassa: { label: "FreeKassa", icon: "💳", hint: "Карта" },
  platega: { label: "Platega", icon: "💳", hint: "Карта" },
  paymaster: { label: "PayMaster", icon: "💳", hint: "Карта" },
  mulenpay: { label: "MulenPay", icon: "💳", hint: "Карта" },
  wata: { label: "WATA", icon: "💳", hint: "Карта" },
  urlpay: { label: "UrlPay", icon: "💳", hint: "Карта" },
  valutix: { label: "Valutix", icon: "💳", hint: "Карта" },
};

function normalizeKey(type: string): string {
  return type.toLowerCase().replace(/[-\s]/g, "_");
}

function humanize(type: string): string {
  return type
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function gatewayMeta(type: string): GatewayMeta {
  const key = normalizeKey(type);
  const hit = KNOWN[key];
  if (hit) return hit;

  const compact = key.replace(/_/g, "");
  for (const [k, meta] of Object.entries(KNOWN)) {
    if (k.replace(/_/g, "") === compact) return meta;
  }

  return {
    label: humanize(type),
    icon: "💳",
    hint: "Оплата",
  };
}

export function parsePaymentError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("internal server error") || lower.includes("500")) {
    return "Платёжный шлюз не отвечает. Проверьте ключи YooKassa/Cryptomus в админке RemnaShop или выберите другой способ оплаты.";
  }
  if (lower.includes("401") && lower.includes("yookassa")) {
    return "YooKassa: неверный shop_id или секретный ключ в админке RemnaShop.";
  }
  if (lower.includes("gateway") && lower.includes("configured")) {
    return "Этот способ оплаты не настроен в RemnaShop. Добавьте шлюз в админке бота.";
  }
  if (lower.includes("email must be verified")) {
    return "Подтвердите email или откройте кабинет из Telegram.";
  }
  return message;
}
