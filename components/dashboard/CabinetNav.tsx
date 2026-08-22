"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function CabinetNav() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/admin-status", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setIsAdmin(Boolean(data.admin)))
      .catch(() => setIsAdmin(false));
  }, []);

  const onPlans = pathname.startsWith("/plans");
  const view = search.get("view");
  const onHelp = !onPlans && view === "help";
  const onDesign = !onPlans && view === "design";
  const onHome = !onPlans && !onHelp && !onDesign;

  return (
    <nav className="dash-bottom-nav" aria-label="Навигация кабинета">
      <div className="dash-bottom-nav-inner">
        <Link
          href="/dashboard"
          className={`dash-bottom-nav-btn ${onHome ? "dash-bottom-nav-btn--active" : ""}`}
          aria-current={onHome ? "page" : undefined}
          aria-label="Главная"
        >
          <svg className="dash-bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </Link>
        <Link
          href="/plans"
          className={`dash-bottom-nav-btn ${onPlans ? "dash-bottom-nav-btn--active" : ""}`}
          aria-current={onPlans ? "page" : undefined}
          aria-label="Тарифы"
        >
          <svg className="dash-bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10M4 17h7" />
          </svg>
        </Link>
        <Link
          href="/dashboard?view=help"
          className={`dash-bottom-nav-btn ${onHelp ? "dash-bottom-nav-btn--active" : ""}`}
          aria-current={onHelp ? "page" : undefined}
          aria-label="Ещё"
        >
          <svg className="dash-bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Link>
        {isAdmin && (
          <Link
            href="/dashboard?view=design"
            className={`dash-bottom-nav-btn ${onDesign ? "dash-bottom-nav-btn--active" : ""}`}
            aria-current={onDesign ? "page" : undefined}
            aria-label="Дизайн"
          >
            <svg className="dash-bottom-nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          </Link>
        )}
      </div>
    </nav>
  );
}
