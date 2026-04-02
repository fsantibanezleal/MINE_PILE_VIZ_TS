import type { ReactNode } from "react";
import { AlertTriangle, CircleAlert, Info } from "lucide-react";

interface InlineNoticeProps {
  tone?: "info" | "warning" | "error";
  title?: string;
  children: ReactNode;
}

const toneIcon = {
  info: Info,
  warning: AlertTriangle,
  error: CircleAlert,
} as const;

export function InlineNotice({
  tone = "info",
  title,
  children,
}: InlineNoticeProps) {
  const Icon = toneIcon[tone];

  return (
    <div className={`notice-card notice-card--${tone}`}>
      <Icon size={16} />
      <div className="notice-card__content">
        {title ? <strong>{title}</strong> : null}
        <span>{children}</span>
      </div>
    </div>
  );
}
