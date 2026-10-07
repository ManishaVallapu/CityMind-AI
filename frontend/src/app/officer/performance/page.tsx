"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { complaintsApi, ApiError } from "@/lib/api-client";
import { OfficerStats } from "@/types/complaint";
import {
  BarChart3,
  Clock,
  CheckCircle,
  ActivitySquare,
  ClipboardList,
  FolderCheck,
  XCircle,
  Building2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export default function OfficerPerformancePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OfficerStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await complaintsApi.getOfficerStats();
      setStats(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError("Access denied: Officer privileges required to view performance statistics.");
        } else {
          setError(err.message);
        }
      } else {
        setError(err?.message || "Failed to load officer performance statistics.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const total = stats?.total || 0;
  const getPercent = (count: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  return (
    <DashboardLayout allowedRoles={["OFFICER", "ADMIN"]}>
      {/* Header */}
      <PageHeader
        title="Officer Performance & SLA Tracking"
        description="Transparent resolution turnaround metrics calculated strictly from verified grievance records."
        badge={
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Building2 className="w-3.5 h-3.5" />
            <span>{user?.department_name || "Assigned Municipal Unit"}</span>
          </div>
        }
        actions={
          <button
            onClick={fetchStats}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {isLoading ? (
        <div className="py-12">
          <LoadingState message="Calculating performance benchmarks and resolution turnaround..." />
        </div>
      ) : error ? (
        <div className="py-8">
          <ErrorState message={error} retry={fetchStats} />
        </div>
      ) : (
        <>
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Assigned Workload"
              value={stats?.total ?? 0}
              subtitle="All grievances routed to your roster"
              icon={ClipboardList}
              iconColor="text-blue-700 bg-blue-50 border-blue-200"
            />
            <StatCard
              title="Active Queue"
              value={(stats?.assigned ?? 0) + (stats?.in_progress ?? 0)}
              subtitle="Assigned or in progress in field"
              icon={ActivitySquare}
              iconColor="text-indigo-700 bg-indigo-50 border-indigo-200"
            />
            <StatCard
              title="Completed / Closed"
              value={(stats?.resolved ?? 0) + (stats?.closed ?? 0)}
              subtitle="Successfully inspected & resolved"
              icon={CheckCircle}
              iconColor="text-emerald-700 bg-emerald-50 border-emerald-200"
            />
            <StatCard
              title="Average Resolution Turnaround"
              value={
                stats?.avg_resolution_hours !== null && stats?.avg_resolution_hours !== undefined
                  ? `${stats.avg_resolution_hours}h`
                  : "N/A"
              }
              subtitle="Target benchmark: 48.0 hours"
              icon={Clock}
              iconColor="text-amber-700 bg-amber-50 border-amber-200"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Left 2 Cols: Distribution Breakdown */}
            <div className="lg:col-span-2 space-y-8">
              <DashboardSection
                title="Grievance Status Distribution"
                subtitle="Real distribution of work orders across canonical state machine"
              >
                <div className="space-y-4">
                  {/* Assigned Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">ASSIGNED (Awaiting Triage)</span>
                      <span className="font-mono text-slate-500">
                        {stats?.assigned ?? 0} ({getPercent(stats?.assigned ?? 0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="bg-amber-500 h-full transition-all duration-500"
                        style={{ width: `${getPercent(stats?.assigned ?? 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* In Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">IN_PROGRESS (Underway)</span>
                      <span className="font-mono text-slate-500">
                        {stats?.in_progress ?? 0} ({getPercent(stats?.in_progress ?? 0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="bg-indigo-600 h-full transition-all duration-500"
                        style={{ width: `${getPercent(stats?.in_progress ?? 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Resolved Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">RESOLVED (Completed)</span>
                      <span className="font-mono text-slate-500">
                        {stats?.resolved ?? 0} ({getPercent(stats?.resolved ?? 0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${getPercent(stats?.resolved ?? 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Closed Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">CLOSED (Audited)</span>
                      <span className="font-mono text-slate-500">
                        {stats?.closed ?? 0} ({getPercent(stats?.closed ?? 0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="bg-slate-600 h-full transition-all duration-500"
                        style={{ width: `${getPercent(stats?.closed ?? 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Rejected Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">REJECTED (Dismissed)</span>
                      <span className="font-mono text-slate-500">
                        {stats?.rejected ?? 0} ({getPercent(stats?.rejected ?? 0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className="bg-rose-500 h-full transition-all duration-500"
                        style={{ width: `${getPercent(stats?.rejected ?? 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </DashboardSection>
            </div>

            {/* Right Col: SLA Compliance & Navigation */}
            <div className="space-y-8">
              <DashboardSection
                title="SLA Compliance Details"
                subtitle="Departmental service level targets"
              >
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/75 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-600">Overall Resolution Rate</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {stats?.resolution_rate !== null && stats?.resolution_rate !== undefined
                          ? `${stats.resolution_rate}%`
                          : "N/A"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Percentage of assigned grievances that reached completion or final closure.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/75 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-600">Target Benchmark</span>
                      <span className="font-bold text-slate-900 text-sm">48.0 Hours</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                      <span className="font-medium text-slate-600">Your Average</span>
                      <span className="font-bold text-blue-700">
                        {stats?.avg_resolution_hours !== null && stats?.avg_resolution_hours !== undefined
                          ? `${stats.avg_resolution_hours} Hours`
                          : "No resolved tickets yet"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/officer/complaints"
                      className="w-full py-2.5 px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <span>Manage Assigned Complaints</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </DashboardSection>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
