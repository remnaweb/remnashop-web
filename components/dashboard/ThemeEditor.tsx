"use client";

import { useEffect, useState } from "react";
import { applySiteTheme, DEFAULT_THEME, THEME_PRESETS, type SiteTheme } from "@/lib/theme";

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function ThemeEditor() {
  const [theme, setTheme] = useState<SiteTheme | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/theme", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: SiteTheme) => {
        setTheme(data);
        applySiteTheme(data);
      })
      .catch(() => setTheme(DEFAULT_THEME));

    return () => {
      fetch("/api/theme", { cache: "no-store" })
        .then((res) => res.json())
        .then((data: SiteTheme) => applySiteTheme(data))
        .catch(() => applySiteTheme(DEFAULT_THEME));
    };
  }, []);

  function preview(next: SiteTheme) {
    setTheme(next);
    applySiteTheme(next);
    setMessage(null);
  }

  async function save(next: SiteTheme = theme ?? DEFAULT_THEME) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/theme", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ошибка");
      setTheme(data);
      applySiteTheme(data);
      setMessage("Дизайн сохранён — его видят все пользователи");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  if (!theme) return null;

  return (
    <div className="dash-theme-stack">
      <div className="dash-theme-card">
        <p className="dash-theme-title">Цвета</p>
        <p className="dash-theme-sub">
          Палитра применяется ко всей вёрстке: фон, свечение, кнопки, выбранные карточки. Иконки и обычный текст остаются светлыми.
        </p>

        <div className="dash-theme-swatches">
          {THEME_PRESETS.map((preset) => {
            const active = theme.accent.toLowerCase() === preset.accent.toLowerCase();
            return (
              <button
                key={preset.id}
                type="button"
                disabled={saving}
                onClick={() => preview({ ...theme, accent: preset.accent, accent2: preset.accent2 })}
                className={`dash-theme-swatch ${active ? "dash-theme-swatch--active" : ""}`}
                style={{ background: `linear-gradient(135deg, ${preset.accent}, ${preset.accent2})` }}
                aria-label={preset.label}
              />
            );
          })}
        </div>

        <label className="dash-theme-field">
          <span>Основной</span>
          <span className="dash-theme-picker">
            <input
              type="color"
              value={theme.accent}
              disabled={saving}
              onChange={(e) => preview({ ...theme, accent: e.target.value })}
            />
            <code>{theme.accent}</code>
          </span>
        </label>
        <label className="dash-theme-field">
          <span>Дополнительный</span>
          <span className="dash-theme-picker">
            <input
              type="color"
              value={theme.accent2}
              disabled={saving}
              onChange={(e) => preview({ ...theme, accent2: e.target.value })}
            />
            <code>{theme.accent2}</code>
          </span>
        </label>
        <label className="dash-theme-field">
          <span>Фон</span>
          <span className="dash-theme-picker">
            <input
              type="color"
              value={theme.background}
              disabled={saving}
              onChange={(e) => preview({ ...theme, background: e.target.value })}
            />
            <code>{theme.background}</code>
          </span>
        </label>
      </div>

      <div className="dash-theme-card">
        <p className="dash-theme-title">Стекло</p>
        <p className="dash-theme-sub">Прозрачность и размытие карточек, обводка и сила цветного свечения на фоне.</p>

        <label className="dash-theme-field">
          <span>Прозрачность {percent(theme.glassOpacity)}</span>
          <input
            type="range"
            min={2}
            max={35}
            value={Math.round(theme.glassOpacity * 100)}
            disabled={saving}
            onChange={(e) => preview({ ...theme, glassOpacity: Number(e.target.value) / 100 })}
          />
        </label>
        <label className="dash-theme-field">
          <span>Размытие {Math.round(theme.glassBlur)} px</span>
          <input
            type="range"
            min={8}
            max={80}
            value={Math.round(theme.glassBlur)}
            disabled={saving}
            onChange={(e) => preview({ ...theme, glassBlur: Number(e.target.value) })}
          />
        </label>
        <label className="dash-theme-field">
          <span>Обводка {percent(theme.glassBorder)}</span>
          <input
            type="range"
            min={2}
            max={40}
            value={Math.round(theme.glassBorder * 100)}
            disabled={saving}
            onChange={(e) => preview({ ...theme, glassBorder: Number(e.target.value) / 100 })}
          />
        </label>
        <label className="dash-theme-field">
          <span>Свечение {percent(theme.glowStrength)}</span>
          <input
            type="range"
            min={0}
            max={55}
            value={Math.round(theme.glowStrength * 100)}
            disabled={saving}
            onChange={(e) => preview({ ...theme, glowStrength: Number(e.target.value) / 100 })}
          />
        </label>
      </div>

      <div className="dash-theme-actions">
        <button
          type="button"
          className="dash-btn-glass"
          disabled={saving}
          onClick={() => preview(DEFAULT_THEME)}
        >
          Сбросить
        </button>
        <button type="button" className="dash-btn-primary" disabled={saving} onClick={() => save()}>
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
      {message && <p className="dash-theme-msg">{message}</p>}
    </div>
  );
}
