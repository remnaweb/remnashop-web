"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TelegramWidget from "@/components/TelegramWidget";
import { emailAuth, shopApi, tryMe, ensurePurchaseReady } from "@/lib/shop-api";
import { captureTelegramInitData, initTelegramWebApp, isTelegramMiniApp } from "@/lib/telegram";
import { bootstrapTelegramAuth, getTelegramBootstrapError } from "@/lib/tg-mini-auth";

const BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

type Tab = "telegram" | "email";
type EmailMode = "login" | "register" | "verify" | "forgot" | "reset";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("telegram");
  const [emailMode, setEmailMode] = useState<EmailMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [widgetFailed, setWidgetFailed] = useState(false);

  const enter = useCallback(() => router.replace(redirect), [redirect, router]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      initTelegramWebApp();
      captureTelegramInitData();

      if (await tryMe()) {
        if (!cancelled) enter();
        return;
      }

      const inMini = isTelegramMiniApp() || Boolean(captureTelegramInitData());
      if (inMini) {
        const ok = await bootstrapTelegramAuth();
        if (!cancelled && ok && (await tryMe())) {
          enter();
          return;
        }
        if (!cancelled) {
          setError(
            getTelegramBootstrapError() ??
              "Не удалось войти через Telegram. Закройте Mini App и откройте «Личный кабинет» в боте снова."
          );
          setLoading(false);
        }
        return;
      }

      if (!cancelled) setLoading(false);
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [enter]);

  async function onWidget(user: Record<string, string>) {
    setError(null);
    try {
      const payload: Record<string, string | number> = {
        id: Number(user.id),
        first_name: user.first_name,
        auth_date: Number(user.auth_date),
        hash: user.hash,
      };
      if (user.last_name) payload.last_name = user.last_name;
      if (user.username) payload.username = user.username;
      if (user.photo_url) payload.photo_url = user.photo_url;
      await shopApi.loginTelegram(payload);
      await ensurePurchaseReady();
      enter();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Telegram login не прошёл");
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (emailMode === "login") {
        await shopApi.loginEmail(email, password);
        enter();
        return;
      }
      if (emailMode === "register") {
        await emailAuth.registerSend(email, password, firstName);
        setSuccess("Код отправлен на почту");
        setEmailMode("verify");
        return;
      }
      if (emailMode === "verify") {
        await emailAuth.registerVerify(email, code);
        enter();
        return;
      }
      if (emailMode === "forgot") {
        await emailAuth.resetSend(email);
        setSuccess("Код отправлен на почту");
        setEmailMode("reset");
        return;
      }
      await emailAuth.resetVerify(email, code, newPassword);
      setSuccess("Пароль изменён. Войдите с новым паролем.");
      setEmailMode("login");
      setCode("");
      setNewPassword("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        {isTelegramMiniApp() && (
          <p className="text-sm text-zinc-500">Вход через Telegram…</p>
        )}
      </div>
    );
  }

  if (isTelegramMiniApp()) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-red-400">{error ?? "Не удалось войти автоматически"}</p>
        <p className="text-xs text-zinc-500">
          Откройте кабинет через кнопку в боте ReasonVPN. URL Mini App должен указывать на этот сайт.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 sm:px-6">
      <div className="w-full">
        <h1 className="mb-2 text-center text-2xl font-black text-white">Вход в аккаунт</h1>
        <p className="mb-8 text-center text-sm text-zinc-500">Выберите способ входа</p>

        <div className="mb-6 flex gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
          <button
            type="button"
            onClick={() => {
              setTab("telegram");
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === "telegram" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Telegram
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("email");
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === "email" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Email
          </button>
        </div>

        {tab === "telegram" && (
          <div className="glass space-y-4 rounded-2xl p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <svg className="h-7 w-7 text-zinc-300" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                </svg>
              </div>
              <p className="text-sm text-zinc-400">Войдите через Telegram</p>
            </div>
            {error && <p className="text-center text-sm text-red-400">{error}</p>}
            {BOT && !widgetFailed ? (
              <TelegramWidget botUsername={BOT} onAuth={onWidget} onError={() => setWidgetFailed(true)} />
            ) : (
              <p className="text-center text-sm text-zinc-500">
                {BOT ? "Виджет не загрузился — войдите через Email." : "Бот не настроен."}
              </p>
            )}
          </div>
        )}

        {tab === "email" && (
          <div className="glass space-y-4 rounded-2xl p-6">
            {(emailMode === "login" || emailMode === "register") && (
              <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode("login");
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
                    emailMode === "login" ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  Войти
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode("register");
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
                    emailMode === "register" ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  Регистрация
                </button>
              </div>
            )}

            {(emailMode === "forgot" || emailMode === "reset") && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode("login");
                    setError(null);
                    setSuccess(null);
                  }}
                  className="mb-3 flex items-center gap-1 text-xs text-zinc-500 hover:text-white"
                >
                  ← Назад
                </button>
                <p className="font-semibold text-white">
                  {emailMode === "forgot" ? "Восстановление пароля" : "Введите код"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {emailMode === "forgot" ? "Отправим код на ваш email" : `Код отправлен на ${email}`}
                </p>
              </div>
            )}

            {emailMode === "verify" && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode("register");
                    setError(null);
                    setSuccess(null);
                    setCode("");
                  }}
                  className="mb-3 flex items-center gap-1 text-xs text-zinc-500 hover:text-white"
                >
                  ← Назад
                </button>
                <p className="font-semibold text-white">Подтвердите email</p>
                <p className="mt-1 text-xs text-zinc-500">Код отправлен на {email}</p>
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {emailMode === "register" && (
                <input
                  type="text"
                  placeholder="Ваше имя"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/25"
                />
              )}

              {(emailMode === "login" || emailMode === "register" || emailMode === "forgot") && (
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/25"
                />
              )}

              {(emailMode === "login" || emailMode === "register") && (
                <input
                  type="password"
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={emailMode === "register" ? 8 : 1}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/25"
                />
              )}

              {emailMode === "reset" && (
                <>
                  <input
                    type="text"
                    placeholder="Код из письма"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    maxLength={6}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-lg font-bold tracking-widest text-white placeholder-zinc-600 outline-none focus:border-white/25"
                  />
                  <input
                    type="password"
                    placeholder="Новый пароль"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/25"
                  />
                </>
              )}

              {emailMode === "verify" && (
                <input
                  type="text"
                  placeholder="Код из письма"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength={6}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-lg font-bold tracking-widest text-white placeholder-zinc-600 outline-none focus:border-white/25"
                />
              )}

              {error && <p className="text-sm text-red-400">{error}</p>}
              {success && <p className="text-sm text-emerald-400">{success}</p>}

              <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">
                {submitting
                  ? "..."
                  : emailMode === "login"
                    ? "Войти →"
                    : emailMode === "register"
                      ? "Далее →"
                      : emailMode === "forgot"
                        ? "Отправить код →"
                        : emailMode === "verify"
                          ? "Подтвердить →"
                          : "Сменить пароль →"}
              </button>
            </form>

            {emailMode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setEmailMode("forgot");
                  setError(null);
                  setSuccess(null);
                }}
                className="w-full text-center text-xs text-zinc-600 transition-colors hover:text-zinc-400"
              >
                Забыли пароль?
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
