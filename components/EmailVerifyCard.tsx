"use client";

import { useState } from "react";
import { shopApi } from "@/lib/shop-api";

interface EmailVerifyCardProps {
  email: string;
  onVerified?: () => void;
  compact?: boolean;
}

export default function EmailVerifyCard({ email, onVerified, compact }: EmailVerifyCardProps) {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function sendCode() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await shopApi.requestEmailVerification(email);
      setSent(true);
      setSuccess("Код отправлен на почту");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить код");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await shopApi.confirmEmailVerification(code.trim());
      setSuccess("Email подтверждён");
      onVerified?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неверный код");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`dash-card ${compact ? "p-4" : "p-5"} border border-amber-500/25 bg-amber-500/5`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-200">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">Подтвердите email</p>
          <p className="mt-1 text-sm text-cyan-200/50">
            Для оплаты тарифа нужно подтвердить почту {email}
          </p>
        </div>
      </div>

      {!sent ? (
        <button
          type="button"
          onClick={sendCode}
          disabled={busy}
          className="dash-btn-white dash-btn-white--block mt-4"
        >
          {busy ? "…" : "Отправить код"}
        </button>
      ) : (
        <form onSubmit={confirm} className="mt-4 space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Код из письма"
            maxLength={8}
            required
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg font-bold tracking-[0.3em] text-white outline-none focus:border-cyan-400/40"
          />
          <button type="submit" disabled={busy || !code.trim()} className="dash-btn-primary dash-btn-primary--block">
            {busy ? "…" : "Подтвердить"}
          </button>
          <button
            type="button"
            onClick={sendCode}
            disabled={busy}
            className="w-full text-center text-xs text-cyan-200/45 hover:text-cyan-200/70"
          >
            Отправить код ещё раз
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      {success && <p className="mt-3 text-sm text-emerald-300">{success}</p>}
    </div>
  );
}
