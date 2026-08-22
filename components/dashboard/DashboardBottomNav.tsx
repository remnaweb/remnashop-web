"use client";

import type { DashboardView } from "@/lib/dashboard-views";

interface DashboardBottomNavProps {
  active: DashboardView;
  onNavigate: (view: DashboardView) => void;
}

export default function DashboardBottomNav({ active, onNavigate }: DashboardBottomNavProps) {
  const homeActive = active !== "help";

  return (
    <nav className="dash-bottom-nav" aria-label="Навигация кабинета">
      <div className="dash-bottom-nav-inner">
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className={`dash-bottom-nav-btn ${homeActive ? "dash-bottom-nav-btn--active" : ""}`}
          aria-current={homeActive ? "page" : undefined}
        >
          <svg className="dash-bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onNavigate("help")}
          className={`dash-bottom-nav-btn ${active === "help" ? "dash-bottom-nav-btn--active" : ""}`}
          aria-current={active === "help" ? "page" : undefined}
        >
          <svg className="dash-bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
