"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { StatusBadge } from "@/components/complaints/status-badge";
import { complaintsApi, ApiError } from "@/lib/api-client";
import { ComplaintCategory, ComplaintResponse } from "@/types/complaint";
import { useAuth } from "@/context/auth-context";
import { formatDate } from "@/lib/utils";
import {
  MapPin,
  Upload,
  FileText,
  CheckCircle2,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Navigation,
  Send,
  RotateCcw,
  Clock,
  ShieldCheck,
  ChevronRight,
  X,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

interface SelectedFileItem {
  file: File;
  previewUrl: string;
  id: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ATTACHMENTS = 5;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function NewComplaintPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Wizard step: 1: Details, 2: Location, 3: Media, 4: Confirmation/Review
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form state
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<string>("28.6139");
  const [longitude, setLongitude] = useState<string>("77.2090");

  // Category list state
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Geo status state
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  // Media attachments state
  const [attachments, setAttachments] = useState<SelectedFileItem[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // Created complaint result
  const [createdComplaint, setCreatedComplaint] = useState<ComplaintResponse | null>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      attachments.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [attachments]);

  // Load municipal categories on mount
  useEffect(() => {
    let isMounted = true;
    async function loadCategories() {
      setIsLoadingCategories(true);
      setCategoriesError(null);
      try {
        const data = await complaintsApi.getCategories();
        if (isMounted) {
          setCategories(data);
          if (data.length > 0 && !categoryId) {
            setCategoryId(String(data[0].id));
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setCategoriesError(
            err instanceof ApiError
              ? err.message
              : "Unable to load municipal categories. Please check backend connection."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingCategories(false);
        }
      }
    }
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Browser GPS auto-detection handler
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("Geolocation is not supported by your browser.");
      return;
    }
    setGeoStatus("Acquiring GPS fix from device sensors...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setLatitude(lat);
        setLongitude(lng);
        setGeoStatus(`GPS fix acquired: ${lat}, ${lng} (Accuracy: ~${Math.round(position.coords.accuracy)}m)`);
        setFormErrors((prev) => {
          const updated = { ...prev };
          delete updated.latitude;
          delete updated.longitude;
          return updated;
        });
      },
      (error) => {
        setGeoStatus(`Unable to retrieve GPS coordinates: ${error.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handle file selection and validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAttachmentError(null);
    const newItems: SelectedFileItem[] = [];
    const errors: string[] = [];

    const availableSlots = MAX_ATTACHMENTS - attachments.length;
    if (files.length > availableSlots) {
      errors.push(`You can only add ${availableSlots} more attachment${availableSlots !== 1 ? "s" : ""} (maximum ${MAX_ATTACHMENTS} total).`);
    }

    const filesToProcess = Array.from(files).slice(0, availableSlots);

    for (const file of filesToProcess) {
      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
        errors.push(`"${file.name}" has unsupported format. Allowed types: JPEG, PNG, WebP.`);
        continue;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" exceeds the 5MB file limit (${formatBytes(file.size)}).`);
        continue;
      }

      // Generate preview URL
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        file,
        previewUrl,
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      });
    }

    if (errors.length > 0) {
      setAttachmentError(errors.join(" "));
    }

    if (newItems.length > 0) {
      setAttachments((prev) => [...prev, ...newItems]);
    }

    // Reset input value so same file can be re-selected if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (idToRemove: string) => {
    setAttachments((prev) => {
      const item = prev.find((i) => i.id === idToRemove);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((i) => i.id !== idToRemove);
    });
    setAttachmentError(null);
  };

  // Validate step fields
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1 || step === 4) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        errors.title = "Complaint title is required.";
      } else if (trimmedTitle.length < 5) {
        errors.title = "Title must be at least 5 characters.";
      } else if (trimmedTitle.length > 150) {
        errors.title = "Title cannot exceed 150 characters.";
      }

      if (!categoryId) {
        errors.category_id = "Please select a municipal category.";
      }

      const trimmedDesc = description.trim();
      if (!trimmedDesc) {
        errors.description = "Detailed issue description is required.";
      } else if (trimmedDesc.length < 10) {
        errors.description = "Description must be at least 10 characters.";
      } else if (trimmedDesc.length > 5000) {
        errors.description = "Description cannot exceed 5000 characters.";
      }
    }

    if (step === 2 || step === 4) {
      const latNum = parseFloat(latitude);
      if (isNaN(latNum)) {
        errors.latitude = "Valid latitude coordinate is required.";
      } else if (latNum < -90 || latNum > 90) {
        errors.latitude = "Latitude must be between -90.0 and 90.0.";
      }

      const lngNum = parseFloat(longitude);
      if (isNaN(lngNum)) {
        errors.longitude = "Valid longitude coordinate is required.";
      } else if (lngNum < -180 || lngNum > 180) {
        errors.longitude = "Longitude must be between -180.0 and 180.0.";
      }

      if (address && address.length > 255) {
        errors.address = "Address text cannot exceed 255 characters.";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setApiError(null);
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handlePrevStep = () => {
    setApiError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Submit form handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(4)) {
      setApiError("Please review and resolve the validation errors indicated below.");
      return;
    }

    setIsSubmitting(true);
    setApiError(null);
    setUploadStatus("Registering complaint in municipal database...");

    let createdId: string | null = null;

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category_id: parseInt(categoryId, 10),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address.trim() || undefined,
        location_text: address.trim() || undefined,
      };

      const result = await complaintsApi.create(payload);
      createdId = result.id;
      setCreatedComplaint(result);

      // Handle media attachment uploads if present
      if (attachments.length > 0) {
        const failedUploads: string[] = [];

        for (let i = 0; i < attachments.length; i++) {
          const item = attachments[i];
          setUploadStatus(
            `Uploading media attachment ${i + 1} of ${attachments.length} (${item.file.name})...`
          );

          try {
            await complaintsApi.uploadAttachment(result.id, item.file);
          } catch (uploadErr: any) {
            failedUploads.push(`${item.file.name}: ${uploadErr.message || "Upload failed"}`);
          }
        }

        if (failedUploads.length > 0) {
          // Tell citizen clearly if one or more attachments failed, but keep complaint
          setApiError(
            `Grievance ticket created successfully (${result.ticket_number}), but some media files could not be uploaded: ${failedUploads.join("; ")}`
          );
        }
      }

      setUploadStatus("Redirecting to complaint details...");
      // Navigate to the real complaint details page
      router.push(`/complaints/${result.id}`);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setApiError(err.message);
        if (err.data?.detail && Array.isArray(err.data.detail)) {
          const serverErrors: Record<string, string> = {};
          err.data.detail.forEach((item: any) => {
            const field = item.loc?.[item.loc.length - 1];
            if (field) {
              serverErrors[field] = item.msg;
            }
          });
          setFormErrors((prev) => ({ ...prev, ...serverErrors }));
        }
      } else {
        setApiError(err?.message || "An unexpected error occurred while submitting your grievance.");
      }
    } finally {
      setIsSubmitting(false);
      setUploadStatus(null);
    }
  };

  // Reset wizard form
  const handleReset = () => {
    setTitle("");
    setDescription("");
    setAddress("");
    setLatitude("28.6139");
    setLongitude("77.2090");
    setGeoStatus(null);
    attachments.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setAttachments([]);
    setAttachmentError(null);
    setFormErrors({});
    setApiError(null);
    setCreatedComplaint(null);
    setCurrentStep(1);
  };

  const selectedCategoryObj = categories.find((c) => String(c.id) === String(categoryId));

  return (
    <DashboardLayout allowedRoles={["CITIZEN"]}>
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
      </div>

      <PageHeader
        title="Report a Civic Grievance"
        description="Official municipal submission system for public infrastructure, sanitation, and municipal service issues."
      />

      {/* Stepper Wizard Indicator */}
      <div className="mb-8 grid grid-cols-4 gap-2 text-center text-xs">
        <button
          type="button"
          onClick={() => !createdComplaint && setCurrentStep(1)}
          disabled={!!createdComplaint}
          className={`p-3 rounded-lg border text-left sm:text-center transition-all ${
            currentStep === 1
              ? "border-blue-600 bg-blue-50/70 text-blue-900 font-semibold shadow-sm"
              : currentStep > 1
              ? "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
              : "border-slate-200 bg-white text-slate-400"
          }`}
        >
          <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Step 1</span>
          1. Issue Details
        </button>

        <button
          type="button"
          onClick={() => !createdComplaint && validateStep(1) && setCurrentStep(2)}
          disabled={!!createdComplaint}
          className={`p-3 rounded-lg border text-left sm:text-center transition-all ${
            currentStep === 2
              ? "border-blue-600 bg-blue-50/70 text-blue-900 font-semibold shadow-sm"
              : currentStep > 2
              ? "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
              : "border-slate-200 bg-white text-slate-400"
          }`}
        >
          <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Step 2</span>
          2. GPS Location
        </button>

        <button
          type="button"
          onClick={() => !createdComplaint && validateStep(1) && validateStep(2) && setCurrentStep(3)}
          disabled={!!createdComplaint}
          className={`p-3 rounded-lg border text-left sm:text-center transition-all ${
            currentStep === 3
              ? "border-blue-600 bg-blue-50/70 text-blue-900 font-semibold shadow-sm"
              : currentStep > 3
              ? "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
              : "border-slate-200 bg-white text-slate-400"
          }`}
        >
          <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Step 3</span>
          3. Media ({attachments.length}/5)
        </button>

        <div
          className={`p-3 rounded-lg border text-left sm:text-center transition-all ${
            currentStep === 4
              ? "border-blue-600 bg-blue-50/70 text-blue-900 font-semibold shadow-sm"
              : "border-slate-200 bg-white text-slate-400"
          }`}
        >
          <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Step 4</span>
          4. Confirmation
        </div>
      </div>

      {/* Global API Error Alert */}
      {apiError && (
        <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-900">Notice</p>
            <p className="mt-0.5 text-red-700">{apiError}</p>
          </div>
        </div>
      )}

      {/* Categories Load Error Alert */}
      {categoriesError && (
        <div className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Category Data Warning</p>
            <p className="mt-0.5">{categoriesError}</p>
          </div>
        </div>
      )}

      {/* SUCCESS CONFIRMATION VIEW (Fallback if not redirected) */}
      {createdComplaint ? (
        <div className="space-y-6 max-w-3xl">
          <div className="p-6 rounded-xl border border-emerald-200 bg-emerald-50/70 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-emerald-950">
                    Grievance Successfully Registered
                  </h3>
                  <StatusBadge status={createdComplaint.status} />
                </div>
                <p className="text-xs text-emerald-800 mt-1">
                  Your civic grievance has been recorded in the central municipal database. An immutable audit record has been initialized.
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/90 p-4 rounded-lg border border-emerald-100 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">Official Ticket ID</span>
                    <span className="font-mono text-base font-bold text-blue-700 tracking-wide">
                      {createdComplaint.ticket_number}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block">Current Lifecycle Status</span>
                    <span className="font-semibold text-slate-800">
                      {createdComplaint.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block">Complaint Identifier</span>
                    <span className="font-mono text-[11px] text-slate-600 truncate block">
                      {createdComplaint.id}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block">Submission Timestamp</span>
                    <span className="text-slate-800">
                      {formatDate(createdComplaint.created_at)}
                    </span>
                  </div>

                  <div className="sm:col-span-2 border-t border-slate-100 pt-3 mt-1">
                    <span className="text-slate-500 font-medium block">Grievance Title</span>
                    <span className="text-slate-900 font-semibold text-sm">
                      {createdComplaint.title}
                    </span>
                  </div>

                  {createdComplaint.category && (
                    <div>
                      <span className="text-slate-500 font-medium block">Municipal Category</span>
                      <span className="text-slate-800 font-medium">
                        {createdComplaint.category.name}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-500 font-medium block">Geo-Coordinates</span>
                    <span className="font-mono text-slate-700">
                      {createdComplaint.latitude.toFixed(6)}, {createdComplaint.longitude.toFixed(6)}
                    </span>
                  </div>

                  {createdComplaint.address && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 font-medium block">Reported Address</span>
                      <span className="text-slate-800">
                        {createdComplaint.address}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/complaints/${createdComplaint.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Open Complaint Details
                  </Link>
                  <Link
                    href="/complaints"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
                  >
                    View All Grievances
                  </Link>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    File Another Grievance
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* STEP 1: GRIEVANCE DETAILS */}
          {currentStep === 1 && (
            <DashboardSection
              title="Step 1: Grievance Details"
              subtitle="Specify the issue title, detailed description, and municipal category"
            >
              <div className="space-y-5 max-w-2xl">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Complaint Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (formErrors.title) {
                        setFormErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.title;
                          return updated;
                        });
                      }
                    }}
                    placeholder="e.g., Severe Pothole on 5th Avenue Main Road"
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors ${
                      formErrors.title ? "border-red-500 focus:ring-red-500 bg-red-50/20" : "border-slate-300"
                    }`}
                  />
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className={formErrors.title ? "text-red-600 font-medium" : "text-slate-400"}>
                      {formErrors.title || "Minimum 5 characters, maximum 150 characters."}
                    </span>
                    <span className="text-slate-400 font-mono">{title.length}/150</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Municipal Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      if (formErrors.category_id) {
                        setFormErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.category_id;
                          return updated;
                        });
                      }
                    }}
                    disabled={isLoadingCategories}
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors ${
                      formErrors.category_id ? "border-red-500 focus:ring-red-500 bg-red-50/20" : "border-slate-300"
                    }`}
                  >
                    {isLoadingCategories ? (
                      <option value="">Loading municipal categories from server...</option>
                    ) : categories.length === 0 ? (
                      <option value="">No categories available</option>
                    ) : (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} {cat.default_sla_hours ? `(SLA: ${cat.default_sla_hours}h)` : ""}
                        </option>
                      ))
                    )}
                  </select>
                  {formErrors.category_id && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.category_id}</p>
                  )}
                  {selectedCategoryObj?.description && (
                    <p className="text-[11px] text-slate-500 mt-1 italic">
                      Category scope: {selectedCategoryObj.description}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Detailed Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (formErrors.description) {
                        setFormErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.description;
                          return updated;
                        });
                      }
                    }}
                    placeholder="Provide specific details about the issue, exact street landmarks, severity, and any immediate public hazards..."
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors ${
                      formErrors.description ? "border-red-500 focus:ring-red-500 bg-red-50/20" : "border-slate-300"
                    }`}
                  />
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className={formErrors.description ? "text-red-600 font-medium" : "text-slate-400"}>
                      {formErrors.description || "Minimum 10 characters, maximum 5000 characters."}
                    </span>
                    <span className="text-slate-400 font-mono">{description.length}/5000</span>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    Continue to GPS Location
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </DashboardSection>
          )}

          {/* STEP 2: GPS LOCATION */}
          {currentStep === 2 && (
            <DashboardSection
              title="Step 2: GPS Geo-Tagging"
              subtitle="Pinpoint exact geographical coordinates for municipal field officer dispatch"
            >
              <div className="space-y-5 max-w-2xl">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Street Address or Physical Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      if (formErrors.address) {
                        setFormErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.address;
                          return updated;
                        });
                      }
                    }}
                    placeholder="e.g., Near Sector 4 Bus Stop, MG Road"
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors ${
                      formErrors.address ? "border-red-500 focus:ring-red-500" : "border-slate-300"
                    }`}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Optional text reference to help field teams locate the issue quickly.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/60">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <Navigation className="w-4 h-4 text-blue-600" />
                      Automatic Location Services
                    </span>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-xs transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Acquire Device GPS
                    </button>
                  </div>
                  {geoStatus ? (
                    <p className="text-xs text-blue-800">{geoStatus}</p>
                  ) : (
                    <p className="text-xs text-slate-600">
                      Click the button above to auto-detect your current GPS coordinates, or manually enter latitude and longitude coordinates below.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Latitude (-90.0 to 90.0) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => {
                        setLatitude(e.target.value);
                        if (formErrors.latitude) {
                          setFormErrors((prev) => {
                            const updated = { ...prev };
                            delete updated.latitude;
                            return updated;
                          });
                        }
                      }}
                      placeholder="e.g. 28.6139"
                      className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono ${
                        formErrors.latitude ? "border-red-500 focus:ring-red-500 bg-red-50/20" : "border-slate-300"
                      }`}
                    />
                    {formErrors.latitude && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.latitude}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Longitude (-180.0 to 180.0) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => {
                        setLongitude(e.target.value);
                        if (formErrors.longitude) {
                          setFormErrors((prev) => {
                            const updated = { ...prev };
                            delete updated.longitude;
                            return updated;
                          });
                        }
                      }}
                      placeholder="e.g. 77.2090"
                      className={`w-full px-3.5 py-2.5 border rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono ${
                        formErrors.longitude ? "border-red-500 focus:ring-red-500 bg-red-50/20" : "border-slate-300"
                      }`}
                    />
                    {formErrors.longitude && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium">{formErrors.longitude}</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    Continue to Media & Evidence
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </DashboardSection>
          )}

          {/* STEP 3: MEDIA & EVIDENCE */}
          {currentStep === 3 && (
            <DashboardSection
              title="Step 3: Media & Photographic Evidence"
              subtitle="Upload photographs or documentation of the civic defect (Max 5 files, 5MB each)"
            >
              <div className="space-y-5 max-w-2xl">
                {/* File picker drop area */}
                <div className="p-6 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-50 text-center transition-colors">
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Select Photographic Evidence
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Supported formats: JPEG, PNG, WebP up to 5MB per file. Maximum {MAX_ATTACHMENTS} attachments.
                  </p>

                  <div className="mt-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="media-file-input"
                      disabled={attachments.length >= MAX_ATTACHMENTS}
                    />
                    <label
                      htmlFor="media-file-input"
                      className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer ${
                        attachments.length >= MAX_ATTACHMENTS
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-blue-700 hover:bg-blue-800 text-white"
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      {attachments.length === 0 ? "Choose Image Files" : "Add More Images"}
                    </label>
                  </div>
                </div>

                {/* Attachment Validation Error */}
                {attachmentError && (
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>{attachmentError}</span>
                  </div>
                )}

                {/* Selected Files Previews */}
                {attachments.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">
                        Selected Files ({attachments.length} of {MAX_ATTACHMENTS})
                      </span>
                      <span>Ready to upload with complaint</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {attachments.map((item) => (
                        <div
                          key={item.id}
                          className="relative p-2.5 rounded-lg border border-slate-200 bg-white shadow-xs flex items-center gap-3 group"
                        >
                          {/* Image Thumbnail Preview */}
                          <div className="w-12 h-12 rounded-md bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* File info */}
                          <div className="flex-1 min-w-0 pr-6">
                            <p className="text-xs font-medium text-slate-800 truncate" title={item.file.name}>
                              {item.file.name}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {formatBytes(item.file.size)}
                            </p>
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(item.id)}
                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-1">
                  <p className="font-semibold">Media Attachment Information:</p>
                  <p>&bull; Clear, daylight photos allow municipal field units to verify defect severity before dispatch.</p>
                  <p>&bull; Photos are linked to your ticket via <code>POST /api/v1/complaints/{`{id}`}/attachments</code>.</p>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    Continue to Review & Submit
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </DashboardSection>
          )}

          {/* STEP 4: REVIEW & CONFIRMATION */}
          {currentStep === 4 && (
            <DashboardSection
              title="Step 4: Review & Final Submission"
              subtitle="Confirm your grievance details before official registration"
            >
              <div className="space-y-6 max-w-2xl">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Citizen Registrant
                      </span>
                      <p className="text-xs font-semibold text-slate-800">
                        {user?.full_name || "Authenticated Citizen"} ({user?.email})
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-800 text-[11px] font-semibold">
                      Role: {user?.role?.name || "CITIZEN"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Grievance Title
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      {title}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Municipal Category
                      </span>
                      <p className="text-xs font-medium text-slate-800 mt-0.5">
                        {selectedCategoryObj?.name || "Category ID " + categoryId}
                      </p>
                      {selectedCategoryObj?.default_sla_hours && (
                        <p className="text-[11px] text-slate-500">
                          Standard SLA: {selectedCategoryObj.default_sla_hours} hours
                        </p>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        GPS Coordinates
                      </span>
                      <p className="text-xs font-mono font-medium text-slate-800 mt-0.5">
                        {latitude}, {longitude}
                      </p>
                      {address && (
                        <p className="text-[11px] text-slate-500 truncate">
                          Landmark: {address}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Detailed Description
                    </span>
                    <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {description}
                    </p>
                  </div>

                  {/* Media attachments summary */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Attached Media Evidence
                    </span>
                    {attachments.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {attachments.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 p-1.5 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700"
                          >
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
                              className="w-6 h-6 object-cover rounded"
                            />
                            <span className="max-w-[140px] truncate">{item.file.name}</span>
                            <span className="text-[10px] text-slate-400">({formatBytes(item.file.size)})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 mt-0.5 italic">
                        No photographic evidence attached
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-700" />
                      Standard initial status upon filing: <strong>SUBMITTED</strong>
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/70 text-xs text-blue-900 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Official Citizen Submission Notice</p>
                    <p className="mt-0.5 text-blue-800">
                      Submitting will lodge this complaint with the municipal intake engine via <code>POST /api/v1/complaints</code>. Upon creation, any attached photos will be uploaded and you will be directed to your ticket details page.
                    </p>
                  </div>
                </div>

                {uploadStatus && (
                  <div className="p-3 rounded-lg border border-blue-300 bg-blue-50 text-xs text-blue-800 flex items-center gap-2 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-700 flex-shrink-0" />
                    <span>{uploadStatus}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Edit
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {uploadStatus || "Submitting to Municipal Intake..."}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Confirm & Register Grievance
                      </>
                    )}
                  </button>
                </div>
              </div>
            </DashboardSection>
          )}
        </form>
      )}
    </DashboardLayout>
  );
}
