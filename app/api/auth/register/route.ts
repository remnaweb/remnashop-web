import { NextRequest, NextResponse } from "next/server";
import { deleteVerifyCode, getVerifyRecord, saveVerifyCode } from "@/lib/auth-codes";
import { isMailConfigured, MAIL_NOT_CONFIGURED, mailSubject, sendEmail, verifyEmailTemplate } from "@/lib/email";
import { markEmailVerified } from "@/lib/remnashop-email";
import { cookiesFromUpstream, readDetail, remnashopFetch } from "@/lib/remnashop-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "send") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const firstName = String(body.first_name ?? "").trim();

      if (!email || !password || !firstName) {
        return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
      }
      if (password.length < 8) {
        return NextResponse.json({ error: "Пароль минимум 8 символов" }, { status: 400 });
      }

      if (!isMailConfigured()) {
        return NextResponse.json({ error: MAIL_NOT_CONFIGURED }, { status: 503 });
      }

      const code = saveVerifyCode(email, password, firstName);
      const sent = await sendEmail({
        to: email,
        subject: mailSubject("verify"),
        html: verifyEmailTemplate(code),
      });
      if (!sent) {
        return NextResponse.json(
          { error: "Не удалось отправить письмо. Проверьте RESEND_* или SMTP_* в .env" },
          { status: 502 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (body.action === "verify") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const code = String(body.code ?? "").trim();
      if (!email || !code) {
        return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
      }

      const record = getVerifyRecord(email, code);
      if (!record) {
        return NextResponse.json({ error: "Неверный или истёкший код" }, { status: 400 });
      }

      const upstream = await remnashopFetch("/api/v1/public/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: record.password,
          name: record.firstName,
        }),
      });

      if (!upstream.ok) {
        const detail = await readDetail(upstream);
        const message =
          upstream.status === 409 || detail.toLowerCase().includes("exist")
            ? "Email уже зарегистрирован"
            : detail;
        return NextResponse.json({ error: message }, { status: upstream.status === 409 ? 409 : 400 });
      }

      deleteVerifyCode(email);
      await markEmailVerified(email);
      const out = NextResponse.json({ ok: true });
      for (const cookie of cookiesFromUpstream(upstream)) {
        out.headers.append("set-cookie", cookie);
      }
      return out;
    }

    return NextResponse.json({ error: "Неверный action" }, { status: 400 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
