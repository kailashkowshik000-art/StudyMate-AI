import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { documentService } from "../../services/documentService";

export default function DocumentUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [subject, setSubject] = useState("Computer Science");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const resetState = () => {
    setSelectedFile(null);
    setDocumentTitle("");
    setUploadProgress(0);
    setIsUploading(false);
    setError("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    if (!file || !file.name) return;
    const name = file.name.toLowerCase();
    
    if (name.endsWith(".doc") || name.endsWith(".ppt")) {
      setError("Legacy binary formats (.doc, .ppt) are not supported. Please convert them to modern .docx or .pptx before uploading.");
      setSelectedFile(null);
      return;
    }

    const isValidExt = name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".pptx") || name.endsWith(".txt");
    if (!isValidExt) {
      setError("Unsupported file format. Supported formats: .pdf, .docx, .pptx, .txt");
      setSelectedFile(null);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("File exceeds maximum allowed size of 25MB.");
      setSelectedFile(null);
      return;
    }

    setError("");
    setSelectedFile(file);
    if (!documentTitle) {
      setDocumentTitle(file.name);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a valid document (.pdf, .docx, .pptx, .txt) to upload.");
      return;
    }

    setIsUploading(true);
    setError("");

    // Track upload progress simulation while network request processes
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 20;
      });
    }, 150);

    try {
      const newDoc = await documentService.uploadDocument(selectedFile, subject);

      setUploadProgress(100);
      clearInterval(interval);

      setTimeout(() => {
        setIsUploading(false);
        onUploadSuccess(newDoc);
        handleClose();
      }, 400);
    } catch (err) {
      clearInterval(interval);
      setIsUploading(false);
      const serverMsg = err.data?.message || err.message || "Failed to upload document. Please ensure it is a valid .pdf, .docx, .pptx, or .txt file under 25MB.";
      setError(serverMsg);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Study Material"
      subtitle="Upload your lecture notes, slides, or reference documents"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag and Drop Box */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200
            ${
              dragActive
                ? "border-indigo-600 bg-indigo-50/50"
                : selectedFile
                ? "border-emerald-400 bg-emerald-50/30"
                : "border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.pptx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center">
            {selectedFile ? (
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
            )}

            {selectedFile ? (
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to process
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Click to browse or drag and drop files here
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supported formats: PDF, DOCX, PPTX, TXT up to 25MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Document Title Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Document Title
          </label>
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            placeholder="e.g. Distributed Systems Unit 2.pdf"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
          />
        </div>

        {/* Subject Category */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Subject Category
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 bg-white"
          >
            <option value="Computer Science">Computer Science</option>
            <option value="Database Systems">Database Systems</option>
            <option value="Operating Systems">Operating Systems</option>
            <option value="Computer Networks">Computer Networks</option>
            <option value="Artificial Intelligence">Artificial Intelligence</option>
            <option value="Software Engineering">Software Engineering</option>
          </select>
        </div>

        {/* Progress Bar (during upload) */}
        {isUploading && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Uploading & extracting index...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleUpload}
            loading={isUploading}
            disabled={!selectedFile || isUploading}
          >
            Upload & Process
          </Button>
        </div>
      </div>
    </Modal>
  );
}
