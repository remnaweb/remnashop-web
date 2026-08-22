export function resolveDeviceLimit(apiMax: number | null | undefined, subscriptionLimit?: number | null): number {
  if (typeof apiMax === "number" && apiMax > 0) return apiMax;
  if (typeof subscriptionLimit === "number" && subscriptionLimit > 0) return subscriptionLimit;
  return 0;
}

export function formatDeviceLimit(limit: number): string {
  return limit > 0 ? String(limit) : "без лимита";
}
