import React from "react";
import { Complaint, ComplaintPriority, ComplaintResponse } from "@/types/complaint";
import { StatusBadge } from "@/components/complaints/status-badge";
import { PriorityBadge } from "@/components/complaints/priority-badge";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ComplaintTableProps {
  complaints?: (Complaint | ComplaintResponse)[];
  role?: "CITIZEN" | "OFFICER" | "ADMIN";
  emptyMessage?: string;
  emptyActionHref?: string;
  emptyActionText?: string;
}

export function ComplaintTable({
  complaints = [],
  role = "CITIZEN",
  emptyMessage = "No complaints recorded yet in this view.",
  emptyActionHref,
  emptyActionText,
}: ComplaintTableProps) {
  const router = useRouter();

  if (complaints.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No Complaints Available"
        description={emptyMessage}
        actionHref={emptyActionHref}
        actionText={emptyActionText}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
          <tr>
            <th scope="col" className="px-4 py-3">Ticket ID</th>
            <th scope="col" className="px-4 py-3">Issue Title</th>
            <th scope="col" className="px-4 py-3">Category</th>
            <th scope="col" className="px-4 py-3">Priority</th>
            {role === "ADMIN" && <th scope="col" className="px-4 py-3">Department</th>}
            {role === "OFFICER" && <th scope="col" className="px-4 py-3">Location</th>}
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3">Submitted</th>
            <th scope="col" className="px-4 py-3 text-right">Action</th>
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

            const detailsHref =
              role === "ADMIN"
                ? `/admin/complaints/${item.id}`
                : role === "OFFICER"
                ? `/officer/complaints/${item.id}`
                : `/complaints/${item.id}`;

            return (
              <tr
                key={item.id}
                onClick={() => router.push(detailsHref)}
                className="hover:bg-slate-50/75 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3.5 font-mono text-xs font-semibold text-blue-700">
                  {item.ticket_number || item.id.substring(0, 8)}
                </td>
                <td className="px-4 py-3.5 font-medium text-slate-900 max-w-xs truncate">
                  {item.title}
                </td>
                <td className="px-4 py-3.5 text-slate-600">
                  {categoryName}
                </td>
                <td className="px-4 py-3.5">
                  {item.priority ? (
                    <PriorityBadge priority={item.priority as ComplaintPriority} />
                  ) : (
                    <span className="text-slate-400 text-xs">Unset</span>
                  )}
                </td>
                {role === "ADMIN" && (
                  <td className="px-4 py-3.5 text-slate-600">
                    {item.department || "Unassigned"}
                  </td>
                )}
                {role === "OFFICER" && (
                  <td className="px-4 py-3.5 text-slate-600 max-w-[140px] truncate">
                    {item.location || (item as any).address || "Ward 4"}
                  </td>
                )}
                <td className="px-4 py-3.5">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                  {formatDate(item.created_at)}
                </td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={detailsHref}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
