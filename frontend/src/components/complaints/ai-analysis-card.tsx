import React from "react";
import { AIAnalysisData } from "@/types/complaint";
import { Sparkles, BrainCircuit, CheckCircle2, AlertCircle, Clock, Layers } from "lucide-react";

interface AIAnalysisCardProps {
  data?: AIAnalysisData | null;
  className?: string;
  isProcessing?: boolean;
}

export function AIAnalysisCard({
  data,
  className = "",
  isProcessing = false,
}: AIAnalysisCardProps) {
  const hasAnalysis = !!data && !!data.category_prediction;

  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-100 text-blue-700">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              CityMind AI Decision Support
            </h3>
            <p className="text-[11px] text-slate-500">
              Automated classification, prioritization & duplicate triage engine
            </p>
          </div>
        </div>

        <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
          {hasAnalysis ? "Model Evaluated" : "Phase 4 Pipeline"}
        </span>
      </div>

      <div className="p-5">
        {!hasAnalysis ? (
          <div className="py-6 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800 mb-1">
              AI analysis will appear here once the complaint is processed.
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
              When connected to the Machine Learning gateway in Phase 4, submissions will automatically be triaged with real ONNX inference models.
            </p>

            {/* System Capability Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-left">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Category Classifier
                </div>
                <p className="text-[11px] text-slate-500">
                  DistilBERT NLP taxonomy triage with confidence score.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Dept. Routing
                </div>
                <p className="text-[11px] text-slate-500">
                  Semantic rule & category jurisdictional assignment.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Urgency Estimator
                </div>
                <p className="text-[11px] text-slate-500">
                  Hazard keyword & base category risk score classification.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                  <BrainCircuit className="w-3.5 h-3.5 text-purple-600" />
                  Duplicate Detection
                </div>
                <p className="text-[11px] text-slate-500">
                  MiniLM sentence embeddings + Haversine geospatial radius.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 sm:col-span-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  SLA Turnaround Regressor
                </div>
                <p className="text-[11px] text-slate-500">
                  Gradient boosted regression predicting expected resolution hours.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* When real ML pipeline output is provided */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border border-slate-200">
                <div className="text-xs text-slate-500">Predicted Category</div>
                <div className="text-sm font-semibold text-slate-900 mt-1">
                  {data.category_prediction?.category}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Confidence: {((data.category_prediction?.confidence || 0) * 100).toFixed(1)}%
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200">
                <div className="text-xs text-slate-500">Recommended Department</div>
                <div className="text-sm font-semibold text-slate-900 mt-1">
                  {data.recommended_department?.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Jurisdiction: {data.recommended_department?.code}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
