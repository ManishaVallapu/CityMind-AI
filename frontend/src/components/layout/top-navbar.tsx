"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { UserProfileMenu } from "@/components/layout/user-profile-menu";
import { Bell, Menu, ShieldCheck } from "lucide-react";

interface TopNavbarProps {
  onToggleSidebar?: () => void;
}

export function TopNavbar({ onToggleSidebar }: TopNavbarProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur transition-all">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow-sm font-bold text-sm tracking-tight">
            CM
          </div>
          <div>
            <span className="font-bold text-slate-900 text-base tracking-tight">
              CityMind <span className="text-blue-700">AI</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border border-slate-200 px-1.5 py-0.2 rounded">
              Civic Ops
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notification Icon Placeholder */}
        <div className="relative">
          <button
            type="button"
            className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative"
            title="Notifications (Will be connected in Phase 2)"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600"></span>
          </button>
        </div>

        {/* User Profile Menu */}
        <div className="border-l border-slate-200 pl-2 sm:pl-3">
          <UserProfileMenu />
        </div>
      </div>
    </header>
  );
}
