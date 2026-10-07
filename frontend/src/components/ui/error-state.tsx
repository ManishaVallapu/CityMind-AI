import React from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "An error occurred",
  message,
  retry,
  className = "",
}: ErrorStateProps) {
  return (
    <div className={`p-4 rounded-lg border border-red-200 bg-red-50 text-red-900 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="text-xs text-red-700 mt-0.5">{message}</p>
          {retry && (
            <button
              onClick={retry}
              className="mt-2 text-xs font-medium text-red-800 underline hover:text-red-900"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
