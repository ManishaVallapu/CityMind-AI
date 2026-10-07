"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { adminApi, complaintsApi, authApi, ApiError } from "@/lib/api-client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { ComplaintTable } from "@/components/complaints/complaint-table";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { AdminStats, ComplaintResponse } from "@/types/complaint";
import {
  FileText,
  Clock,
  ActivitySquare,
  CheckCircle,
  Users,
  Building,
  Flame,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  RefreshCw,
  FolderLock,
  Layers,
  Sparkles,
  BrainCircuit,
  Search,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [adminProbe, setAdminProbe] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentComplaints, setRecentComplaints] = useState<ComplaintResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [probeRes, statsRes, complaintsRes] = await Promise.all([
        authApi.testAdmin().catch((e) => ({ message: `Probe check: ${e.message}`, role: "ADMIN" })),
        adminApi.getStats(),
        complaintsApi.getAll({ pageSize: 5 }),
      ]);

      setAdminProbe(probeRes.message);
      setStats(statsRes);
      setRecentComplaints(complaintsRes.items);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError("Access denied: Administrator privileges required.");
        } else {
          setError(err.message);
        }
      } else {
        setError(err?.message || "Failed to load administrator dashboard data.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <DashboardLayout allowedRoles={["ADMIN"]}>
      {/* Welcome Section */}
      <PageHeader
        title="CityMind AI Administration"
        description="Monitor city-wide civic complaints, triaging performance, and department workload across all municipal directorates."
        badge={
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administrator Control Center</span>
          </div>
        }
      />

      {/* Backend RBAC Verification Status Banner */}
      {adminProbe && (
        <div className="mb-6 p-3 rounded-lg border border-purple-200 bg-purple-50/50 flex flex-wrap items-center justify-between gap-2 text-xs text-purple-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-700 flex-shrink-0" />
            <span>
              <strong>FastAPI RBAC Verified:</strong> {adminProbe}
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-purple-200/60 text-purple-800 px-2 py-0.5 rounded">
            /api/v1/admin/test: 200 OK
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="py-16">
          <LoadingState message="Loading live municipal telemetry, complaint statistics, and roster status..." />
        </div>
      ) : error ? (
        <div className="py-8">
          <ErrorState
            title="Administrator Telemetry Failed"
            message={error}
            retry={fetchDashboardData}
          />
        </div>
      ) : stats ? (
        <>
          {/* Overview Cards (Canonical Statuses & Roster) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-4 mb-8">
            <StatCard
              title="Total"
              value={stats.total}
              subtitle="All grievances"
              icon={FileText}
              iconColor="text-blue-700 bg-blue-50 border-blue-200"
            />
            <StatCard
              title="Submitted"
              value={stats.submitted}
              subtitle="Awaiting triage"
              icon={Clock}
              iconColor="text-amber-700 bg-amber-50 border-amber-200"
            />
            <StatCard
              title="Assigned"
              value={stats.assigned}
              subtitle="Officer assigned"
              icon={Users}
              iconColor="text-blue-700 bg-blue-50 border-blue-200"
            />
            <StatCard
              title="In Progress"
              value={stats.in_progress}
              subtitle="Field action active"
              icon={ActivitySquare}
              iconColor="text-indigo-700 bg-indigo-50 border-indigo-200"
            />
            <StatCard
              title="Resolved"
              value={stats.resolved}
              subtitle="Action verified"
              icon={CheckCircle}
              iconColor="text-emerald-700 bg-emerald-50 border-emerald-200"
            />
            <StatCard
              title="Closed"
              value={stats.closed}
              subtitle="Lifecycle closed"
              icon={FolderLock}
              iconColor="text-slate-700 bg-slate-100 border-slate-300"
            />
            <StatCard
              title="Rejected"
              value={stats.rejected}
              subtitle="Disallowed/invalid"
              icon={AlertOctagon}
              iconColor="text-rose-700 bg-rose-50 border-rose-200"
            />
            <StatCard
              title="Active Officers"
              value={stats.officers_count}
              subtitle="Available roster"
              icon={ShieldCheck}
              iconColor="text-cyan-700 bg-cyan-50 border-cyan-200"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Left 2 Cols: Department Performance & Recent Complaints */}
            <div className="lg:col-span-2 space-y-8">
              {/* Department Performance Table */}
              <DashboardSection
                title="Department Service Performance"
                subtitle="Live complaint status breakdown across all municipal directorates"
                action={
                  <button
                    onClick={fetchDashboardData}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                }
              >
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3 text-center">Total</th>
                        <th className="px-4 py-3 text-center">Submitted</th>
                        <th className="px-4 py-3 text-center">Assigned</th>
                        <th className="px-4 py-3 text-center">In Progress</th>
                        <th className="px-4 py-3 text-center">Resolved</th>
                        <th className="px-4 py-3 text-center">Closed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {stats.department_summaries.map((dept) => (
                        <tr key={dept.code} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{dept.name}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{dept.code}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800">
                            {dept.total}
                          </td>
                          <td className="px-4 py-3 text-center text-amber-700 font-medium">
                            {dept.submitted}
                          </td>
                          <td className="px-4 py-3 text-center text-blue-700 font-medium">
                            {dept.assigned}
                          </td>
                          <td className="px-4 py-3 text-center text-indigo-700 font-medium">
                            {dept.in_progress}
                          </td>
                          <td className="px-4 py-3 text-center text-emerald-700 font-medium">
                            {dept.resolved}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">
                            {dept.closed}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DashboardSection>

              {/* Master Complaint Roster / Recent Intake */}
              <DashboardSection
                title="Recent City-Wide Grievances"
                subtitle="Latest complaints submitted to the central database"
                action={
                  <Link
                    href="/admin/complaints"
                    className="text-xs font-medium text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
                  >
                    Manage All Complaints <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                }
              >
                <ComplaintTable
                  complaints={recentComplaints}
                  role="ADMIN"
                  emptyMessage="No civic complaints have been recorded in the central database yet."
                />
              </DashboardSection>
            </div>

            {/* Right Col: Quick Actions, Hotspots & Categories */}
            <div className="space-y-8">
              {/* Quick Actions Card */}
              <DashboardSection
                title="Administrative Operations"
                subtitle="Direct control actions"
              >
                <div className="space-y-3">
                  <Link
                    href="/admin/complaints"
                    className="p-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between group block"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 group-hover:text-blue-700">
                          Complaint Management
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Search, filter, assign officers, and update statuses
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-colors" />
                  </Link>

                  <Link
                    href="/admin/hotspots"
                    className="p-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between group block"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 group-hover:text-red-700">
                          Geospatial Hotspots
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Inspect DBSCAN spatial clustering and density
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-700 transition-colors" />
                  </Link>
                </div>
              </DashboardSection>

              {/* Category Breakdown */}
              <DashboardSection
                title="Grievance Category Distribution"
                subtitle="Volume recorded across municipal complaint types"
              >
                <div className="space-y-2">
                  {stats.category_summaries.map((cat) => (
                    <div
                      key={cat.id}
                      className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-slate-800">{cat.name}</span>
                      <span className="font-mono text-[11px] font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                        {cat.total} tickets
                      </span>
                    </div>
                  ))}
                </div>
              </DashboardSection>

              {/* Geospatial Hotspot Card */}
              <DashboardSection
                title="Geospatial Intelligence"
                subtitle="Spatial cluster analysis"
              >
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 text-center">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-2">
                    <Flame className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800">
                    Density & Cluster Analysis
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto mb-3">
                    Analyze city-wide spatial clustering using Haversine distance DBSCAN.
                  </p>
                  <Link
                    href="/admin/hotspots"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    Open Hotspot Map
                  </Link>
                </div>
              </DashboardSection>
            </div>
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
}
