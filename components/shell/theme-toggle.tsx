"use client";

import { SunMoon } from "lucide-react";
import { useTheme } from "@/components/shell/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = `${theme[0].toUpperCase()}${theme.slice(1)} mode`;

  return (
    <button
      type="button"
      className="segmented-button theme-toggle"
      onClick={toggleTheme}
      aria-label="Toggle application theme"
      title="Toggle application theme"
    >
      <SunMoon size={16} />
      <span className="theme-toggle__label" suppressHydrationWarning>
        {label}
      </span>
    </button>
  );
}
