import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Calendar,
  Layers,
  Sparkles,
  GraduationCap,
  MessageSquare,
  HardDrive,
} from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import Badge from "../common/Badge";

export default function DocumentPreviewModal({ isOpen, onClose, document: doc }) {
  const navigate = useNavigate();

  if (!doc) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={doc.name}
      subtitle={doc.subject || "Study Material"}
      maxWidth="max-w-xl"
    >
      <div className="space-y-5">
        {/* Header Stats */}
        <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
          <div>
            <span className="block text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" /> Size
            </span>
            <span className="text-sm font-bold text-slate-800">{doc.size}</span>
          </div>
          <div>
            <span className="block text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              {doc.slideCount > 0 ? "Slides" : doc.format === "txt" ? "Words" : "Pages"}
            </span>
            <span className="text-sm font-bold text-slate-800">
              {doc.slideCount > 0
                ? `${doc.slideCount} slides`
                : doc.wordCount > 0 && doc.format === "txt"
                ? `${doc.wordCount} words`
                : `${doc.pageCount || doc.pages || 1} pgs`}
            </span>
          </div>
          <div>
            <span className="block text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Added
            </span>
            <span className="text-sm font-bold text-slate-800">{doc.uploadedAt}</span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-slate-500 font-medium">Processing Status</span>
          <Badge
            variant={
              doc.status === "Ready" || doc.processingStatus === "completed"
                ? "success"
                : doc.status === "Failed" || doc.processingStatus === "failed"
                ? "danger"
                : "warning"
            }
            dot
          >
            {doc.status === "Processing" || doc.processingStatus === "processing"
              ? `Processing (${doc.processingProgress || 0}%)`
              : doc.status || "Ready"}
          </Badge>
        </div>

        {/* Processing Error Notice if failed */}
        {(doc.processingError || doc.errorMessage) && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            <span className="font-semibold block mb-0.5">Processing Failed</span>
            {doc.processingError || doc.errorMessage}
          </div>
        )}

        {/* In-flight Processing Notice */}
        {(doc.status === "Processing" ||
          doc.processingStatus === "processing" ||
          doc.processingStatus === "pending") && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
            <span className="font-semibold block mb-0.5">Indexing In Progress</span>
            We are extracting text, creating semantic chunks, and generating vector embeddings. AI features will unlock automatically when processing finishes.
          </div>
        )}

        {/* Document Description */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Content Overview
          </h4>
          <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
            {doc.description ||
              "This document has been ingested into your StudyMate AI workspace. Full semantic indexing and chapter segmentation have been processed for context-aware Q&A, exam generation, and automatic summarization."}
          </p>
        </div>

        {/* Quick AI Study Actions */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Study with AI
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Button
              variant="outline"
              size="sm"
              icon={MessageSquare}
              disabled={doc.status !== "Ready" && doc.processingStatus !== "completed"}
              onClick={() => {
                onClose();
                navigate(`/chat?doc=${doc.id || doc.documentId}`);
              }}
              className="w-full text-xs justify-center"
            >
              Ask AI
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Sparkles}
              disabled={doc.status !== "Ready" && doc.processingStatus !== "completed"}
              onClick={() => {
                onClose();
                navigate(`/summary?doc=${doc.id || doc.documentId}`);
              }}
              className="w-full text-xs justify-center"
            >
              Summary
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={GraduationCap}
              disabled={doc.status !== "Ready" && doc.processingStatus !== "completed"}
              onClick={() => {
                onClose();
                navigate(`/quiz?doc=${doc.id || doc.documentId}`);
              }}
              className="w-full text-xs justify-center"
            >
              Practice Quiz
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
