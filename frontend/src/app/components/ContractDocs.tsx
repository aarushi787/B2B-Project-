import React, { useRef, useState } from "react";
import { Upload, FileText, Download, Edit3, CheckCircle2, Eye, LayoutGrid, List, Search, FilePlus2 } from "lucide-react";
import { Document, Role } from "./pages/DealWorkspace";
import { motion, AnimatePresence } from "motion/react";

interface ContractDocsProps {
  documents: Document[];
  onSign: (id: string) => void;
  onUpload: (file: File | null) => void;
  role: Role;
}

export function ContractDocs({ documents, onSign, onUpload, role }: ContractDocsProps) {
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) onUpload(e.dataTransfer.files[0]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) onUpload(e.target.files[0]);
  };

  const filtered = documents.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: Document["status"]) => {
    if (status === "Signed") return "bg-green-100 text-green-700 border-green-200";
    if (status === "Uploaded") return "bg-blue-100 text-blue-700 border-blue-200";
    return "bg-amber-100 text-amber-700 border-amber-200";
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Contract & Documents</h2>
            <p className="text-[10px] text-slate-400">{documents.length} files uploaded</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search docs..."
              className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6] bg-slate-50 w-32 transition-all"
            />
          </div>
          {/* View Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Upload Zone */}
        {(role === "Provider" || role === "Admin") && (
          <motion.div
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all group ${
              dragActive
                ? "border-[#8B5CF6] bg-purple-50 scale-[1.01]"
                : "border-slate-200 hover:border-[#8B5CF6]/60 hover:bg-slate-50/80"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            whileHover={{ scale: 1.005 }}
          >
            <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
            <div className="flex flex-col items-center gap-2">
              <motion.div
                animate={{ y: dragActive ? -4 : 0 }}
                className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100"
              >
                {dragActive ? (
                  <FilePlus2 className="w-5 h-5 text-[#8B5CF6]" />
                ) : (
                  <Upload className="w-5 h-5 text-[#8B5CF6]" />
                )}
              </motion.div>
              <div>
                <p className="text-xs font-semibold text-slate-700">
                  {dragActive ? "Drop file here" : "Click to upload or drag & drop"}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">PDF, DOCX — max 10MB</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Documents List/Grid */}
        <AnimatePresence mode="wait">
          {viewMode === "list" ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {filtered.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all group"
                >
                  {/* File Icon */}
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-blue-500" />
                  </div>

                  {/* Name & Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{doc.size}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span className="text-[10px] text-slate-400">By {doc.uploadedBy}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${getStatusBadge(doc.status)}`}>
                    {doc.status === "Signed" && "✓ "}
                    {doc.status}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </motion.button>
                    {doc.status !== "Signed" && (role === "Client" || role === "Admin") && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSign(doc.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-[#8B5CF6] text-white rounded-lg hover:bg-[#7C3AED] transition-colors shadow-sm"
                      >
                        <Edit3 className="w-3 h-3" /> E-sign
                      </motion.button>
                    )}
                    {doc.status === "Signed" && (
                      <div className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-green-100 text-green-700 rounded-lg">
                        <CheckCircle2 className="w-3 h-3" /> Signed
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-3">
              {filtered.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(doc.status)}`}>
                      {doc.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 truncate mb-1">{doc.name}</p>
                  <p className="text-[10px] text-slate-400">{doc.size}</p>
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                    <button className="flex-1 py-1.5 text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1">
                      <Eye className="w-3 h-3" /> View
                    </button>
                    {doc.status !== "Signed" && (role === "Client" || role === "Admin") && (
                      <button
                        onClick={() => onSign(doc.id)}
                        className="flex-1 py-1.5 text-[10px] font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Sign
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No documents found</p>
          </div>
        )}
      </div>
    </div>
  );
}
