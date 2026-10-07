"use client";

import React from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { Flame, MapPin, Layers, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminHotspotsPage() {
  return (
    <DashboardLayout allowedRoles={["ADMIN"]}>
      <div className="mb-4">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Administration
        </Link>
      </div>

      <PageHeader
        title="Geospatial Hotspots & Ward Density"
        description="DBSCAN spatial clustering and 2D Gaussian Kernel Density Estimation (KDE) for municipal infrastructure analysis."
        badge={
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <Flame className="w-3.5 h-3.5" />
            <span>Phase 6 Spatial Analytics</span>
          </div>
        }
      />

      <DashboardSection
        title="Interactive Hotspot Map"
        subtitle="Unsupervised spatial clustering mapping recurrent infrastructure breakdown"
      >
        <div className="h-96 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
            <Flame className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Hotspot analysis will appear when complaint location data is available.
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            In Phase 6, this container will host the full-screen Leaflet raster map rendered with dynamic DBSCAN cluster polygons, marker cluster groups, and KDE density contours.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full text-left text-xs">
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="font-semibold text-red-700 block mb-0.5">DBSCAN Clusters</span>
              <span className="text-[11px] text-slate-500">Haversine metric identifying high-density grievance zones.</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="font-semibold text-amber-700 block mb-0.5">KDE Heatmaps</span>
              <span className="text-[11px] text-slate-500">Smooth continuous probability density surfaces.</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white">
              <span className="font-semibold text-blue-700 block mb-0.5">Ward Aggregates</span>
              <span className="text-[11px] text-slate-500">Municipal boundary polygon filtering and reports.</span>
            </div>
          </div>
        </div>
      </DashboardSection>
    </DashboardLayout>
  );
}
