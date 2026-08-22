"use client";

import type { ReactNode } from "react";

interface DashboardPageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export default function DashboardPageHeader({ title, subtitle, onBack, right }: DashboardPageHeaderProps) {
  return (
    <div className="dash-page-header">
      <div className="flex items-start gap-3">
        {onBack && (
          <button type="button" onClick={onBack} className="dash-back-btn" aria-label="Назад">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="dash-page-title">{title}</h1>
          {subtitle && <p className="dash-page-subtitle">{subtitle}</p>}
        </div>
        {right}
      </div>
    </div>
  );
}
