'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  ChevronRight,
  MailCheck,
  CalendarCheck,
  Settings2,
  RefreshCw,
  Loader2,
  ClipboardPaste,
  BarChart2,
  Video,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { usePipeline, ProcessedCandidate } from '@/components/pipeline/PipelineProvider';
import { CandidateAnalysisModal } from '@/components/candidate/CandidateAnalysisModal';

const DEFAULT_JOB_TITLE = 'Senior Full-Stack Cloud Engineer';
const DEFAULT_JOB_DESCRIPTION = `We are seeking a Senior Full-Stack Cloud Engineer to architect and scale our real-time distributed platforms.

Key Responsibilities:
• Build resilient backend microservices using Node.js, TypeScript, and Go.
• Design and maintain high-performance relational and document databases (PostgreSQL, Redis).
• Architect frontend applications using React and Next.js with modern state management.
• Deploy and operate containerized infrastructure on Kubernetes, Docker, and AWS/GCP.
• Implement robust CI/CD pipelines, automated testing, and observability.

Requirements:
• 4+ years of professional software engineering experience.
• Strong experience with modern JavaScript/TypeScript, React, Node.js.
• Practical understanding of relational databases (PostgreSQL/MySQL), schema design, and query optimization.
• Hands-on experience with cloud infrastructure (AWS or GCP) and Docker containers.
• Excellent problem-solving skills and distributed systems awareness.`;

