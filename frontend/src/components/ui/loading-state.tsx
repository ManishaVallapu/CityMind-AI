import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading data...", className = "" }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center text-slate-500 ${className}`}>
      <Loader2 className="w-8 h-8 animate-spin text-blue-700 mb-3" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
