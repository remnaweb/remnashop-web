import { NextRequest, NextResponse } from "next/server";
import { peekResetCode, consumeResetCode, saveResetCode } from "@/lib/auth-codes";
import { isMailConfigured, MAIL_NOT_CONFIGURED, mailSubject, resetPasswordEmail, sendEmail } from "@/lib/email";
import { emailUserExists, updateRemnashopPassword } from "@/lib/remnashop-password";
import { markEmailVerified } from "@/lib/remnashop-email";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "send") {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!email) {
        return NextResponse.json({ error: "Укажите email" }, { status: 400 });
      }

      if (!(await emailUserExists(email))) {
        return NextResponse.json(
          { error: "Аккаунт с этим email не найден. Зарегистрируйтесь или войдите через Telegram." },
          { status: 404 }
        );
      }

      if (!isMailConfigured()) {
        return NextResponse.json({ error: MAIL_NOT_CONFIGURED }, { status: 503 });
      }

      const code = saveResetCode(email);
      const sent = await sendEmail({
        to: email,
        subject: mailSubject("reset"),
        html: resetPasswordEmail(code),
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
      const newPassword = String(body.newPassword ?? "");

      if (!email || !code || !newPassword) {
        return NextResponse.json({ error: "Заполните все поля" }, { status: 400 });
      }
      if (newPassword.length < 8) {
        return NextResponse.json({ error: "Пароль минимум 8 символов" }, { status: 400 });
      }
      if (!peekResetCode(email, code)) {
        return NextResponse.json({ error: "Неверный или истёкший код" }, { status: 400 });
      }

      const updated = await updateRemnashopPassword(email, newPassword);
      if (!updated) {
        return NextResponse.json(
          { error: "Не удалось сменить пароль. Попробуйте позже или войдите через Telegram." },
          { status: 500 }
        );
      }
      await markEmailVerified(email);
      consumeResetCode(email);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Неверный action" }, { status: 400 });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
