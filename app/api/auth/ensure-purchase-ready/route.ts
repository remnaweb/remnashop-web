import { NextRequest, NextResponse } from "next/server";
import { markEmailVerified, markTelegramUserVerified } from "@/lib/remnashop-email";
import { remnashopFetch } from "@/lib/remnashop-server";

export const runtime = "nodejs";

interface MePayload {
  telegram_id?: number | null;
  auth_type?: string;
  email?: string | null;
  is_email_verified?: boolean;
}

/** RemnaShop web purchase requires is_email_verified — Telegram users need this flag set in DB. */
export async function POST(request: NextRequest) {
  try {
    const cookie = request.headers.get("cookie");
    if (!cookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meRes = await remnashopFetch("/api/v1/public/auth/me", {
      headers: { cookie },
    });

    if (!meRes.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = (await meRes.json()) as MePayload;
    const authType = (user.auth_type ?? "").toUpperCase();

    if (user.is_email_verified) {
      return NextResponse.json({ ok: true, already: true });
    }

    if (authType === "TELEGRAM" || user.telegram_id) {
      const ok = await markTelegramUserVerified(Number(user.telegram_id));
      if (!ok) {
        const again = await remnashopFetch("/api/v1/public/auth/me", {
          headers: { cookie },
        });
        if (again.ok) {
          const refreshed = (await again.json()) as MePayload;
          if (refreshed.is_email_verified) {
            return NextResponse.json({ ok: true, telegram: true, already: true });
          }
        }
        return NextResponse.json({ error: "Не удалось подготовить аккаунт" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, telegram: true });
    }

    if (user.email) {
      return NextResponse.json({ ok: false, needs_verify: true, email: user.email });
    }

    return NextResponse.json({ error: "Аккаунт не поддерживает оплату" }, { status: 400 });
  } catch (err) {
    console.error("ensure-purchase-ready:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
