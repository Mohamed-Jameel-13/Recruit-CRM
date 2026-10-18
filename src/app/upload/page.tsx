'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  Brain,
  ChevronRight,
  MailCheck,
  CalendarCheck,
  Settings2,
  RefreshCw,
  Loader2,
  ClipboardPaste,
  Target,
  BarChart2,
  Video,
  ExternalLink,
  Layers,
  X,
  GraduationCap,
  Briefcase,
  Code2,
  Cpu,
  Check,
  Pencil,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface ProcessedCandidate {
  fileName: string;
  candidateName: string;
  candidateEmail: string;
  applicationId: string;
  matchScore: number;
  recommendation: string;
  isShortlisted: boolean;
  testUrl: string | null;
  emailSent: boolean;
  status: string;
  aiEvaluation?: {
    matchScore: number;
    categoryScores?: {
      skills?: number;
      experience?: number;
      education?: number;
      domain?: number;
    };
    recommendation: string;
    matchingSkills: string[];
    transferableSkills: Array<{
      candidate_skill: string;
      target_skill: string;
      relationship: string;
      credit_percentage: number;
      explanation: string;
    }>;
    missingRequirements: string[];
    uncertainties: string[];
    executiveSummary: string;
    evidence: Array<{
      category: string;
      criterion: string;
      matched_text: string;
      reasoning: string;
      confidence_score: number;
    }>;
  };
  modelProvider?: string;
  modelName?: string;
  isRuleBasedFallback?: boolean;
}

interface UploadResult {
  success: boolean;
  totalFiles: number;
  processedCount: number;
  failedCount: number;
  processed: ProcessedCandidate[];
  failed: { fileName: string; error: string }[];
}

interface AssessmentStatus {
  id: string;
  applicationId: string;
  candidateEmail: string;
  candidateName: string;
  status: 'SENT' | 'STARTED' | 'PASSED' | 'FAILED' | 'RESULT_RECEIVED';
  percentageScore?: number;
  passThreshold?: number;
  interviewScheduled?: boolean;
  meetLink?: string;
  scheduledStart?: string;
  interviewerName?: string;
}

