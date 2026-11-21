import React, { useState, useEffect } from "react";
import {
  UploadCloud,
  Search,
  Filter,
  FileText,
  Trash2,
  ExternalLink,
  Layers,
  LayoutGrid,
  List,
  Sparkles,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import Toast from "../components/common/Toast";
import DocumentUploadModal from "../components/documents/DocumentUploadModal";
import DocumentPreviewModal from "../components/documents/DocumentPreviewModal";
import { documentService } from "../services/documentService";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function Documents() {
  useDocumentTitle("Documents", "Manage and view your uploaded study materials in PDF, DOCX, PPTX, and TXT.");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [reprocessingId, setReprocessingId] = useState(null);

  const fetchDocs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await documentService.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  // Auto-polling when documents are pending or processing
  useEffect(() => {
    const hasPending = documents.some((d) => {
      const pStatus = (d.processingStatus || d.status || d.rawStatus || "").toLowerCase();
      return pStatus === "processing" || pStatus === "pending" || pStatus === "uploaded";
    });

    if (!hasPending) return;

    const timer = setInterval(() => {
      fetchDocs(true);
    }, 2500);

    return () => clearInterval(timer);
  }, [documents]);

  const handleDelete = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    setDeletingId(id);
    try {
      await documentService.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => (d.id || d.documentId) !== id));
      setToastMessage(`Deleted "${name}" and removed vector index.`);
    } catch (err) {
      setToastMessage("Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleReprocess = async (e, id, name) => {
    e.stopPropagation();
    setReprocessingId(id);
    try {
      await documentService.retryDocument(id);
      setToastMessage(`Processing re-queued for "${name}"`);
      await fetchDocs(true);
    } catch (err) {
      setToastMessage(err.data?.message || err.message || "Failed to retry document.");
    } finally {
      setReprocessingId(null);
    }
  };

  const handleUploadSuccess = (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setToastMessage(`"${newDoc.name || newDoc.fileName}" uploaded and queued for processing!`);
    fetchDocs(true);
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    const docName = doc.name || doc.fileName || "";
    const docSubject = doc.subject || "";
    const matchesSearch =
      docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      docSubject.toLowerCase().includes(searchQuery.toLowerCase());

    const docStatus = (doc.status || "ready").toLowerCase();
    const docProcessingStatus = (doc.processingStatus || "").toLowerCase();
    const matchesStatus =
      statusFilter === "all" ||
      docStatus === statusFilter.toLowerCase() ||
      docProcessingStatus === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getFormatBadge = (doc) => {
    const format = (doc.format || doc.type || "").toLowerCase();
    const name = (doc.name || doc.fileName || "").toLowerCase();
    let style = "bg-rose-50 text-rose-700 border-rose-200";
    let label = "PDF";
    if (format === "docx" || name.endsWith(".docx")) {
      style = "bg-blue-50 text-blue-700 border-blue-200";
      label = "DOCX";
    } else if (format === "pptx" || name.endsWith(".pptx")) {
      style = "bg-amber-50 text-amber-700 border-amber-200";
      label = "PPTX";
    } else if (format === "txt" || name.endsWith(".txt")) {
      style = "bg-emerald-50 text-emerald-700 border-emerald-200";
      label = "TXT";
    }
    return (
      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${style}`}>
        {label}
      </span>
    );
  };

  const getStatusBadge = (doc) => {
    const s = (doc.processingStatus || doc.status || doc.rawStatus || "").toLowerCase();
    const stage = (doc.processingStage || "").toLowerCase();

    if (s === "ready" || s === "completed") {
      return (
        <Badge variant="success" size="sm" dot>
          🟢 Ready
        </Badge>
      );
    }
    if (s === "processing") {
      let stageLabel = "Processing";
      if (stage === "extracting") stageLabel = "Extracting";
      else if (stage === "chunking") stageLabel = "Chunking";
      else if (stage === "generating_embeddings") stageLabel = "Generating embeddings";
      else if (stage === "indexing") stageLabel = "Indexing";

      return (
        <Badge variant="warning" size="sm" dot className="animate-pulse">
          🟡 {stageLabel} ({doc.processingProgress || 0}%)
        </Badge>
      );
    }
    if (s === "failed") {
      return (
        <Badge variant="danger" size="sm" dot>
          🔴 Processing failed
        </Badge>
      );
    }
    return (
      <Badge variant="default" size="sm" dot>
        ⚪ Queued
      </Badge>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <Toast
        isOpen={!!toastMessage}
        message={toastMessage}
        onClose={() => setToastMessage("")}
      />

      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />

      {/* Top Header & Upload Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            My Documents
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your uploaded textbooks, notes, and study files ({documents.length} files indexed for RAG)
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={UploadCloud}
          onClick={() => setIsUploadOpen(true)}
          className="shadow-md shadow-indigo-600/20"
        >
          Upload PDF
        </Button>
      </div>

      {/* Drag & Drop Quick Upload Area */}
      <div
        onClick={() => setIsUploadOpen(true)}
        className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-3xl p-6 text-center bg-white/60 hover:bg-indigo-50/30 transition-all cursor-pointer group"
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-bold text-slate-800">
              Drag & Drop PDF Lecture Notes Here
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Auto-extracts text, generates 768d vector embeddings, and builds instant study index
            </p>
          </div>
          <span className="sm:ml-auto text-xs font-semibold text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-xl border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            Browse Computer
          </span>
        </div>
      </div>

      {/* Search, Filter, and View Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or subject..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
          />
        </div>

        {/* Filter and View Toggle */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="all">All Documents</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center border border-slate-200 rounded-xl p-1 bg-slate-50">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === "grid"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === "table"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && documents.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <Card key={n} padding="md" className="animate-pulse space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-200" />
                <div className="w-16 h-5 rounded-full bg-slate-200" />
              </div>
              <div className="space-y-2">
                <div className="w-3/4 h-4 bg-slate-200 rounded" />
                <div className="w-1/2 h-3 bg-slate-100 rounded" />
              </div>
              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <div className="flex-1 h-8 bg-slate-100 rounded-lg" />
                <div className="w-8 h-8 bg-slate-100 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredDocuments.length === 0 && (
        <Card padding="lg" className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No documents found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery
              ? `No documents matching "${searchQuery}". Try a different keyword.`
              : "No study documents uploaded yet. Upload a PDF file to get started."}
          </p>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              icon={UploadCloud}
              onClick={() => setIsUploadOpen(true)}
            >
              Upload PDF Now
            </Button>
          </div>
        </Card>
      )}

      {/* Grid View */}
      {viewMode === "grid" && filteredDocuments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocuments.map((doc) => {
            const docId = doc.id || doc.documentId;
            const pStatus = (doc.processingStatus || doc.status || doc.rawStatus || "").toLowerCase();
            const isFailed = pStatus === "failed";
            const isProcessing = pStatus === "processing";
            const isPending = pStatus === "pending" || pStatus === "uploaded";
            const isReady = pStatus === "ready" || pStatus === "completed";

            return (
              <Card
                key={docId}
                padding="md"
                hoverable={isReady}
                onClick={() => {
                  if (isReady) setPreviewDoc(doc);
                }}
                className={`flex flex-col justify-between group ${
                  !isReady ? "opacity-95" : ""
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 flex items-center justify-center shrink-0 transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      {getFormatBadge(doc)}
                    </div>
                    {getStatusBadge(doc)}
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {doc.name || doc.fileName}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {doc.subject || "Study Notes"}
                  </p>

                  {/* Processing Progress Bar */}
                  {isProcessing && (
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>Indexing text & embeddings</span>
                        <span>{doc.processingProgress || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(5, doc.processingProgress || 0)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Safe Error Display */}
                  {(doc.processingError || doc.errorMessage) && (
                    <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg mt-2 line-clamp-2">
                      {doc.processingError || doc.errorMessage}
                    </p>
                  )}
                </div>

                {/* Metadata & Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
                    <span>{doc.size}</span>
                    {doc.slideCount > 0 ? (
                      <span className="text-amber-600 font-medium">{doc.slideCount} slides</span>
                    ) : doc.pageCount > 0 ? (
                      <span className="text-slate-500 font-medium">{doc.pageCount} pages</span>
                    ) : null}
                    {doc.chunkCount > 0 && (
                      <span className="text-indigo-600 font-medium">
                        {doc.chunkCount} chunks
                      </span>
                    )}
                    <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isFailed ? (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={RotateCw}
                        onClick={(e) => handleReprocess(e, docId, doc.name || doc.fileName)}
                        loading={reprocessingId === docId}
                        className="flex-1 text-xs justify-center text-rose-600 border-rose-200 hover:bg-rose-50"
                      >
                        Retry Processing
                      </Button>
                    ) : !isReady ? (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={RotateCw}
                        disabled
                        className="flex-1 text-xs justify-center text-slate-400 bg-slate-50 cursor-not-allowed"
                      >
                        {isProcessing ? "Processing..." : "Queued..."}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={ExternalLink}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewDoc(doc);
                        }}
                        className="flex-1 text-xs justify-center"
                      >
                        Open
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      onClick={(e) => handleDelete(e, docId, doc.name || doc.fileName)}
                      loading={deletingId === docId}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5"
                      title="Delete document"
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && filteredDocuments.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Chunks</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDocuments.map((doc) => {
                  const docId = doc.id || doc.documentId;
                  const pStatus = (doc.processingStatus || doc.status || doc.rawStatus || "").toLowerCase();
                  const isFailed = pStatus === "failed";
                  const isProcessing = pStatus === "processing";
                  const isReady = pStatus === "ready" || pStatus === "completed";

                  return (
                    <tr
                      key={docId}
                      onClick={() => {
                        if (isReady) setPreviewDoc(doc);
                      }}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isReady ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">
                                {doc.name || doc.fileName}
                              </span>
                              {getFormatBadge(doc)}
                            </div>
                            {isProcessing && (
                              <div className="w-24 bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                                <div
                                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${Math.max(5, doc.processingProgress || 0)}%` }}
                                />
                              </div>
                            )}
                            {(doc.processingError || doc.errorMessage) && (
                              <p className="text-[10px] text-rose-500 line-clamp-1">
                                {doc.processingError || doc.errorMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{doc.subject}</td>
                      <td className="py-3 px-4 text-slate-500">{doc.size}</td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {doc.chunkCount || 0}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(doc)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isFailed ? (
                            <button
                              onClick={(e) => handleReprocess(e, docId, doc.name || doc.fileName)}
                              className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-medium"
                            >
                              Retry
                            </button>
                          ) : !isReady ? (
                            <span className="text-slate-400 font-medium px-2 py-1 text-[11px]">
                              {isProcessing ? "Processing..." : "Queued..."}
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewDoc(doc);
                              }}
                              className="px-2.5 py-1 rounded-lg text-indigo-600 hover:bg-indigo-50 font-medium"
                            >
                              Open
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(e, docId, doc.name || doc.fileName)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}