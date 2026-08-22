import { NextRequest, NextResponse } from "next/server";
import { remnashopFetch } from "@/lib/remnashop-server";
import { isRemnashopAdmin } from "@/lib/remnashop-admin";
import { readSiteTheme, writeSiteTheme } from "@/lib/theme-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const theme = await readSiteTheme();
  return NextResponse.json(theme, {
    headers: { "Cache-Control": "no-store" },
  });
}

async function currentUser(cookie: string | null): Promise<{
  telegram_id?: number | null;
  email?: string | null;
} | null> {
  if (!cookie) return null;
  const meRes = await remnashopFetch("/api/v1/public/auth/me", { headers: { cookie } });
  if (!meRes.ok) return null;
  return (await meRes.json()) as { telegram_id?: number | null; email?: string | null };
}

export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser(request.headers.get("cookie"));
    if (!user || !(await isRemnashopAdmin(user))) {
      return NextResponse.json({ error: "Только администратор бота" }, { status: 403 });
    }
    const body = (await request.json()) as Partial<{
      accent: string;
      accent2: string;
      background: string;
      glassOpacity: number;
      glassBlur: number;
      glassBorder: number;
      glowStrength: number;
    }>;
    const theme = await writeSiteTheme(body);
    return NextResponse.json(theme);
  } catch (err) {
    console.error("theme put:", err);
    return NextResponse.json({ error: "Не удалось сохранить тему" }, { status: 500 });
  }
}
