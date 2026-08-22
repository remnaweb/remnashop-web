import nodemailer from "nodemailer";

const SITE_BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? "VPN";
const MAIL_FROM =
  process.env.MAIL_FROM?.trim() ||
  process.env.RESEND_FROM?.trim() ||
  "noreply@localhost";

function mailProvider(): "resend" | "smtp" | null {
  const forced = process.env.MAIL_PROVIDER?.trim().toLowerCase();
  if (forced === "resend" || forced === "smtp") return forced;
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  if (process.env.SMTP_HOST?.trim()) return "smtp";
  return null;
}

export function isMailConfigured(): boolean {
  return mailProvider() !== null;
}

export const MAIL_NOT_CONFIGURED =
  "Письма не настроены. Администратор должен задать RESEND_API_KEY или SMTP_* в .env веб-морды.";

async function sendViaResend(params: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });
  if (!res.ok) {
    console.error("Resend error:", await res.text());
    return false;
  }
  return true;
}

async function sendViaSmtp(params: { to: string; subject: string; html: string }): Promise<boolean> {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return false;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS ?? "";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  });

  await transporter.sendMail({
    from: MAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  return true;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const provider = mailProvider();
  if (!provider) {
    console.error("MAIL: не заданы RESEND_API_KEY и SMTP_HOST");
    return false;
  }
  try {
    return provider === "smtp" ? await sendViaSmtp(params) : await sendViaResend(params);
  } catch (err) {
    console.error("sendEmail error:", err);
    return false;
  }
}

function emailLayout(opts: { title: string; intro: string; code: string; note: string }): string {
  return `<!DOCTYPE html>
<html lang="ru">
<body style="margin:0;padding:0;background:#0a0b12;color:#e8f0ff;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0b12;padding:40px 16px;">
    <tr>
      <td align="center">
        <p style="margin:0 0 22px;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#7dd3fc;">${SITE_BRAND}</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;border:1px solid rgba(255,255,255,.12);background:#12141c;border-radius:16px;">
          <tr>
            <td style="padding:28px 24px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.2;color:#fff;">${opts.title}</h1>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:rgba(232,240,255,.72);">${opts.intro}</p>
              <p style="margin:0;padding:18px 12px;text-align:center;font-size:32px;letter-spacing:.28em;font-weight:700;color:#0a0b12;background:#e8f0ff;border-radius:12px;">${opts.code}</p>
              <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:rgba(232,240,255,.45);">${opts.note}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function verifyEmailTemplate(code: string): string {
  return emailLayout({
    title: "Подтверждение email",
    intro: "Введите этот код на сайте, чтобы закончить регистрацию.",
    code,
    note: "Код действует 15 минут. Если вы не регистрировались — просто проигнорируйте письмо.",
  });
}

export function resetPasswordEmail(code: string): string {
  return emailLayout({
    title: "Восстановление пароля",
    intro: "Введите этот код на странице восстановления пароля.",
    code,
    note: "Код действует 15 минут. Если вы не запрашивали сброс — ничего делать не нужно.",
  });
}

export function mailSubject(kind: "verify" | "reset"): string {
  return kind === "verify" ? `Подтверждение email — ${SITE_BRAND}` : `Сброс пароля — ${SITE_BRAND}`;
}