const POLL_INTERVAL = 5000; // 5 seconds

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

  // --- JD Configuration State ---
  const [jobTitle, setJobTitle] = useState(DEFAULT_JOB_TITLE);
  const [jobDescription, setJobDescription] = useState(DEFAULT_JOB_DESCRIPTION);
  const [round1Threshold, setRound1Threshold] = useState(65);
  const [round2Threshold, setRound2Threshold] = useState(70);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [existingJobs, setExistingJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [jdMode, setJdMode] = useState<'paste' | 'select'>('paste');
  const [calendlyLink, setCalendlyLink] = useState('https://calendly.com');
  const [assessmentConfigs, setAssessmentConfigs] = useState<any[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');

  // --- Upload State ---
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingDemoFiles, setIsLoadingDemoFiles] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [submittingAssessmentId, setSubmittingAssessmentId] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    'idle' | 'creating-job' | 'uploading' | 'screening' | 'done'
  >('idle');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedCandidateForAnalysis, setSelectedCandidateForAnalysis] = useState<ProcessedCandidate | null>(null);
  const [screeningProgress, setScreeningProgress] = useState<{
    current: number;
    total: number;
    currentFileName: string;
    candidateName: string;
    statusText: string;
  }>({
    current: 0,
    total: 0,
    currentFileName: '',
    candidateName: '',
    statusText: '',
  });

  // --- Assessment Tracking State (auto-polling) ---
  const [assessmentStatuses, setAssessmentStatuses] = useState<AssessmentStatus[]>([]);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Load existing jobs and config on mount ---
  useEffect(() => {
    fetch('/api/jobs')
      .then((r) => r.json())
      .then((d) => {
        if (d.jobs?.length > 0) {
          setExistingJobs(d.jobs);
          setSelectedJobId(d.jobs[0].id);
          const j = d.jobs[0];
          setActiveJobId(j.id);
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

  // --- Auto-poll assessment statuses ---
  const pollAssessmentStatuses = useCallback(async (candidates: ProcessedCandidate[]) => {
    const shortlisted = candidates.filter((c) => c.isShortlisted && c.applicationId);
    if (shortlisted.length === 0) return;

    try {
      const res = await fetch('/api/assessments');
      const data = await res.json();
      const assignments: any[] = data.assignments || [];
      const interviews: any[] = data.interviews || [];

      const statuses: AssessmentStatus[] = shortlisted.map((cand) => {
        const assignment = assignments.find(
          (a) => a.application_id === cand.applicationId
        );
        const interview = interviews.find(
          (i: any) => i.application_id === cand.applicationId
        );

        return {
          id: assignment?.id || cand.applicationId,
          applicationId: cand.applicationId,
          candidateEmail: cand.candidateEmail,
          candidateName: cand.candidateName,
          status: assignment?.status || 'SENT',
          percentageScore: assignment?.percentage_score,
          passThreshold: assignment?.pass_threshold_percentage ?? round2Threshold,
          interviewScheduled: !!interview,
          meetLink: interview?.meeting_url || undefined,
          scheduledStart: interview?.scheduled_start || undefined,
          interviewerName: interview?.interviewer_name || undefined,
        };
      });

      setAssessmentStatuses(statuses);

      // Stop polling if all are done (passed or failed)
      const allDone = statuses.every(
        (s) => s.status === 'PASSED' || s.status === 'FAILED'
      );
      if (allDone && pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    } catch {
      // silent
    }
  }, [round2Threshold]);

  // Clear polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // --- Load 10 Real Benchmark CVs into Queue ---
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
      toast.success(
        `Loaded ${files.length} real candidate CVs (including engineering profiles and corrupted test case).`,
        'Benchmark CVs Loaded'
      );
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : String(err),
        'Could Not Load Sample CVs'
      );
    } finally {
      setIsLoadingDemoFiles(false);
    }
  }

  // --- Drag & Drop ---
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

  // --- Save thresholds to backend ---
  async function saveThresholds(jobId: string) {
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pass_threshold_score: round1Threshold,
          assessment_pass_threshold: round2Threshold,
          calendly_link: calendlyLink.trim(),
        }),
      });
    } catch {
      // non-critical
    }
  }

  // --- Master Run: Create Job (if new) → Save Thresholds → Upload & Screen ---
  async function handleLaunchPipeline() {
    if (selectedFiles.length === 0) {
      toast.warning('Please add or load at least one CV file before launching.', 'No Files Selected');
      return;
    }
    if (jdMode === 'paste' && (!jobTitle.trim() || !jobDescription.trim())) {
      toast.warning('Please enter the Role Title and Job Description.', 'Missing JD Info');
      return;
    }

    setIsRunning(true);
    setUploadResult(null);
    setAssessmentStatuses([]);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    try {
      let jobId = jdMode === 'select' ? (selectedJobId || existingJobs[0]?.id || '') : null;

      // Phase 1: Create job from pasted JD
      if (jdMode === 'paste') {
        setPhase('creating-job');
        setScreeningProgress({
          current: 0,
          total: selectedFiles.length,
          currentFileName: '',
          candidateName: '',
          statusText: 'Synthesizing competency criteria & scoring rubrics from Job Description...',
        });
        const jobRes = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: jobTitle.trim(),
            description: jobDescription.trim(),
            pass_threshold_score: round1Threshold,
            assessment_pass_threshold: round2Threshold,
            calendly_link: calendlyLink.trim(),
          }),
        });
        const jobData = await jobRes.json();
        if (!jobRes.ok) throw new Error(jobData.error || 'Failed to create job');
        jobId = jobData.job.id;
        setActiveJobId(jobId);
        setExistingJobs((prev) => [jobData.job, ...prev]);
      }

      // Phase 2: Save thresholds
      if (jobId) {
        await saveThresholds(jobId);
      }

      // Phase 3: Progressive Candidate Upload & AI Screening
      setPhase('screening');
      const total = selectedFiles.length;
      let sharedBatchId: string | undefined = undefined;
      const aggregatedProcessed: ProcessedCandidate[] = [];
      const aggregatedFailed: { fileName: string; error: string }[] = [];

      // Initialize live container so user sees the results card appear immediately
      setUploadResult({
        success: true,
        totalFiles: total,
        processedCount: 0,
        failedCount: 0,
        processed: [],
        failed: [],
      });

      for (let idx = 0; idx < total; idx++) {
        const file = selectedFiles[idx];
        const displayName = file.name
          .replace(/^\d+[\s_-]*/, '')
          .replace(/\.[^/.]+$/, '')
          .replace(/_/g, ' ');

        setScreeningProgress({
          current: idx + 1,
          total,
          currentFileName: file.name,
          candidateName: displayName,
          statusText: `[Stage 1/5: AI Screening] Evaluating candidate ${idx + 1} of ${total}: ${displayName}...`,
        });

        const formData = new FormData();
        formData.append('jobId', jobId || '');
        formData.append('roleTitle', jobTitle.trim());
        formData.append('calendlyLink', calendlyLink.trim());
        if (selectedAssessmentId) {
          formData.append('assessmentConfigId', selectedAssessmentId);
        }
        if (sharedBatchId) {
          formData.append('batchId', sharedBatchId);
        }
        formData.append(
          'batchName',
          `Pipeline — ${jobTitle || 'Selected Role'} — ${new Date().toLocaleDateString()}`
        );
        formData.append('files', file);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000);

          const upRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const resText = await upRes.text();
          let upData: any = null;
          try {
            upData = resText ? JSON.parse(resText) : null;
          } catch {
            throw new Error(
              `Server response error (HTTP ${upRes.status}): ${
                resText ? resText.slice(0, 150) : 'Empty response from server (possible timeout or socket reset)'
              }`
            );
          }

          if (upRes.ok && upData?.success) {
            if (!sharedBatchId && upData.batchId) {
              sharedBatchId = upData.batchId;
            }
            if (upData.processed) {
              aggregatedProcessed.push(...upData.processed);
            }
            if (upData.failed) {
              aggregatedFailed.push(...upData.failed);
            }

            // Immediately update results state so candidate card pops into view!
            const currentResult: UploadResult = {
              success: true,
              totalFiles: total,
              processedCount: aggregatedProcessed.length,
              failedCount: aggregatedFailed.length,
              processed: [...aggregatedProcessed],
              failed: [...aggregatedFailed],
            };
            setUploadResult(currentResult);

            // Auto-trigger polling for assessment statuses as candidates are shortlisted
            if (aggregatedProcessed.some((p) => p.isShortlisted)) {
              pollAssessmentStatuses([...aggregatedProcessed]);
            }
          } else {
            const errorMsg =
              upData?.error ||
              upData?.details ||
              upData?.failed?.[0]?.error ||
              `Failed to screen CV (HTTP ${upRes.status})`;
            aggregatedFailed.push({
              fileName: file.name,
              error: errorMsg,
            });
            setUploadResult({
              success: true,
              totalFiles: total,
              processedCount: aggregatedProcessed.length,
              failedCount: aggregatedFailed.length,
              processed: [...aggregatedProcessed],
              failed: [...aggregatedFailed],
            });
          }
        } catch (fetchErr) {
          const isTimeout = fetchErr instanceof Error && fetchErr.name === 'AbortError';
          aggregatedFailed.push({
            fileName: file.name,
            error: isTimeout
              ? 'Request timed out after 45s. External LLM took too long.'
              : fetchErr instanceof Error
              ? fetchErr.message
              : 'Network error during upload',
          });
          setUploadResult({
            success: true,
            totalFiles: total,
            processedCount: aggregatedProcessed.length,
            failedCount: aggregatedFailed.length,
            processed: [...aggregatedProcessed],
            failed: [...aggregatedFailed],
          });
        }
      }

      setUploadResult({
        success: true,
        totalFiles: total,
        processedCount: aggregatedProcessed.length,
        failedCount: aggregatedFailed.length,
        processed: [...aggregatedProcessed],
        failed: [...aggregatedFailed],
      });

      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setPhase('done');
      setScreeningProgress((prev) => ({
        ...prev,
        statusText: `All ${aggregatedProcessed.length} candidates screened successfully!`,
      }));

      const shortlistCount = aggregatedProcessed.filter((p) => p.isShortlisted).length;
      toast.success(
        `✅ All ${aggregatedProcessed.length} CVs screened. ${shortlistCount} candidate(s) shortlisted & assessment challenge emails sent automatically.`,
        'Screening Complete'
      );

      // Phase 4: Start auto-polling assessment statuses
      if (shortlistCount > 0) {
        const poll = () => pollAssessmentStatuses(aggregatedProcessed);
        poll(); // immediate first check
        pollTimerRef.current = setInterval(poll, POLL_INTERVAL);
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : String(err),
        'Pipeline Error'
      );
      setPhase('idle');
    } finally {
      setIsRunning(false);
    }
  }

  // --- Quick Test Submission to demonstrate auto Round 2 advancement ---
  async function handleSimulateSubmission(assignmentId: string, candidateEmail: string) {
    setSubmittingAssessmentId(assignmentId);
    try {
      const res = await fetch('/api/assessments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          score: 95,
          candidateEmail,
          answers: {
            q1: 'We implement an API gateway with SHA-256 idempotency hashing in Redis and Kafka queue partitioning with DLQ backpressure.',
            q2: 'We utilize PostgreSQL REPEATABLE READ isolation and SELECT FOR UPDATE row-level locking to prevent race conditions.'
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      toast.success(
        `Score: 95%! Passed Round 2 threshold. Personal interview invitation with Calendly booking link dispatched.`,
        'Interview Invitation Dispatched'
      );

      // Trigger immediate poll update
      if (uploadResult?.processed) {
        pollAssessmentStatuses(uploadResult.processed);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Submission Failed');
    } finally {
      setSubmittingAssessmentId(null);
    }
  }

  function getPhaseLabel() {
    switch (phase) {
      case 'creating-job':
        return 'Synthesizing criteria from JD...';
      case 'uploading':
        return 'Ingesting candidate CVs...';
      case 'screening':
        if (screeningProgress.total > 0) {
          return `Screening ${screeningProgress.current}/${screeningProgress.total}: ${screeningProgress.candidateName || 'AI Evaluating...'}`;
        }
        return 'Semantic AI Screening against JD...';
      case 'done':
        return 'Pipeline Complete';
      default:
        return '';
    }
  }

  function getStatusBadgeClass(status: AssessmentStatus['status']) {
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

  const canLaunch =
    selectedFiles.length > 0 &&
    (jdMode === 'select'
      ? !!selectedJobId
      : !!jobTitle.trim() && !!jobDescription.trim());

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-500" />
          Autonomous Recruitment Pipeline
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          Paste your Job Description, set criteria pass percentages, drop real CVs — the AI screens, sends tests, auto-detects submissions, checks calendar availability, and schedules Round 2 Google Meet interviews automatically.
        </p>
      </div>

      {/* ── Step 1: JD + Criteria Sliders ── */}
      <div className="app-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold">Step 1 — Role &amp; Screening Rubric</h2>
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
              Paste New JD
            </button>
            <button
              onClick={() => setJdMode('select')}
              className={`px-3 py-1 rounded-r-md border transition-colors ${
                jdMode === 'select'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-transparent border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              Use Existing Job
            </button>
          </div>
        </div>

        {jdMode === 'paste' ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Role Title *
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Full-Stack Cloud Engineer"
                className="w-full app-input text-sm p-3"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Job Description *
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here. The AI will automatically extract required skills, experience requirements, and build a semantic screening rubric..."
                rows={6}
                className="w-full app-input text-sm p-3 resize-none leading-relaxed"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Select Existing Job
              </label>
              <Link
                href="/jobs"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Pencil className="w-3 h-3" />
                <span>Manage &amp; Edit Jobs</span>
              </Link>
            </div>
            {existingJobs.length === 0 ? (
              <p className="text-xs text-neutral-400 py-2">
                No jobs found. Switch to &quot;Paste New JD&quot; to create one.
              </p>
            ) : (
              <select
                value={selectedJobId}
                onChange={(e) => {
                  setSelectedJobId(e.target.value);
                  const j = existingJobs.find((j) => j.id === e.target.value);
                  if (j) {
                    setActiveJobId(j.id);
                    setRound1Threshold(j.criteria?.pass_threshold_score ?? 65);
                    if (j.calendly_link) {
                      setCalendlyLink(j.calendly_link);
                    }
                    if (j.assessment_config_id) {
                      setSelectedAssessmentId(j.assessment_config_id);
                    }
                  }
                }}
                className="w-full app-input text-sm p-3"
              >
                {existingJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} — {j.department || 'Engineering'}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* ── Shortlisting Criteria Sliders ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-neutral-200 dark:border-neutral-800">
          <div className="space-y-2.5 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold">Round 1 — CV Match Threshold</span>
              </div>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900">
                {round1Threshold}%
              </span>
            </div>
            <input
              type="range"
              min={40}
              max={95}
              step={5}
              value={round1Threshold}
              onChange={(e) => setRound1Threshold(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              CVs scoring ≥ <strong className="text-neutral-700 dark:text-neutral-200">{round1Threshold}%</strong> semantic match are shortlisted and automatically sent the test challenge.
            </p>
          </div>

          <div className="space-y-2.5 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold">Round 2 — Assessment Pass Threshold</span>
              </div>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900">
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
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Candidates scoring ≥ <strong className="text-neutral-700 dark:text-neutral-200">{round2Threshold}%</strong> automatically receive an interview invite with your Calendly booking link.
            </p>
          </div>
        </div>

        {/* ── Calendly / Interview Booking Link Input ── */}
        <div className="space-y-2 p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-200 dark:border-blue-900/60">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <label className="text-xs font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Round 2 Calendly / Interview Booking Link</span>
            </label>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
              Included in email when candidate score ≥ {round2Threshold}%
            </span>
          </div>
          <input
            type="url"
            value={calendlyLink}
            onChange={(e) => setCalendlyLink(e.target.value)}
            placeholder="https://calendly.com/your-org/30min-interview"
            className="w-full app-input text-xs sm:text-sm p-3 font-mono bg-white dark:bg-neutral-900 border border-blue-200 dark:border-blue-900"
          />
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Once candidate responses are graded above the pass threshold, our system sends them a natural, human-written interview invitation containing this Calendly link to schedule their next round.
          </p>
        </div>

        {/* ── Assessment Challenge Selection ── */}
        <div className="space-y-3 p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/25 border border-purple-200 dark:border-purple-900/60">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Role Assessment Challenge to Assign</span>
            </label>
            <Link
              href="/assessments"
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Open Studio (Create / AI Chat)</span>
            </Link>
          </div>

          <div className="space-y-2">
            <select
              value={selectedAssessmentId}
              onChange={(e) => {
                setSelectedAssessmentId(e.target.value);
                const chosen = assessmentConfigs.find(c => c.id === e.target.value);
                if (chosen?.pass_threshold_percentage) {
                  setRound2Threshold(chosen.pass_threshold_percentage);
                }
              }}
              className="w-full app-input text-xs sm:text-sm p-3 bg-white dark:bg-neutral-900 border border-purple-200 dark:border-purple-900 text-neutral-900 dark:text-neutral-100"
            >
              {assessmentConfigs.length === 0 ? (
                <option value="">Loading assessment challenges...</option>
              ) : (
                assessmentConfigs.map((cfg) => (
                  <option key={cfg.id} value={cfg.id}>
                    {cfg.title} — {cfg.questions?.length || 0} Questions ({cfg.duration_minutes || 45} mins, {cfg.pass_threshold_percentage || 70}% pass cutoff)
                  </option>
                ))
              )}
            </select>

            {(() => {
              const activeCfg = assessmentConfigs.find(c => c.id === selectedAssessmentId) || assessmentConfigs[0];
              if (!activeCfg) return null;
              const mcqCount = (activeCfg.questions || []).filter((q: any) => q.type === 'mcq').length;
              const codeCount = (activeCfg.questions || []).filter((q: any) => q.type === 'coding').length;
              const archCount = (activeCfg.questions || []).filter((q: any) => q.type === 'subjective').length;

              return (
                <div className="flex items-center justify-between text-[11px] text-purple-700 dark:text-purple-300 bg-purple-100/60 dark:bg-purple-900/30 px-3 py-2 rounded-lg flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-purple-900 dark:text-purple-200">{activeCfg.role || 'Target Role'}:</span>
                    <span>{mcqCount} MCQs</span>
                    <span className="text-purple-400">&bull;</span>
                    <span>{codeCount} Coding Challenges</span>
                    <span className="text-purple-400">&bull;</span>
                    <span>{archCount} Architecture Scenarios</span>
                  </div>
                  <span className="font-mono font-bold text-purple-900 dark:text-purple-200">
                    Cutoff: &ge; {activeCfg.pass_threshold_percentage || 70}%
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── Step 2: Upload Resumes ── */}
      <div className="app-card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold">Step 2 — Add Candidate Resumes</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadDemoCVs}
              disabled={isLoadingDemoFiles || isRunning}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
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
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-blue-500 bg-blue-500/5'
              : 'border-neutral-300 dark:border-neutral-700 hover:border-blue-400'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud
            className={`w-10 h-10 mx-auto mb-3 ${
              isDragging ? 'text-blue-500' : 'text-neutral-400'
            }`}
          />
          <p className="text-sm font-medium">
            {isDragging ? 'Drop resumes here' : 'Drag & drop resumes, or click to browse files'}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Supports PDF, DOCX, TXT — or click &quot;Load 10 Benchmark CVs&quot; to test with real candidate profiles
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
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
                    className="text-neutral-400 hover:text-rose-500 transition-colors text-base leading-none"
                    title="Remove file"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Step 3: Launch Autonomous Pipeline ── */}
      <div className="app-card p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Pipeline Steps Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 flex-wrap">
            {(() => {
              const shortlistedCount = uploadResult?.processed.filter((p) => p.isShortlisted).length || 0;
              const gradedCount = assessmentStatuses.filter((s) => s.status === 'PASSED' || s.status === 'FAILED').length;
              const scheduledCount = assessmentStatuses.filter((s) => s.interviewScheduled).length;
              const meetCount = assessmentStatuses.filter((s) => s.meetLink).length;

              const steps = [
                {
                  icon: Brain,
                  label: 'AI Screen',
                  badge: phase === 'screening'
                    ? `${screeningProgress.current}/${screeningProgress.total || selectedFiles.length}`
                    : uploadResult && uploadResult.processedCount > 0
                    ? `${uploadResult.processedCount} Done`
                    : null,
                  isActive: phase === 'screening' || phase === 'creating-job',
                  isDone: phase === 'done' || (uploadResult && uploadResult.processedCount > 0 && phase !== 'screening'),
                },
                {
                  icon: MailCheck,
                  label: 'Email Test',
                  badge: shortlistedCount > 0 ? `${shortlistedCount} Dispatched` : null,
                  isActive: shortlistedCount > 0 && phase === 'screening',
                  isDone: shortlistedCount > 0,
                },
                {
                  icon: CheckCircle2,
                  label: 'Auto-Grade',
                  badge: gradedCount > 0 ? `${gradedCount} Graded` : null,
                  isActive: assessmentStatuses.some((s) => s.status === 'STARTED'),
                  isDone: gradedCount > 0,
                },
                {
                  icon: CalendarCheck,
                  label: 'Book Slot',
                  badge: scheduledCount > 0 ? `${scheduledCount} Booked` : null,
                  isActive: scheduledCount > 0 && !assessmentStatuses.every((s) => s.meetLink),
                  isDone: scheduledCount > 0,
                },
                {
                  icon: Video,
                  label: 'Meet Link Sent',
                  badge: meetCount > 0 ? `${meetCount} Sent` : null,
                  isActive: meetCount > 0,
                  isDone: meetCount > 0,
                },
              ];

              return steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <span
                    key={i}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all text-xs ${
                      step.isActive
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/30 ring-2 ring-blue-500/10'
                        : step.isDone
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20'
                        : 'text-neutral-400'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${step.isActive ? 'animate-pulse text-blue-500' : ''}`} />
                    <span>{step.label}</span>
                    {step.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          step.isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {step.badge}
                      </span>
                    )}
                    {i < 4 && (
                      <ChevronRight className="w-3 h-3 text-neutral-300 dark:text-neutral-700 ml-0.5" />
                    )}
                  </span>
                );
              });
            })()}
          </div>

          <button
            onClick={handleLaunchPipeline}
            disabled={isRunning || !canLaunch}
            className={`btn-primary min-w-[240px] justify-center py-2.5 ${
              canLaunch && !isRunning
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-lg shadow-blue-500/25'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="truncate max-w-[200px]">{getPhaseLabel()}</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Launch Autonomous Pipeline</span>
              </>
            )}
          </button>
        </div>

        {isRunning && (
          <div className="mt-4 p-3 rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>{screeningProgress.statusText || getPhaseLabel()}</span>
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                {phase === 'creating-job'
                  ? '10%'
                  : screeningProgress.total > 0
                  ? `${Math.round((screeningProgress.current / screeningProgress.total) * 100)}% (${screeningProgress.current}/${screeningProgress.total})`
                  : '80%'}
              </span>
            </div>

            <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden border border-neutral-300 dark:border-neutral-700">
              <div
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    phase === 'creating-job'
                      ? 10
                      : screeningProgress.total > 0
                      ? Math.max(8, Math.round((screeningProgress.current / screeningProgress.total) * 100))
                      : 80
                  }%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 pt-0.5">
              <span>Stage 1 of 5: Gemini 2.5 Flash evaluating core skills, experience, and domain depth</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {uploadResult ? `${uploadResult.processed.filter((p) => p.isShortlisted).length} candidates shortlisted` : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Screening Results ── */}
      {uploadResult && (
        <div className="app-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h2 className="text-sm font-semibold">Screening Results</h2>
            <div className="ml-auto flex items-center gap-3 text-xs text-neutral-500">
              <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                {uploadResult.processedCount} Screened
              </span>
              <span>·</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {uploadResult.processed.filter((p) => p.isShortlisted).length} Shortlisted
              </span>
              {uploadResult.failedCount > 0 && (
                <>
                  <span>·</span>
                  <span className="text-amber-500">{uploadResult.failedCount} Corrupted / Failed</span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {uploadResult.processed.map((p, i) => (
              <div
                key={i}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border text-xs ${
                  p.isShortlisted
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40'
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
                      AI Score: {p.matchScore}%
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {p.candidateEmail} · {p.recommendation?.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedCandidateForAnalysis(p)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-sm cursor-pointer"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>View AI Score Breakdown</span>
                  </button>

                  {p.isShortlisted ? (
                    <span className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                      <MailCheck className="w-3 h-3" />
                      Shortlisted (≥{round1Threshold}%) · Assessment Emailed
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-500">
                      Below Round 1 Threshold ({p.matchScore}% &lt; {round1Threshold}%)
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
                <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-amber-500/10 text-amber-600 border border-amber-500/30">
                  Parsing Error Handled
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Live Assessment Tracker (Auto-Polling & Round 2 Scheduling) ── */}
      {assessmentStatuses.length > 0 && (
        <div className="app-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-semibold">Live Assessment &amp; Interview Tracker</h2>
            </div>
            <div className="ml-auto flex items-center gap-2 text-[10px] text-neutral-400">
              {assessmentStatuses.some(s => s.status !== 'PASSED' && s.status !== 'FAILED') ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                  <span>Auto-detecting submissions every 5s</span>
                </>
              ) : (
                <span className="text-emerald-500 font-semibold">All candidates evaluated</span>
              )}
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span>{s.candidateName}</span>
                      {s.percentageScore !== undefined && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          Assessment: {s.percentageScore}%
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {s.candidateEmail}
                    </div>
                    {formattedDate && (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>Round 2: {formattedDate} with {s.interviewerName || 'Lead Architect'}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold border text-[10px] ${getStatusBadgeClass(
                        s.status
                      )}`}
                    >
                      {s.status === 'SENT' && '📨 Awaiting Test Submission'}
                      {s.status === 'STARTED' && '✏️ In Progress'}
                      {s.status === 'PASSED' && `✅ Passed (${s.percentageScore?.toFixed(0)}%)`}
                      {s.status === 'FAILED' && `❌ Failed (${s.percentageScore?.toFixed(0)}%)`}
                      {s.status === 'RESULT_RECEIVED' && '📊 Result Received'}
                    </span>

                    {/* If awaiting submission, provide quick links to test or simulate candidate answer */}
                    {s.status === 'SENT' && (
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/assessment/take/${s.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open Form</span>
                        </Link>
                        <button
                          onClick={() => handleSimulateSubmission(s.id, s.candidateEmail)}
                          disabled={submittingAssessmentId === s.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          title="Simulate realistic candidate submission (95% score) to test the automated Round 2 interview scheduling flow"
                        >
                          {submittingAssessmentId === s.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3 text-amber-300" />
                          )}
                          <span>Auto-Submit (95%)</span>
                        </button>
                      </div>
                    )}

                    {/* If passed and interview scheduled, render real Google Meet link */}
                    {s.status === 'PASSED' && s.interviewScheduled && s.meetLink && (
                      <a
                        href={s.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
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

          <p className="text-[10px] text-neutral-400 text-center pt-1">
            Candidate submissions are detected automatically via webhook or candidate portal &mdash; no manual intervention required.
          </p>
        </div>
      )}

      {/* ── Candidate AI Score Breakdown & Detailed Analysis Modal ── */}
      {selectedCandidateForAnalysis && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedCandidateForAnalysis(null)}
        >
          <div
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base border border-blue-500/20">
                  {selectedCandidateForAnalysis.candidateName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                      {selectedCandidateForAnalysis.candidateName}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                        selectedCandidateForAnalysis.isShortlisted
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
                      }`}
                    >
                      {selectedCandidateForAnalysis.isShortlisted ? 'Shortlisted' : 'Unshortlisted'}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2 mt-0.5">
                    <span>{selectedCandidateForAnalysis.candidateEmail}</span>
                    <span>•</span>
                    <span className="font-mono text-[11px]">{selectedCandidateForAnalysis.fileName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Brain className="w-3 h-3" />
                  {selectedCandidateForAnalysis.modelName || 'gemini-2.5-flash'}
                </span>
                <button
                  onClick={() => setSelectedCandidateForAnalysis(null)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto p-6 space-y-6 text-sm">
              {/* Overall Score Banner */}
              <div className="p-4 rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Comprehensive AI Match Evaluation
                  </div>
                  <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    Recommendation: <span className="text-blue-600 dark:text-blue-400">{selectedCandidateForAnalysis.recommendation.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    Calculated using Google Gemini weighted criterion scoring based on skills, experience, education, and domain depth.
                  </p>
                </div>
                <div className="text-right flex items-center sm:flex-col sm:items-end gap-3 sm:gap-0 self-stretch sm:self-auto justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-200 dark:border-neutral-800">
                  <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
                    {selectedCandidateForAnalysis.matchScore}
                    <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">/100</span>
                  </div>
                  <span className="text-[11px] font-medium text-neutral-500">
                    Passing Cutoff: {round1Threshold}%
                  </span>
                </div>
              </div>

              {/* Split Criteria Scores (4 Pillars) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-blue-500" />
                  Split Score Breakdown
                </h4>
                {(() => {
                  const cat = selectedCandidateForAnalysis.aiEvaluation?.categoryScores;
                  const total = selectedCandidateForAnalysis.matchScore;
                  const skillsScore = cat?.skills !== undefined ? cat.skills : Math.round(total * 0.40);
                  const expScore = cat?.experience !== undefined ? cat.experience : Math.round(total * 0.30);
                  const eduScore = cat?.education !== undefined ? cat.education : Math.round(total * 0.15);
                  const domainScore = cat?.domain !== undefined ? cat.domain : Math.round(total * 0.15);

                  const cards = [
                    {
                      title: 'Core Technical Skills',
                      score: skillsScore,
                      max: 40,
                      icon: Code2,
                      color: 'text-blue-500',
                      bgColor: 'bg-blue-500/10',
                      barColor: 'bg-blue-500',
                      description: 'Programming languages, frameworks, libraries, and toolkits',
                    },
                    {
                      title: 'Relevant Experience',
                      score: expScore,
                      max: 30,
                      icon: Briefcase,
                      color: 'text-indigo-500',
                      bgColor: 'bg-indigo-500/10',
                      barColor: 'bg-indigo-500',
                      description: 'Years in similar roles, leadership, project scope & scale',
                    },
                    {
                      title: 'Education & Certifications',
                      score: eduScore,
                      max: 15,
                      icon: GraduationCap,
                      color: 'text-purple-500',
                      bgColor: 'bg-purple-500/10',
                      barColor: 'bg-purple-500',
                      description: 'Relevant degree, certifications, and academic background',
                    },
                    {
                      title: 'Domain & Architecture',
                      score: domainScore,
                      max: 15,
                      icon: Cpu,
                      color: 'text-amber-500',
                      bgColor: 'bg-amber-500/10',
                      barColor: 'bg-amber-500',
                      description: 'Distributed systems, security, cloud engineering & best practices',
                    },
                  ];

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {cards.map((c, idx) => {
                        const Icon = c.icon;
                        const pct = Math.min(100, Math.round((c.score / c.max) * 100));
                        return (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className={`p-1.5 rounded-lg ${c.bgColor} ${c.color}`}>
                                <Icon className="w-4 h-4" />
                              </span>
                              <div className="font-bold text-sm">
                                <span className={c.color}>{c.score}</span>
                                <span className="text-neutral-400 text-xs">/{c.max}</span>
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-neutral-800 dark:text-neutral-200">
                                {c.title}
                              </div>
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                                {c.description}
                              </p>
                            </div>
                            <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${c.barColor}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-neutral-400 font-medium">
                              <span>Proficiency</span>
                              <span>{pct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Executive Summary */}
              {selectedCandidateForAnalysis.aiEvaluation?.executiveSummary && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    AI Executive Summary
                  </h4>
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-neutral-700 dark:text-neutral-300 text-xs leading-relaxed">
                    {selectedCandidateForAnalysis.aiEvaluation.executiveSummary}
                  </div>
                </div>
              )}

              {/* Skills Analysis: Matched vs Missing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Matched Core Skills */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Matching Core Skills ({selectedCandidateForAnalysis.aiEvaluation?.matchingSkills?.length ?? 0})
                  </h4>
                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 min-h-[90px]">
                    {selectedCandidateForAnalysis.aiEvaluation?.matchingSkills &&
                    selectedCandidateForAnalysis.aiEvaluation.matchingSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCandidateForAnalysis.aiEvaluation.matchingSkills.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                          >
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-400 italic">No direct core skill matches recorded.</p>
                    )}
                  </div>
                </div>

                {/* Missing Requirements */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Missing or Unmet Criteria ({selectedCandidateForAnalysis.aiEvaluation?.missingRequirements?.length ?? 0})
                  </h4>
                  <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 min-h-[90px]">
                    {selectedCandidateForAnalysis.aiEvaluation?.missingRequirements &&
                    selectedCandidateForAnalysis.aiEvaluation.missingRequirements.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCandidateForAnalysis.aiEvaluation.missingRequirements.map((gap, gIdx) => (
                          <span
                            key={gIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {gap}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 italic font-medium">
                        No critical requirements missing from candidate profile.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Transferable Skills Matrix (if available) */}
              {selectedCandidateForAnalysis.aiEvaluation?.transferableSkills &&
                selectedCandidateForAnalysis.aiEvaluation.transferableSkills.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Layers className="w-4 h-4" />
                      Transferable Skill Credit
                    </h4>
                    <div className="space-y-2">
                      {selectedCandidateForAnalysis.aiEvaluation.transferableSkills.map((ts, tIdx) => (
                        <div
                          key={tIdx}
                          className="p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                              <span className="font-mono text-indigo-600 dark:text-indigo-400">{ts.candidate_skill}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                              <span className="font-mono text-neutral-900 dark:text-neutral-100">{ts.target_skill}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold ml-1">
                                {ts.relationship}
                              </span>
                            </div>
                            <p className="text-neutral-600 dark:text-neutral-400 text-[11px]">{ts.explanation}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs self-start sm:self-center">
                            +{ts.credit_percentage}% credit
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Verbatim Resume Citations & Evidence */}
              {selectedCandidateForAnalysis.aiEvaluation?.evidence &&
                selectedCandidateForAnalysis.aiEvaluation.evidence.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-neutral-500" />
                      Verbatim Resume Citations &amp; Evidence
                    </h4>
                    <div className="space-y-2">
                      {selectedCandidateForAnalysis.aiEvaluation.evidence.map((ev, evIdx) => (
                        <div
                          key={evIdx}
                          className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-neutral-700 dark:text-neutral-300">
                              {ev.criterion}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                              Confidence: {Math.round(ev.confidence_score * 100)}%
                            </span>
                          </div>
                          <blockquote className="border-l-2 border-blue-500 pl-3 py-1 italic text-neutral-600 dark:text-neutral-300 bg-blue-50/50 dark:bg-blue-950/20 rounded-r text-[11px]">
                            &ldquo;{ev.matched_text}&rdquo;
                          </blockquote>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            <strong>Reasoning:</strong> {ev.reasoning}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70 flex items-center justify-between">
              <div className="text-[11px] text-neutral-500">
                Evaluation powered by Google Gemini 2.5 Flash
              </div>
              <div className="flex items-center gap-2">
                {selectedCandidateForAnalysis.testUrl && (
                  <a
                    href={selectedCandidateForAnalysis.testUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Assessment</span>
                  </a>
                )}
                <button
                  onClick={() => setSelectedCandidateForAnalysis(null)}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
