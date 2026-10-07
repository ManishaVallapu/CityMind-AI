"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { RoleName } from "@/types/auth";
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  Search,
  Bell,
  User,
  Settings,
  ClipboardList,
  BarChart3,
  Users,
  Building,
  Flame,
  Shield,
  X,
  Building2,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isPlaceholder?: boolean;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { role, user } = useAuth();

  const getCitizenNavItems = (): NavItem[] => [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Complaints", href: "/complaints", icon: FileText },
    { label: "Submit Complaint", href: "/complaints/new", icon: FilePlus2, badge: "New" },
    { label: "Track Complaint", href: "/track", icon: Search },
    { label: "Notifications", href: "#notifications", icon: Bell, isPlaceholder: true },
    { label: "Profile / Settings", href: "#profile", icon: User, isPlaceholder: true },
  ];

  const getOfficerNavItems = (): NavItem[] => [
    { label: "Dashboard", href: "/officer/dashboard", icon: LayoutDashboard },
    { label: "Assigned Complaints", href: "/officer/complaints", icon: ClipboardList },
    { label: "Performance", href: "/officer/performance", icon: BarChart3 },
  ];

  const getAdminNavItems = (): NavItem[] => [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Complaints", href: "/admin/complaints", icon: FileText },
    { label: "Hotspots", href: "/admin/hotspots", icon: Flame, badge: "AI" },
  ];

  const navItems =
    role === "ADMIN"
      ? getAdminNavItems()
      : role === "OFFICER"
      ? getOfficerNavItems()
      : getCitizenNavItems();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-slate-200 bg-white flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Sidebar Header */}
          <div className="flex h-16 items-center justify-between px-5 border-b border-slate-200">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold text-xs">
                CM
              </div>
              <span className="font-bold text-slate-900 text-sm tracking-tight">
                CityMind <span className="text-blue-700">AI</span>
              </span>
            </Link>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 lg:hidden"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Role Status Tag */}
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Portal Role:</span>
              <span className="font-semibold text-blue-700 uppercase tracking-wider text-[11px] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                {role || "CITIZEN"}
              </span>
            </div>
            {user?.department_name && (
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-600">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span className="truncate">{user.department_name}</span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/admin/dashboard" && item.href !== "/officer/dashboard" && pathname.startsWith(item.href) && !item.href.includes("#"));

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => onClose && onClose()}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-blue-700" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                      {item.badge}
                    </span>
                  )}
                  {item.isPlaceholder && (
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-100 text-slate-400">
                      Soon
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/75">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span className="truncate">CityMind Redressal Engine</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Phase 1 Verified Baseline
          </div>
        </div>
      </aside>
    </>
  );
}
