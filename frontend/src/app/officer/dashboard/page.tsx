"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { ComplaintTable } from "@/components/complaints/complaint-table";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { complaintsApi, ApiError } from "@/lib/api-client";
import {
  ComplaintResponse,
  OfficerStats,
  ComplaintPriority,
} from "@/types/complaint";
import {
  ClipboardList,
  Clock,
  ActivitySquare,
  CheckCircle,
  Building2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  SlidersHorizontal,
  RefreshCw,
  FolderCheck,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

export default function OfficerDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OfficerStats | null>(null);
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([]);
  const [activePriorityTab, setActivePriorityTab] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, complaintsData] = await Promise.all([
        complaintsApi.getOfficerStats(),
        complaintsApi.getAll({ assigned_only: true, page: 1, pageSize: 10 }),
      ]);
      setStats(statsData);
      setComplaints(complaintsData.items);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError("Access denied: Municipal officer authorization required.");
        } else {
          setError(err.message);
        }
      } else {
        setError(err?.message || "Failed to load officer dashboard data.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter queue by priority tab
  const filteredComplaints = complaints.filter((c) => {
    if (activePriorityTab === "ALL") return true;
    const priority = (c.priority || c.reference_priority || "").toUpperCase();
    if (activePriorityTab === "HIGH") {
      return priority === "HIGH" || priority === "CRITICAL";
    }
    return priority === activePriorityTab;
  });

  const highPriorityCount = complaints.filter(
    (c) => (c.priority || c.reference_priority || "").toUpperCase() === "HIGH" ||
           (c.priority || c.reference_priority || "").toUpperCase() === "CRITICAL"
  ).length;

  const mediumPriorityCount = complaints.filter(
    (c) => (c.priority || c.reference_priority || "").toUpperCase() === "MEDIUM"
  ).length;

  const lowPriorityCount = complaints.filter(
    (c) => (c.priority || c.reference_priority || "").toUpperCase() === "LOW"
  ).length;

  return (
    <DashboardLayout allowedRoles={["OFFICER", "ADMIN"]}>
      {/* Welcome Header */}
      <PageHeader
        title="Officer Triage & Work Queue"
        description="Investigate, manage field operations, and update assigned civic grievances."
        badge={
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Building2 className="w-3.5 h-3.5" />
            <span>
              {user?.department_name || "Assigned Municipal Department"}
            </span>
          </div>
        }
        actions={
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {error ? (
        <div className="py-8">
          <ErrorState message={error} retry={fetchData} />
        </div>
      ) : isLoading ? (
        <div className="py-12">
          <LoadingState message="Loading assigned grievance queue and SLA metrics..." />
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mb-8">
            <StatCard
              title="Total Assigned"
              value={stats?.total ?? 0}
              subtitle="All assigned grievances"
              icon={ClipboardList}
              iconColor="text-blue-700 bg-blue-50 border-blue-200"
            />
            <StatCard
              title="Assigned"
              value={stats?.assigned ?? 0}
              subtitle="Awaiting initial work"
              icon={Clock}
              iconColor="text-amber-700 bg-amber-50 border-amber-200"
            />
            <StatCard
              title="In Progress"
              value={stats?.in_progress ?? 0}
              subtitle="Field work underway"
              icon={ActivitySquare}
              iconColor="text-indigo-700 bg-indigo-50 border-indigo-200"
            />
            <StatCard
              title="Resolved"
              value={stats?.resolved ?? 0}
              subtitle="Work completed"
              icon={CheckCircle}
              iconColor="text-emerald-700 bg-emerald-50 border-emerald-200"
            />
            <StatCard
              title="Closed"
              value={stats?.closed ?? 0}
              subtitle="Audited and closed"
              icon={FolderCheck}
              iconColor="text-slate-700 bg-slate-50 border-slate-200"
            />
            <StatCard
              title="Rejected"
              value={stats?.rejected ?? 0}
              subtitle="Invalid or dismissed"
              icon={XCircle}
              iconColor="text-rose-700 bg-rose-50 border-rose-200"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Left 2 Cols: Priority Queue & Table */}
            <div className="lg:col-span-2 space-y-8">
              <DashboardSection
                title="Assigned Complaints Priority Queue"
                subtitle="Live civic complaints assigned to your official badge"
                action={
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                      {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActivePriorityTab(tab)}
                          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                            activePriorityTab === tab
                              ? "bg-white text-slate-900 shadow-2xs font-semibold"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {tab === "ALL" ? "All" : tab}
                        </button>
                      ))}
                    </div>
                    <Link
                      href="/officer/complaints"
                      className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-0.5"
                    >
                      View All <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                }
              >
                {/* Priority Indicator Cards */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div
                    onClick={() => setActivePriorityTab("HIGH")}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      activePriorityTab === "HIGH"
                        ? "border-red-300 bg-red-50/50 shadow-2xs"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-red-700">
                      <span>High / Critical</span>
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {highPriorityCount}
                    </div>
                    <div className="text-[10px] text-slate-500">Urgent safety & hazards</div>
                  </div>

                  <div
                    onClick={() => setActivePriorityTab("MEDIUM")}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      activePriorityTab === "MEDIUM"
                        ? "border-amber-300 bg-amber-50/50 shadow-2xs"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-amber-700">
                      <span>Medium</span>
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {mediumPriorityCount}
                    </div>
                    <div className="text-[10px] text-slate-500">Standard operations</div>
                  </div>

                  <div
                    onClick={() => setActivePriorityTab("LOW")}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      activePriorityTab === "LOW"
                        ? "border-slate-400 bg-slate-50 shadow-2xs"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Low</span>
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {lowPriorityCount}
                    </div>
                    <div className="text-[10px] text-slate-500">Routine maintenance</div>
                  </div>
                </div>

                {/* Complaint Queue Table */}
                <ComplaintTable
                  complaints={filteredComplaints}
                  role="OFFICER"
                  emptyMessage="No complaints currently assigned to your roster matching this filter."
                  emptyActionHref="/officer/complaints"
                  emptyActionText="Open Full Work Queue"
                />
              </DashboardSection>
            </div>

            {/* Right Col: Performance Summary & Quick Navigation */}
            <div className="space-y-8">
              <DashboardSection
                title="Performance & SLA Status"
                subtitle="Real-time performance metrics computed from grievance records"
                action={
                  <Link
                    href="/officer/performance"
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
                  >
                    Full report <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                }
              >
                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Resolution Rate</span>
                      <span className="font-bold text-slate-900">
                        {stats?.resolution_rate !== null && stats?.resolution_rate !== undefined
                          ? `${stats.resolution_rate}%`
                          : "N/A"}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, stats?.resolution_rate || 0))}%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      {stats?.resolved ?? 0} resolved + {stats?.closed ?? 0} closed of {stats?.total ?? 0} total
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Average Resolution Time</span>
                      <span className="font-bold text-slate-900">
                        {stats?.avg_resolution_hours !== null && stats?.avg_resolution_hours !== undefined
                          ? `${stats.avg_resolution_hours} hrs`
                          : "N/A (No completed tickets)"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Measured from ticket submission to verified completion.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Active Workload</span>
                      <span className="font-bold text-blue-700">
                        {(stats?.assigned ?? 0) + (stats?.in_progress ?? 0)} active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Tickets currently requiring field inspection or active repair.
                    </p>
                  </div>
                </div>
              </DashboardSection>

              {/* Quick Actions Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Quick Navigation
                </h4>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/officer/complaints"
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-between"
                  >
                    <span>Manage Assigned Complaints</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/officer/performance"
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center justify-between"
                  >
                    <span>View Performance & SLA Report</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
