"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { User, LogOut, ChevronDown, Shield, Building2 } from "lucide-react";

export function UserProfileMenu() {
  const { user, role, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const getRoleBadgeColor = () => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "OFFICER":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
        aria-expanded={isOpen}
      >
        <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs">
          {user.full_name
            ? user.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()
            : "U"}
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-semibold text-slate-900 leading-tight">
            {user.full_name}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${getRoleBadgeColor()}`}>
              {role || "CITIZEN"}
            </span>
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white border border-slate-200 shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-2.5 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-900">{user.full_name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            {user.department_name && (
              <p className="text-[11px] text-slate-600 flex items-center gap-1 mt-1">
                <Building2 className="w-3 h-3 text-slate-400" />
                {user.department_name}
              </p>
            )}
          </div>

          <div className="py-1">
            <div className="px-3.5 py-1.5 text-[11px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Role: {role}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full px-3.5 py-2 text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-colors font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
