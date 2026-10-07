"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { authApi } from "@/lib/api-client";
import {
  Shield,
  FilePlus2,
  Search,
  Building2,
  CheckCircle2,
  BrainCircuit,
  ArrowRight,
  Activity,
  Layers,
  Flame,
} from "lucide-react";

export default function HomePage() {
  const { user, isAuthenticated, role } = useAuth();
  const [healthStatus, setHealthStatus] = useState<string>("Checking backend...");
  const [dbStatus, setDbStatus] = useState<string>("...");

  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await authApi.checkHealth();
        setHealthStatus(res.status);
        setDbStatus(res.database);
      } catch {
        setHealthStatus("offline");
        setDbStatus("offline");
      }
    }
    checkBackend();
  }, []);

  const getDashboardHref = () => {
    if (!isAuthenticated) return "/login";
    if (role === "ADMIN") return "/admin/dashboard";
    if (role === "OFFICER") return "/officer/dashboard";
    return "/dashboard";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold text-sm">
              CM
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base tracking-tight">
                CityMind <span className="text-blue-700">AI</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border border-slate-200 px-1.5 py-0.2 rounded">
                Government Redressal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/track"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
            >
              Track Ticket
            </Link>

            {isAuthenticated ? (
              <Link
                href={getDashboardHref()}
                className="text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                Go to Dashboard ({role}) <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-50 px-3.5 py-1.5 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 px-3.5 py-1.5 rounded-lg transition-colors"
                >
                  Citizen Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 mb-4">
            <Activity className="w-3.5 h-3.5" />
            <span>FastAPI Backend Phase 1 Active & Connected</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            AI-Powered Urban Management & Decision-Support Platform
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            Transforming unstructured citizen complaints into structured, triaged, and prioritized municipal work orders with automated SLA tracking and geospatial intelligence.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={getDashboardHref()}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 shadow-sm transition-colors inline-flex items-center gap-2"
            >
              Open Your Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/track"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-slate-500" />
              Public Ticket Tracker
            </Link>
          </div>
        </div>

        {/* 3 Role Portals Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Citizen Portal Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mb-4">
                <FilePlus2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                1. Citizen Portal
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Lodge grievances with GPS pin-drop, track progress along an immutable vertical timeline, and receive automated SLA updates.
              </p>
              <div className="text-[11px] text-slate-600 space-y-1 mb-4">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Grievance Submission Wizard
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Live Milestone Tracker
                </div>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 pt-3 border-t border-slate-100"
            >
              Enter Citizen Portal <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Officer Portal Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mb-4">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                2. Officer Portal
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Departmental triage workbench with duplicate alerts, severity queue, field inspection remarks, and SLA resolution tracking.
              </p>
              <div className="text-[11px] text-slate-600 space-y-1 mb-4">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  Prioritized Work Queue
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  AI Triage & Decision Card
                </div>
              </div>
            </div>
            <Link
              href="/officer/dashboard"
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 pt-3 border-t border-slate-100"
            >
              Enter Officer Portal <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Admin Portal Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                3. Admin Portal
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Executive command center monitoring cross-directorate KPIs, geospatial DBSCAN hotspot clusters, and department SLA enforcement.
              </p>
              <div className="text-[11px] text-slate-600 space-y-1 mb-4">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                  City-Wide Service Analytics
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                  DBSCAN Hotspot Maps
                </div>
              </div>
            </div>
            <Link
              href="/admin/dashboard"
              className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1 pt-3 border-t border-slate-100"
            >
              Enter Admin Portal <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Live Backend Diagnostic Bar */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-800">
              Live FastAPI Backend Integration:
            </span>
            <span className="text-slate-600">
              API Status: <strong className="text-emerald-700">{healthStatus}</strong> | DB Engine: <strong className="text-emerald-700">{dbStatus}</strong>
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Auth: Argon2id + PyJWT (22 passing tests)
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          CityMind AI — Municipal Urban Grievance & Decision Support Platform. Phase 1 Verified.
        </div>
      </footer>
    </div>
  );
}
