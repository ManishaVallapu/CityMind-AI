"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { ComplaintTable } from "@/components/complaints/complaint-table";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { complaintsApi, ApiError } from "@/lib/api-client";
import { ComplaintResponse } from "@/types/complaint";
import { FilePlus2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function ComplaintsListPage() {
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await complaintsApi.getMy(page, pageSize);
      setComplaints(response.items);
      setTotal(response.total);
      setTotalPages(response.total_pages || 1);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err?.message || "Failed to load submitted complaints.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  return (
    <DashboardLayout allowedRoles={["CITIZEN", "OFFICER", "ADMIN"]}>
      <PageHeader
        title="My Submitted Grievances"
        description="Comprehensive archive of all complaints registered under your citizen account."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchComplaints()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors disabled:opacity-50"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <Link
              href="/complaints/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-colors"
            >
              <FilePlus2 className="w-4 h-4" />
              Report an Issue
            </Link>
          </div>
        }
      />

      <DashboardSection
        title="Grievance History"
        subtitle={
          total > 0
            ? `Showing ${complaints.length} of ${total} grievance record${total !== 1 ? "s" : ""}`
            : "Filterable archive of your submitted tickets"
        }
      >
        {isLoading ? (
          <LoadingState message="Retrieving your submitted grievances from municipal intake..." />
        ) : error ? (
          <ErrorState
            title="Unable to Load Grievance Records"
            message={error}
            retry={fetchComplaints}
          />
        ) : (
          <div className="space-y-4">
            <ComplaintTable
              complaints={complaints}
              role="CITIZEN"
              emptyMessage="You have not submitted any civic grievances yet. Click 'Report an Issue' to lodge a municipal defect."
              emptyActionHref="/complaints/new"
              emptyActionText="Report an Issue"
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 pt-4 px-2 text-xs text-slate-600">
                <span>
                  Page <strong className="font-semibold text-slate-900">{page}</strong> of{" "}
                  <strong className="font-semibold text-slate-900">{totalPages}</strong> ({total} total tickets)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1 || isLoading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page >= totalPages || isLoading}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </DashboardSection>
    </DashboardLayout>
  );
}
