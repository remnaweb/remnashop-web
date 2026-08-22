"use client";

import type { ReactNode } from "react";

export default function DashboardShell({ children }: { children: ReactNode }) {
  return <div className="dashboard-theme">{children}</div>;
}
