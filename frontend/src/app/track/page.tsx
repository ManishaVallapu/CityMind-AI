"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, ArrowLeft, Clock, ShieldCheck, AlertCircle } from "lucide-react";

export default function TrackComplaintPage() {
  const [ticketId, setTicketId] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketId.trim()) {
      setSearched(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white font-bold text-sm">
              CM
            </div>
            <span className="font-bold text-slate-900 text-base">
              CityMind <span className="text-blue-700">AI</span>
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-blue-700 hover:text-blue-800"
          >
            Go to Dashboard &rarr;
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Track Grievance Redressal Status
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enter your official municipal grievance tracking identifier (e.g. CM-20261004-8921)
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={ticketId}
                onChange={(e) => {
                  setTicketId(e.target.value);
                  setSearched(false);
                }}
                placeholder="CM-20261004-XXXX"
                className="block w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm uppercase placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
            >
              Search Ticket
            </button>
          </form>

          {searched && (
            <div className="mt-6 p-4 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800 flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Ticket Inquiry: {ticketId.toUpperCase()}</p>
                <p className="mt-0.5 text-amber-700">
                  Phase 2 backend complaint intake endpoints are currently pending implementation. Once connected, live status progression and timeline history will be displayed here.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 rounded-lg border border-slate-200 bg-white text-xs text-slate-500 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-blue-700 flex-shrink-0" />
          <span>
            Tickets are verified using municipal cryptographic audit trails. Need assistance? Contact civic support at redressal@citymind.gov.
          </span>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        CityMind AI Civic Tracking Portal
      </footer>
    </div>
  );
}
