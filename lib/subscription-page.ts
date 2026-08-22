/** Открыть страницу подписки Remnawave / RemnaShop */
export function openSubscriptionPage(subscriptionUrl: string): void {
  if (typeof window === "undefined") return;
  window.location.href = subscriptionUrl;
}
