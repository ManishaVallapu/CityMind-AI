"use client";

import React, { useState, useEffect } from "react";
import { complaintsApi, ApiError } from "@/lib/api-client";
import { ComplaintAttachment } from "@/types/complaint";
import {
  FileImage,
  ExternalLink,
  Download,
  AlertTriangle,
  RefreshCw,
  X,
  Maximize2,
} from "lucide-react";

interface ComplaintAttachmentItemProps {
  complaintId: string;
  attachment: ComplaintAttachment;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function ComplaintAttachmentItem({
  complaintId,
  attachment,
  className = "",
}: ComplaintAttachmentItemProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const loadMediaBlob = () => {
    setIsLoading(true);
    setError(null);

    let isMounted = true;
    let createdUrl: string | null = null;

    complaintsApi
      .getAttachmentBlob(complaintId, attachment.id)
      .then((blob) => {
        if (!isMounted) return;
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
        setIsLoading(false);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        if (err instanceof ApiError && err.status === 401) {
          setError("Authentication required to view attachment.");
        } else if (err instanceof ApiError && err.status === 403) {
          setError("Access denied: You are not authorized to view this attachment.");
        } else {
          setError(err?.message || "Failed to load image evidence.");
        }
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  };

  useEffect(() => {
    const cleanup = loadMediaBlob();
    return () => {
      cleanup();
    };
  }, [complaintId, attachment.id]);

  return (
    <>
      <div
        className={`p-3 rounded-lg border border-slate-200 bg-slate-50/75 space-y-2.5 transition-all hover:border-slate-300 ${className}`}
      >
        {/* Thumbnail Preview Area */}
        <div className="relative aspect-video w-full rounded-md overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-1.5 text-slate-400 py-6">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-[11px] font-medium">Authenticating & Loading...</span>
            </div>
          ) : error ? (
            <div className="p-3 text-center space-y-1.5">
              <div className="flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-[11px] text-slate-600 font-medium px-2">{error}</p>
              <button
                onClick={loadMediaBlob}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          ) : blobUrl ? (
            <div
              className="relative w-full h-full group cursor-pointer"
              onClick={() => setIsModalOpen(true)}
              title="Click to expand image"
            >
              <img
                src={blobUrl}
                alt={attachment.original_filename}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-semibold">
                <Maximize2 className="w-4 h-4" /> Expand
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <FileImage className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* File Metadata & Actions */}
        <div className="flex items-center justify-between gap-2 pt-0.5 text-xs">
          <div className="min-w-0 flex-1">
            <p
              className="font-medium text-slate-900 truncate text-xs"
              title={attachment.original_filename}
            >
              {attachment.original_filename}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              <span>{formatBytes(attachment.file_size)}</span>
              <span>&bull;</span>
              <span>{attachment.content_type.replace("image/", "").toUpperCase()}</span>
            </div>
          </div>

          {blobUrl && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-white px-2.5 py-1 rounded border border-slate-200 hover:border-blue-300 transition-colors shadow-2xs"
                title="View full-size evidence"
              >
                <ExternalLink className="w-3 h-3" /> View
              </button>
              <a
                href={blobUrl}
                download={attachment.original_filename}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs"
                title="Download original file"
              >
                <Download className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Modal for full-size inspection */}
      {isModalOpen && blobUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 text-slate-200 text-xs">
              <span className="font-semibold truncate max-w-md" title={attachment.original_filename}>
                {attachment.original_filename} ({formatBytes(attachment.file_size)})
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={blobUrl}
                  download={attachment.original_filename}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Image Display */}
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[calc(90vh-60px)] bg-slate-950">
              <img
                src={blobUrl}
                alt={attachment.original_filename}
                className="max-h-[calc(90vh-80px)] w-auto max-w-full object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
