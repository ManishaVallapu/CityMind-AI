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
import { complaintsApi, adminApi, ApiError } from "@/lib/api-client";
import {
  ComplaintResponse,
  ComplaintCategory,
  Department,
  ComplaintStatus,
  ComplaintPriority,
} from "@/types/complaint";
import { formatDate } from "@/lib/utils";
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
  User,
  MapPin,
  Calendar,
  Building,
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

export default function AdminComplaintsPage() {
  const router = useRouter();

  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Data States
  const [complaints, setComplaints] = useState<ComplaintResponse[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

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

  // Load filter reference metadata once
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [cats, depts] = await Promise.all([
          complaintsApi.getCategories().catch(() => []),
          adminApi.getDepartments().catch(() => []),
        ]);
        setCategories(cats);
        setDepartments(depts);
      } catch (e) {
        // Fallback silently if non-critical
      }
    }
    loadMetadata();
  }, []);

  // Fetch complaints
  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await complaintsApi.getAll({
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
        category_id: selectedCategoryId !== "ALL" ? Number(selectedCategoryId) : undefined,
        department_id: selectedDepartmentId !== "ALL" ? Number(selectedDepartmentId) : undefined,
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
          setError("Access denied: Administrator privileges required to manage complaints.");
        } else {
          setError(err.message);
        }
      } else {
        setError(err?.message || "Failed to load complaints from central database.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, selectedCategoryId, selectedDepartmentId, debouncedSearch, currentPage]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedStatus("ALL");
    setSelectedCategoryId("ALL");
    setSelectedDepartmentId("ALL");
    setCurrentPage(1);
  };

  return (
    <DashboardLayout allowedRoles={["ADMIN"]}>
      {/* Header */}
      <PageHeader
        title="Admin Complaint Management"
        description="Comprehensive city-wide grievance ledger. Search, filter, assign officers, and update statuses according to official state rules."
        badge={
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Master Grievance Registry</span>
          </div>
        }
        actions={
          <button
            onClick={fetchComplaints}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ticket, title, address..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder-slate-400"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
            >
              {CANONICAL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDepartmentId}
              onChange={(e) => {
                setSelectedDepartmentId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pills for fast clicking */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Quick Filter:
          </span>
          {CANONICAL_STATUSES.map((s) => {
            const isSelected = selectedStatus === s.value;
            return (
              <button
                key={s.value}
                onClick={() => {
                  setSelectedStatus(s.value);
                  setCurrentPage(1);
                }}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors border ${
                  isSelected
                    ? "bg-blue-700 text-white border-blue-700 font-semibold"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {s.label}
              </button>
            );
          })}

          {(searchTerm || selectedStatus !== "ALL" || selectedCategoryId !== "ALL" || selectedDepartmentId !== "ALL") && (
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-medium text-rose-600 hover:text-rose-800 ml-auto px-2 py-1"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content State */}
      {isLoading ? (
        <div className="py-16">
          <LoadingState message="Retrieving grievance roster from municipal database..." />
        </div>
      ) : error ? (
        <div className="py-8">
          <ErrorState
            title="Failed to Load Complaints"
            message={error}
            retry={fetchComplaints}
          />
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <EmptyState
            icon={Inbox}
            title="No Grievances Found"
            description={
              searchTerm || selectedStatus !== "ALL" || selectedCategoryId !== "ALL" || selectedDepartmentId !== "ALL"
                ? "No complaints match your active filter criteria. Try resetting or adjusting the parameters."
                : "No civic grievances have been recorded in the central database yet."
            }
            actionText={
              searchTerm || selectedStatus !== "ALL" || selectedCategoryId !== "ALL" || selectedDepartmentId !== "ALL"
                ? "Reset Filters"
                : undefined
            }
            onAction={
              searchTerm || selectedStatus !== "ALL" || selectedCategoryId !== "ALL" || selectedDepartmentId !== "ALL"
                ? handleResetFilters
                : undefined
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Header Summary */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong>{complaints.length}</strong> of <strong>{totalCount}</strong> grievances
            </span>
            <span>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">Title & Summary</th>
                  <th className="px-4 py-3">Citizen</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Assigned Officer</th>
                  <th className="px-4 py-3">Filed Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
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

                  return (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/admin/complaints/${item.id}`)}
                      className="hover:bg-slate-50/75 transition-colors cursor-pointer"
                    >
                      {/* Ticket Number */}
                      <td className="px-4 py-3.5 font-mono font-semibold text-blue-700 whitespace-nowrap">
                        {item.ticket_number}
                      </td>

                      {/* Title & Address */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-medium text-slate-900 truncate" title={item.title}>
                          {item.title}
                        </div>
                        {(item.address || item.location_text || item.location) && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate mt-0.5">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">
                              {item.address || item.location_text || item.location}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Citizen */}
                      <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">
                        {item.citizen?.full_name ? (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.citizen.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Citizen</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                        {categoryName}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.priority ? (
                          <PriorityBadge priority={item.priority as ComplaintPriority} />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Assigned Officer */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.assigned_officer ? (
                          <div className="text-[11px]">
                            <span className="font-semibold text-slate-800">
                              {item.assigned_officer.badge_number}
                            </span>
                            {item.assigned_officer.user?.full_name && (
                              <span className="text-slate-500 block">
                                {item.assigned_officer.user.full_name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-500">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Filed Date */}
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap text-[11px]">
                        {formatDate(item.created_at)}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/admin/complaints/${item.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1 || isLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages || isLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
