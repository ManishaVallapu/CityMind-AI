"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/complaints/status-badge";
import { PriorityBadge } from "@/components/complaints/priority-badge";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { complaintsApi, ApiError } from "@/lib/api-client";
import {
  ComplaintResponse,
  ComplaintCategory,
  ComplaintStatus,
  ComplaintPriority,
} from "@/types/complaint";
import { formatDate } from "@/lib/utils";
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Building2,
  Calendar,
  MapPin,
} from "lucide-react";

const CANONICAL_STATUSES: { label: string; value: string }[] = [
  { label: "All Statuses", value: "ALL" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Assigned", value: "ASSIGNED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" },
  { label: "Rejected", value: "REJECTED" },
];

export default function OfficerComplaintsQueuePage() {
  const router = useRouter();

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Data States
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);

  // UI States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load category metadata for filtering
  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await complaintsApi.getCategories();
        setCategories(cats);
      } catch (e) {
        // Fallback silently if categories non-critical
      }
    }
    loadCategories();
  }, []);

  // Fetch officer assigned complaints
  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await complaintsApi.getAll({
        assigned_only: true,
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        category_id: selectedCategoryId !== "ALL" ? Number(selectedCategoryId) : undefined,
        search: debouncedSearch.trim() || undefined,
        page: currentPage,
        pageSize,
      });

      setComplaints(res.items);
      setTotalCount(res.total);
      setTotalPages(res.total_pages || Math.ceil(res.total / pageSize) || 1);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError("Access denied: Officer privileges required to view work queue.");
        } else {
          setError(err.message);
        }
      } else {
        setError(err?.message || "Failed to load assigned complaints from database.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, selectedCategoryId, debouncedSearch, currentPage]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedStatus("ALL");
    setSelectedCategoryId("ALL");
    setCurrentPage(1);
  };

  return (
    <DashboardLayout allowedRoles={["OFFICER", "ADMIN"]}>
      {/* Header */}
      <PageHeader
        title="Assigned Complaints Queue"
        description="Review, triage, and progress civic grievances specifically assigned to your municipal roster."
        badge={
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Assigned Work Orders</span>
          </div>
        }
        actions={
          <button
            onClick={fetchComplaints}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs mb-6 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ticket number, title, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
            >
              {CANONICAL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-48">
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Action */}
          {(searchTerm || selectedStatus !== "ALL" || selectedCategoryId !== "ALL") && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Counter Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{complaints.length}</strong> of{" "}
            <strong className="text-slate-800">{totalCount}</strong> assigned complaints
          </span>
          {selectedStatus !== "ALL" && (
            <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
              Filtered: {selectedStatus}
            </span>
          )}
        </div>
      </div>

      {/* Main Table or Loading/Error State */}
      {isLoading ? (
        <div className="py-12">
          <LoadingState message="Retrieving your assigned complaints..." />
        </div>
      ) : error ? (
        <div className="py-8">
          <ErrorState message={error} retry={fetchComplaints} />
        </div>
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No Assigned Complaints"
          description={
            searchTerm || selectedStatus !== "ALL" || selectedCategoryId !== "ALL"
              ? "No assigned complaints matched your search or filter criteria. Try resetting filters."
              : "You currently have no complaints assigned to your roster. New tickets routed by administrators will appear here."
          }
          actionHref={
            searchTerm || selectedStatus !== "ALL" || selectedCategoryId !== "ALL"
              ? undefined
              : "/officer/dashboard"
          }
          actionText={
            searchTerm || selectedStatus !== "ALL" || selectedCategoryId !== "ALL"
              ? undefined
              : "Back to Dashboard"
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3.5">Ticket ID</th>
                  <th scope="col" className="px-4 py-3.5">Issue Title</th>
                  <th scope="col" className="px-4 py-3.5">Category</th>
                  <th scope="col" className="px-4 py-3.5">Priority</th>
                  <th scope="col" className="px-4 py-3.5">Location</th>
                  <th scope="col" className="px-4 py-3.5">Status</th>
                  <th scope="col" className="px-4 py-3.5">Submitted</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {complaints.map((item) => {
                  const categoryName =
                    typeof item.category === "object" && item.category !== null
                      ? item.category.name
                      : typeof item.category === "string"
                      ? item.category
                      : "General";

                  const locationText =
                    item.location || item.address || item.location_text || "Unspecified location";

                  const detailsHref = `/officer/complaints/${item.id}`;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => router.push(detailsHref)}
                      className="hover:bg-slate-50/75 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5 font-mono text-xs font-semibold text-blue-700">
                        {item.ticket_number || item.id.substring(0, 8)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 max-w-xs truncate group-hover:text-blue-700 transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 max-w-xs truncate mt-0.5">
                          {item.description}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                        {categoryName}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.priority || item.reference_priority ? (
                          <PriorityBadge
                            priority={(item.priority || item.reference_priority) as ComplaintPriority}
                          />
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs max-w-[160px] truncate">
                        <span title={locationText}>{locationText}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(item.created_at)}
                      </td>
                      <td
                        className="px-4 py-3.5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          href={detailsHref}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50/50 hover:bg-blue-100/70 px-2.5 py-1 rounded transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View & Update
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-3 px-1 text-xs text-slate-600">
              <div>
                Page <strong className="text-slate-900">{currentPage}</strong> of{" "}
                <strong className="text-slate-900">{totalPages}</strong>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || isLoading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none font-medium transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || isLoading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none font-medium transition-colors"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
