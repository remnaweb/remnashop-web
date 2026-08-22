import { NextRequest, NextResponse } from "next/server";
import { remnashopFetch } from "@/lib/remnashop-server";
import { isRemnashopAdmin } from "@/lib/remnashop-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookie = request.headers.get("cookie");
  if (!cookie) {
    return NextResponse.json({ admin: false });
  }
  try {
    const meRes = await remnashopFetch("/api/v1/public/auth/me", { headers: { cookie } });
    if (!meRes.ok) return NextResponse.json({ admin: false });
    const user = (await meRes.json()) as {
      telegram_id?: number | null;
      email?: string | null;
    };
    const admin = await isRemnashopAdmin(user);
    return NextResponse.json({ admin });
  } catch {
    return NextResponse.json({ admin: false });
  }
}
