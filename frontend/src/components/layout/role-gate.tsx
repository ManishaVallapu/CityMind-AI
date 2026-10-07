"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { RoleName } from "@/types/auth";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LoadingState } from "@/components/ui/loading-state";

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles?: RoleName[];
}

export function RoleGate({ children, allowedRoles }: RoleGateProps) {
  const { user, role, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState message="Verifying security credentials & municipal role..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect via useEffect
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // User does not have the required role
    const getHomeDashboard = () => {
      if (role === "ADMIN") return "/admin/dashboard";
      if (role === "OFFICER") return "/officer/dashboard";
      return "/dashboard";
    };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg border border-red-200 shadow-sm p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 mb-4">
            Your authenticated role is <span className="font-semibold text-slate-800">[{role}]</span>. 
            This portal requires one of the following roles:{" "}
            <span className="font-medium text-slate-800">{allowedRoles.join(", ")}</span>.
          </p>
          <div className="pt-2">
            <Link
              href={getHomeDashboard()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Your Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
