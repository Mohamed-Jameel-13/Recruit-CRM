'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  Layers, 
  ShieldAlert,
  ArrowRight,
  Database
} from 'lucide-react';
import Link from 'next/link';

export default function UploadPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [resultSummary, setResultSummary] = useState<any | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      if (data.jobs && data.jobs.length > 0) {
        setJobs(data.jobs);
        setSelectedJobId(data.jobs[0].id);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  }

  function handleFileSelection(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length > 50) {
        alert('Maximum 50 files allowed per upload batch. Taking the first 50.');
        setSelectedFiles(filesArray.slice(0, 50));
      } else {
        setSelectedFiles(filesArray);
      }
    }
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(20);
    setResultSummary(null);

    const formData = new FormData();
    formData.append('jobId', selectedJobId);
    formData.append('batchName', `Upload Batch - ${new Date().toLocaleDateString()}`);

    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      setUploadProgress(60);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(90);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResultSummary(data);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      alert(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(false);
      setUploadProgress(100);
    }
  }

  async function handleLoadDemoBatch() {
    setLoadingDemo(true);
    setResultSummary(null);
    try {
      const res = await fetch('/api/upload/load-demo-batch', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo ingest failed');
      setResultSummary(data);
    } catch (err: unknown) {
      alert(`Failed to load demo batch: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoadingDemo(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Multi-File CV Batch Ingestion</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              Private Storage
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload candidate resumes in PDF, DOCX, or text format (max 50 files/batch, 15MB limit).
          </p>
        </div>

        {/* Quick Demo Batch Loader Button */}
        <button
          onClick={handleLoadDemoBatch}
          disabled={loadingDemo}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-cyan-200" />
          <span>{loadingDemo ? 'Processing Demo CVs...' : 'Load 10 Fictional Demo CVs'}</span>
        </button>
      </div>

      {/* Target Job Selector */}
      <div className="glass-card p-5 rounded-xl border border-slate-800/90 space-y-2">
        <label className="text-xs font-semibold text-slate-300">Target Job Requisition</label>
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          className="w-full text-xs rounded-lg glass-input p-2.5 text-slate-200 bg-slate-900 border border-slate-700"
        >
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title} — {j.department} ({j.location})
            </option>
          ))}
        </select>
      </div>

      {/* Upload Dropzone */}
      <div className="glass-card p-8 rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-indigo-500/50 transition-all text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
          <UploadCloud className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white">Select or drag & drop resume files</h3>
          <p className="text-xs text-slate-400">Supported formats: PDF, DOCX, TXT. Deduplicated via SHA-256 fingerprinting.</p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".pdf,.docx,.txt"
          onChange={handleFileSelection}
          className="hidden"
          id="cv-file-picker"
        />

        <div className="flex items-center justify-center gap-3">
          <label
            htmlFor="cv-file-picker"
            className="cursor-pointer px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-all"
          >
            Browse Local Files
          </label>

          {selectedFiles.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {uploading ? `Processing (${uploadProgress}%)...` : `Upload ${selectedFiles.length} File(s)`}
            </button>
          )}
        </div>

        {/* Selected Files Staging List */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800 text-left max-h-48 overflow-y-auto space-y-1.5">
            <div className="text-xs font-semibold text-slate-400">Selected for Upload ({selectedFiles.length}):</div>
            {selectedFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-slate-900/60 border border-slate-800/80">
                <span className="text-slate-200 truncate max-w-sm">{f.name}</span>
                <span className="text-slate-500 text-[11px]">{(f.size / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Batch Ingestion Outcome Summary */}
      {resultSummary && (
        <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 bg-slate-900/90 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Batch Processing Completed</h2>
            </div>
            <Link
              href="/screening"
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <span>View Screening Results</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-slate-400">Total Ingested</div>
              <div className="text-lg font-bold text-white mt-1">
                {resultSummary.total || resultSummary.totalFiles}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-slate-400">Parsed & Screened</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                {resultSummary.processedCount}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-slate-400">Extraction Errors</div>
              <div className="text-lg font-bold text-amber-400 mt-1">
                {resultSummary.failedCount}
              </div>
            </div>
          </div>

          {/* Processed Candidates List */}
          {resultSummary.processed && resultSummary.processed.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300">Successfully Screened Candidates:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                {resultSummary.processed.map((p: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">{p.candidateName}</div>
                      <div className="text-[11px] text-slate-400">{p.candidateEmail}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Screened
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed / Corrupted Files List */}
          {resultSummary.failed && resultSummary.failed.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Captured Extraction Failures (Ready for Retry):</span>
              </h4>
              <div className="space-y-1.5">
                {resultSummary.failed.map((f: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-200">{f.fileName}</div>
                      <div className="text-[11px] text-amber-300/80">{f.error}</div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      Flagged
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
