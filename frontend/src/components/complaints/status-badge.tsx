import React from "react";
import { ComplaintStatus } from "@/types/complaint";

interface StatusBadgeProps {
  status: ComplaintStatus | string;
  className?: string;
}

const statusStyles: Record<string, { bg: string; text: string; label: string; border: string }> = {
  SUBMITTED: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    label: "Submitted",
  },
  ASSIGNED: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    label: "Assigned",
  },
  IN_PROGRESS: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    label: "In Progress",
  },
  RESOLVED: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    label: "Resolved",
  },
  CLOSED: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
    label: "Closed",
  },
  REJECTED: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    label: "Rejected",
  },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const normalized = status.toUpperCase();
  const config = statusStyles[normalized] || {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {config.label}
    </span>
  );
}