export default function UploadPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global persistent pipeline store
  const {
    isRunning,
    phase,
    screeningProgress,
    uploadResult,
    assessmentStatuses,
    launchPipeline,
    clearResults,
    simulateSubmission,
  } = usePipeline();

  // JD Configuration State
  const [jobTitle, setJobTitle] = useState(DEFAULT_JOB_TITLE);
  const [jobDescription, setJobDescription] = useState(DEFAULT_JOB_DESCRIPTION);
  const [round1Threshold, setRound1Threshold] = useState(65);
  const [round2Threshold, setRound2Threshold] = useState(70);
  const [existingJobs, setExistingJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [jdMode, setJdMode] = useState<'paste' | 'select'>('paste');
  const [calendlyLink, setCalendlyLink] = useState('https://calendly.com');
  const [assessmentConfigs, setAssessmentConfigs] = useState<any[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');

  // Local File Queue State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingDemoFiles, setIsLoadingDemoFiles] = useState(false);
  const [submittingAssessmentId, setSubmittingAssessmentId] = useState<string | null>(null);
  const [selectedCandidateForAnalysis, setSelectedCandidateForAnalysis] = useState<ProcessedCandidate | null>(null);

  // Load existing jobs and assessment configs on mount
  useEffect(() => {
    fetch('/api/jobs')
      .then((r) => r.json())
      .then((d) => {
        if (d.jobs?.length > 0) {
          setExistingJobs(d.jobs);
          setSelectedJobId(d.jobs[0].id);
          const j = d.jobs[0];
          if (j.criteria?.pass_threshold_score) {
            setRound1Threshold(j.criteria.pass_threshold_score);
          }
          if (j.calendly_link) {
            setCalendlyLink(j.calendly_link);
          }
        }
      })
      .catch(() => {});

    fetch('/api/assessments/config')
      .then((r) => r.json())
      .then((d) => {
        if (d.configs && Array.isArray(d.configs) && d.configs.length > 0) {
          setAssessmentConfigs(d.configs);
          setSelectedAssessmentId((prev) => prev || d.config?.id || d.configs[0].id);
        }
        if (d.config?.pass_threshold_percentage) {
          setRound2Threshold(d.config.pass_threshold_percentage);
        }
        if (d.config?.calendly_link) {
          setCalendlyLink((prev) => (prev && prev !== 'https://calendly.com' ? prev : d.config.calendly_link));
        }
      })
      .catch(() => {});
  }, []);

  // Load 10 Benchmark CVs
  async function handleLoadDemoCVs() {
    setIsLoadingDemoFiles(true);
    try {
      const res = await fetch('/api/demo/sample-cv-files');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load benchmark files');

      const files: File[] = (data.files || []).map((f: any) => {
        const byteCharacters = atob(f.contentBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: f.type });
        return new File([blob], f.name, { type: f.type });
      });

      setSelectedFiles(files);
      toast.success(`Loaded ${files.length} benchmark candidate CVs.`, 'Files Queued');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Failed to Load CVs');
    } finally {
      setIsLoadingDemoFiles(false);
    }
  }

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) =>
        f.name.endsWith('.pdf') ||
        f.name.endsWith('.docx') ||
        f.name.endsWith('.doc') ||
        f.name.endsWith('.txt')
    );
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 50));
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files].slice(0, 50));
    }
  };

  // Launch Master Pipeline
  async function handleLaunch() {
    if (selectedFiles.length === 0) {
      toast.warning('Please add at least one CV file to screen.', 'No Resumes Selected');
      return;
    }
    if (jdMode === 'paste' && (!jobTitle.trim() || !jobDescription.trim())) {
      toast.warning('Please provide a role title and job description.', 'Missing Role Info');
      return;
    }

    try {
      await launchPipeline({
        files: selectedFiles,
        jobId: jdMode === 'select' ? (selectedJobId || existingJobs[0]?.id || '') : null,
        jdMode,
        jobTitle: jobTitle.trim(),
        jobDescription: jobDescription.trim(),
        round1Threshold,
        round2Threshold,
        calendlyLink: calendlyLink.trim(),
        assessmentConfigId: selectedAssessmentId || undefined,
      });
      toast.success('Batch screening completed.', 'Screening Complete');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Pipeline Error');
    }
  }

  // Simulate Assessment Submission
  async function handleSimulate(assessmentId: string, email: string) {
    setSubmittingAssessmentId(assessmentId);
    try {
      const success = await simulateSubmission(assessmentId, email);
      if (success) {
        toast.success('Assessment scored and interview scheduled.', 'Submission Recorded');
      } else {
        toast.error('Could not submit assessment response.', 'Submission Failed');
      }
    } finally {
      setSubmittingAssessmentId(null);
    }
  }

  const canLaunch =
    selectedFiles.length > 0 &&
    (jdMode === 'select' ? !!selectedJobId : !!jobTitle.trim() && !!jobDescription.trim());

  function getStatusBadgeClass(status: string) {
    switch (status) {
      case 'PASSED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'FAILED':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'STARTED':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resume Screening Pipeline</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Evaluate candidate profiles against job competencies and automate interview invitations.
          </p>
        </div>
        {uploadResult && (
          <button
            onClick={clearResults}
            className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
            <span>Clear Results</span>
          </button>
        )}
      </div>

      {/* Step 1: Role & Thresholds */}
      <div className="app-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold">1. Role &amp; Evaluation Criteria</h2>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setJdMode('paste')}
              className={`px-3 py-1 rounded-l-md border transition-colors ${
                jdMode === 'paste'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-transparent border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              New JD
            </button>
            <button
              onClick={() => setJdMode('select')}
              className={`px-3 py-1 rounded-r-md border transition-colors ${
                jdMode === 'select'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-transparent border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              Existing Role
            </button>
          </div>
        </div>

        {jdMode === 'paste' ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Role Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Full-Stack Cloud Engineer"
                className="w-full app-input text-sm p-2.5"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Job Description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={5}
                className="w-full app-input text-xs sm:text-sm p-2.5 resize-none leading-relaxed font-sans"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Select Existing Role
              </label>
              <Link
                href="/jobs"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Pencil className="w-3 h-3" />
                <span>Manage Roles</span>
              </Link>
            </div>
            <select
              value={selectedJobId}
              onChange={(e) => {
                setSelectedJobId(e.target.value);
                const j = existingJobs.find((item) => item.id === e.target.value);
                if (j?.title) setJobTitle(j.title);
                if (j?.description) setJobDescription(j.description);
                if (j?.criteria?.pass_threshold_score) {
                  setRound1Threshold(j.criteria.pass_threshold_score);
                }
              }}
              className="w-full app-input text-sm p-2.5"
            >
              {existingJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.department || 'Engineering'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Threshold Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-2 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Round 1 Screening Cutoff</span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900">
                {round1Threshold}%
              </span>
            </div>
            <input
              type="range"
              min={40}
              max={90}
              step={5}
              value={round1Threshold}
              onChange={(e) => setRound1Threshold(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-neutral-400">
              Candidates scoring &ge; {round1Threshold}% are shortlisted for technical assessment.
            </p>
          </div>

          <div className="space-y-2 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Round 2 Assessment Cutoff</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900">
                {round2Threshold}%
              </span>
            </div>
            <input
              type="range"
              min={40}
              max={95}
              step={5}
              value={round2Threshold}
              onChange={(e) => setRound2Threshold(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <p className="text-[11px] text-neutral-400">
              Candidates scoring &ge; {round2Threshold}% receive an interview booking invitation.
            </p>
          </div>
        </div>

        {/* Calendly & Assessment Challenge */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Interview Booking Link</span>
            </label>
            <input
              type="url"
              value={calendlyLink}
              onChange={(e) => setCalendlyLink(e.target.value)}
              placeholder="https://calendly.com/your-org/interview"
              className="w-full app-input text-xs sm:text-sm p-2.5 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>Technical Challenge</span>
              </label>
              <Link
                href="/assessments"
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Settings2 className="w-3 h-3" />
                <span>Studio</span>
              </Link>
            </div>
            <select
              value={selectedAssessmentId}
              onChange={(e) => {
                setSelectedAssessmentId(e.target.value);
                const chosen = assessmentConfigs.find((c) => c.id === e.target.value);
                if (chosen?.pass_threshold_percentage) {
                  setRound2Threshold(chosen.pass_threshold_percentage);
                }
              }}
              className="w-full app-input text-xs sm:text-sm p-2.5"
            >
              {assessmentConfigs.map((cfg) => (
                <option key={cfg.id} value={cfg.id}>
                  {cfg.title} ({cfg.duration_minutes || 45}m, cutoff {cfg.pass_threshold_percentage || 70}%)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Step 2: Upload Resumes */}
      <div className="app-card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold">2. Candidate Resumes</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadDemoCVs}
              disabled={isLoadingDemoFiles || isRunning}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors border border-neutral-300 dark:border-neutral-700"
            >
              {isLoadingDemoFiles ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              )}
              <span>Load 10 Benchmark CVs</span>
            </button>
            <span className="app-badge">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} queued
            </span>
          </div>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-blue-500 bg-blue-500/5'
              : 'border-neutral-300 dark:border-neutral-700 hover:border-blue-400'
          }`}
        >
          <UploadCloud
            className={`w-9 h-9 mx-auto mb-2.5 ${isDragging ? 'text-blue-500' : 'text-neutral-400'}`}
          />
          <p className="text-sm font-medium">
            {isDragging ? 'Drop resumes here' : 'Drop resumes here, or click to browse'}
          </p>
          <p className="text-xs text-neutral-400 mt-1">Supports PDF, DOCX, and TXT documents</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* Queued Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {selectedFiles.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="truncate font-medium">{f.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-neutral-400">{(f.size / 1024).toFixed(0)} KB</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFiles((prev) => prev.filter((_, j) => j !== i));
                    }}
                    className="text-neutral-400 hover:text-rose-500 transition-colors text-sm"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 3: Launch Pipeline */}
      <div className="app-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold">Launch Screening</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Runs in the background and persists across page navigation.
            </p>
          </div>

          <button
            onClick={handleLaunch}
            disabled={isRunning || !canLaunch}
            className={`btn-primary px-6 py-2.5 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 ${
              canLaunch && !isRunning ? '' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Screening in Progress...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Start Screening Pipeline</span>
              </>
            )}
          </button>
        </div>

        {/* Live Progress Bar */}
        {isRunning && (
          <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>
                  {screeningProgress.statusText ||
                    (phase === 'creating-job' ? 'Configuring role...' : 'Screening candidate profiles...')}
                </span>
              </span>
              <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">
                {screeningProgress.total > 0
                  ? `${screeningProgress.current}/${screeningProgress.total} (${Math.round(
                      (screeningProgress.current / screeningProgress.total) * 100
                    )}%)`
                  : 'Starting...'}
              </span>
            </div>

            <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    phase === 'creating-job'
                      ? 10
                      : screeningProgress.total > 0
                      ? Math.max(10, Math.round((screeningProgress.current / screeningProgress.total) * 100))
                      : 20
                  }%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Screening Results Section */}
      {uploadResult && (
        <div className="app-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-semibold">Screening Results</h2>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-neutral-500">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {uploadResult.processedCount} Screened
              </span>
              <span>·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {uploadResult.processed.filter((p) => p.isShortlisted).length} Shortlisted
              </span>
              {uploadResult.failedCount > 0 && (
                <>
                  <span>·</span>
                  <span className="text-amber-500 font-medium">
                    {uploadResult.failedCount} Unreadable
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {uploadResult.processed.map((p, i) => (
              <div
                key={i}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border text-xs transition-colors ${
                  p.isShortlisted
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40'
                }`}
              >
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                    <span>{p.candidateName}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                        p.matchScore >= round1Threshold
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
                      }`}
                    >
                      {p.matchScore}% Match
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {p.candidateEmail} · {p.recommendation?.replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedCandidateForAnalysis(p)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 transition-colors"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>View Breakdown</span>
                  </button>

                  {p.isShortlisted ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <MailCheck className="w-3 h-3" />
                      Shortlisted · Assessment Sent
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border border-neutral-200 dark:border-neutral-700">
                      Below Cutoff ({p.matchScore}% &lt; {round1Threshold}%)
                    </span>
                  )}
                </div>
              </div>
            ))}

            {uploadResult.failed.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs"
              >
                <div>
                  <div className="font-medium text-amber-700 dark:text-amber-300">{f.fileName}</div>
                  <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80">{f.error}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-amber-500/10 text-amber-600 border border-amber-500/30 shrink-0">
                  Intake Notice
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment & Scheduling Tracker */}
      {assessmentStatuses.length > 0 && (
        <div className="app-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-semibold">Technical Assessments &amp; Interviews</h2>
            </div>
            <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 text-blue-400" />
              <span>Auto-detecting submissions</span>
            </div>
          </div>

          <div className="space-y-3">
            {assessmentStatuses.map((s, i) => {
              const formattedDate = s.scheduledStart
                ? new Date(s.scheduledStart).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : null;

              return (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span>{s.candidateName}</span>
                      {s.percentageScore !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          Score: {s.percentageScore}%
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {s.candidateEmail}
                    </div>
                    {formattedDate && (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>Round 2: {formattedDate} with {s.interviewerName || 'Engineering Team'}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold border text-[10px] ${getStatusBadgeClass(
                        s.status
                      )}`}
                    >
                      {s.status === 'SENT' && 'Awaiting Submission'}
                      {s.status === 'STARTED' && 'In Progress'}
                      {s.status === 'PASSED' && `Passed (${s.percentageScore?.toFixed(0)}%)`}
                      {s.status === 'FAILED' && `Failed (${s.percentageScore?.toFixed(0)}%)`}
                      {s.status === 'RESULT_RECEIVED' && 'Result Received'}
                    </span>

                    {s.status === 'SENT' && (
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/assessment/take/${s.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Candidate Form</span>
                        </Link>
                        <button
                          onClick={() => handleSimulate(s.id, s.candidateEmail)}
                          disabled={submittingAssessmentId === s.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          title="Simulate candidate submission for demo testing"
                        >
                          {submittingAssessmentId === s.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3 text-amber-300" />
                          )}
                          <span>Auto-Submit Demo</span>
                        </button>
                      </div>
                    )}

                    {s.status === 'PASSED' && s.interviewScheduled && s.meetLink && (
                      <a
                        href={s.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Join Google Meet</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Candidate Score Breakdown Modal */}
      <CandidateAnalysisModal
        candidate={selectedCandidateForAnalysis}
        round1Threshold={round1Threshold}
        onClose={() => setSelectedCandidateForAnalysis(null)}
      />
    </div>
  );
}
