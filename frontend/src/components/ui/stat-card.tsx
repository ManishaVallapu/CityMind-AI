import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value?: string | number | null;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  badgeText?: string;
  isPlaceholder?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-blue-700 bg-blue-50 border-blue-100",
  badgeText,
  isPlaceholder = false,
}: StatCardProps) {
  const hasValue = value !== undefined && value !== null && value !== "";

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={`p-2 rounded-md border ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        {hasValue && !isPlaceholder ? (
          <span className="text-2xl font-bold text-slate-900">{value}</span>
        ) : (
          <span className="text-sm font-medium text-slate-400 italic">No data yet</span>
        )}

        {badgeText && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
            {badgeText}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500 mt-1">
        {subtitle || (isPlaceholder || !hasValue ? "Awaiting backend intake" : "")}
      </p>
    </div>
  );
}
