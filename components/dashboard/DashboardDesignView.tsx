"use client";

import ThemeEditor from "./ThemeEditor";
import DashboardPageHeader from "./DashboardPageHeader";

export default function DashboardDesignView({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <DashboardPageHeader title="Дизайн" onBack={onBack} />
      <p className="dash-section-label">Кабинет</p>
      <ThemeEditor />
    </div>
  );
}
