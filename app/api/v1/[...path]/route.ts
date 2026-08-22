import { NextRequest, NextResponse } from "next/server";
import { remnashopFetch, rewriteSetCookie } from "@/lib/remnashop-server";

async function proxy(req: NextRequest, path: string[]) {
  const search = req.nextUrl.search;
  const headers = new Headers();
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const init: RequestInit = {
    method: req.method,
    headers,
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await remnashopFetch(`/api/v1/${path.join("/")}${search}`, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : "upstream error";
    return NextResponse.json({ detail: `RemnaShop недоступен: ${message}` }, { status: 502 });
  }

  const outHeaders = new Headers();
  const type = upstream.headers.get("content-type");
  if (type) outHeaders.set("content-type", type);
  const setCookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : [];
  for (const cookieValue of setCookies) {
    outHeaders.append("set-cookie", rewriteSetCookie(cookieValue));
  }

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, { status: upstream.status, headers: outHeaders });
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params.path ?? []);
}

export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params.path ?? []);
}

export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params.path ?? []);
}

export async function PATCH(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params.path ?? []);
}

export async function PUT(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxy(req, ctx.params.path ?? []);
}
