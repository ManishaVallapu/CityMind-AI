import React from "react";
import { ComplaintPriority } from "@/types/complaint";

interface PriorityBadgeProps {
  priority: ComplaintPriority | string;
  className?: string;
}

const priorityStyles: Record<string, { bg: string; text: string; label: string; border: string }> = {
  CRITICAL: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    label: "Critical",
  },
  HIGH: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    label: "High",
  },
  MEDIUM: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    label: "Medium",
  },
  LOW: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    label: "Low",
  },
};

export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  const normalized = priority.toUpperCase();
  const config = priorityStyles[normalized] || {
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-200",
    label: priority,
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {config.label}
    </span>
  );
}
