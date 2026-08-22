const UPSTREAM = (process.env.REMNASHOP_URL ?? "http://127.0.0.1:5000").replace(/\/$/, "");

/** Keep Secure + Path so Telegram Mini App (HTTPS WebView) stores the session cookie. */
export function rewriteSetCookie(raw: string): string {
  let value = raw.replace(/;\s*Domain=[^;]*/gi, "");
  if (!/;\s*Path=/i.test(value)) {
    value += "; Path=/";
  }
  if (!/;\s*Secure/i.test(value)) {
    value += "; Secure";
  }
  if (!/;\s*SameSite=/i.test(value)) {
    value += "; SameSite=None";
  } else {
    value = value.replace(/;\s*SameSite=[^;]*/i, "; SameSite=None");
  }
  return value;
}

export function cookiesFromUpstream(upstream: Response): string[] {
  const list =
    typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : [];
  return list.map(rewriteSetCookie);
}

export async function remnashopFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${UPSTREAM}${path}`, {
    ...init,
    cache: "no-store",
    redirect: "manual",
  });
}

export async function readDetail(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const data = JSON.parse(text) as { detail?: unknown };
    if (typeof data.detail === "string") return data.detail;
  } catch {
    /* ignore */
  }
  return text || `Ошибка ${res.status}`;
}
