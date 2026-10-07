"use client";

import React from "react";
import { useAuth } from "@/context/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { QuickActionCard } from "@/components/ui/quick-action-card";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { ComplaintTable } from "@/components/complaints/complaint-table";
import {
  FileText,
  Clock,
  CheckCircle,
  FilePlus2,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  Building,
  UserCheck,
  ActivitySquare,
} from "lucide-react";
import Link from "next/link";

export default function CitizenDashboardPage() {
  const { user } = useAuth();

  return (
    <DashboardLayout allowedRoles={["CITIZEN", "OFFICER", "ADMIN"]}>
      {/* Welcome Section */}
      <PageHeader
        title={`Welcome back, ${user?.full_name || "Citizen"}`}
        description="Report civic issues and track their resolution in real time."
        actions={
          <Link
            href="/complaints/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-colors"
          >
            <FilePlus2 className="w-4 h-4" />
            Report an Issue
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Complaints"
          value={null}
          subtitle="Will appear after complaints are submitted"
          icon={FileText}
          iconColor="text-blue-700 bg-blue-50 border-blue-200"
          isPlaceholder={true}
        />
        <StatCard
          title="Submitted"
          value={null}
          subtitle="Awaiting department acknowledgment"
          icon={Clock}
          iconColor="text-amber-700 bg-amber-50 border-amber-200"
          isPlaceholder={true}
        />
        <StatCard
          title="In Progress"
          value={null}
          subtitle="Under active field investigation"
          icon={ActivitySquare}
          iconColor="text-indigo-700 bg-indigo-50 border-indigo-200"
          isPlaceholder={true}
        />
        <StatCard
          title="Resolved"
          value={null}
          subtitle="Work order signed off by municipal team"
          icon={CheckCircle}
          iconColor="text-emerald-700 bg-emerald-50 border-emerald-200"
          isPlaceholder={true}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            title="Report an Issue"
            description="Submit a new civic grievance with GPS pin drop and photographic evidence."
            href="/complaints/new"
            icon={FilePlus2}
            badge="Submit"
          />
          <QuickActionCard
            title="View My Complaints"
            description="Browse historical submissions, review status logs and response notes."
            href="/complaints"
            icon={FileText}
            badge="Archive"
          />
          <QuickActionCard
            title="Track Complaint"
            description="Check the current milestone and expected resolution deadline by ticket ID."
            href="/track"
            icon={Search}
            badge="Instant"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Complaints Table */}
        <div className="lg:col-span-2">
          <DashboardSection
            title="Recent Complaints"
            subtitle="Your active and recently updated municipal grievances"
            action={
              <Link
                href="/complaints"
                className="text-xs font-medium text-blue-700 hover:text-blue-900 inline-flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {/* Empty state until Phase 2 complaint endpoints are connected */}
            <ComplaintTable
              complaints={[]}
              role="CITIZEN"
              emptyMessage="You have not submitted any complaints yet. Use the 'Report an Issue' action to file your first grievance."
              emptyActionHref="/complaints/new"
              emptyActionText="File a Grievance"
            />
          </DashboardSection>
        </div>

        {/* Civic Guidance / Lifecycle Overview */}
        <div>
          <DashboardSection
            title="How CityMind AI Works"
            subtitle="The 5-stage civic grievance lifecycle"
          >
            <ol className="relative border-l border-slate-200 space-y-5 ml-2.5 my-2">
              <li className="ml-5">
                <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  1
                </span>
                <h4 className="text-xs font-semibold text-slate-900">
                  Submit a complaint
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Citizen provides title, description, GPS location, and optional photos.
                </p>
              </li>

              <li className="ml-5">
                <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  2
                </span>
                <h4 className="text-xs font-semibold text-slate-900">
                  AI analyzes the issue
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Natural language models evaluate urgency, detect duplicates, and forecast resolution SLA.
                </p>
              </li>

              <li className="ml-5">
                <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  3
                </span>
                <h4 className="text-xs font-semibold text-slate-900">
                  Appropriate department identified
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Work order is automatically routed to Roads, Water, Electricity, or Waste.
                </p>
              </li>

              <li className="ml-5">
                <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  4
                </span>
                <h4 className="text-xs font-semibold text-slate-900">
                  Officer handles the complaint
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Municipal engineer inspects on-site, logs status updates, and executes repairs.
                </p>
              </li>

              <li className="ml-5">
                <span className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  5
                </span>
                <h4 className="text-xs font-semibold text-slate-900">
                  Citizen tracks resolution
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Live timeline reflects timestamped verification and final resolution notice.
                </p>
              </li>
            </ol>

            <div className="mt-5 p-3 rounded-md bg-blue-50/70 border border-blue-100 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-blue-900 leading-relaxed">
                <span className="font-semibold">Civic Redressal Guarantee:</span> Every submission generates an immutable ticket receipt complying with municipal citizen charters.
              </p>
            </div>
          </DashboardSection>
        </div>
      </div>
    </DashboardLayout>
  );
}
