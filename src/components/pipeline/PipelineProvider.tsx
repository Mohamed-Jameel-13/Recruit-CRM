'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';

export interface ProcessedCandidate {
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

export interface UploadResult {
  success: boolean;
  totalFiles: number;
  processedCount: number;
  failedCount: number;
  processed: ProcessedCandidate[];
  failed: { fileName: string; error: string }[];
}

export interface AssessmentStatus {
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

export interface ScreeningProgress {
  current: number;
  total: number;
  currentFileName: string;
  candidateName: string;
  statusText: string;
}

export interface LaunchPipelineParams {
  files: File[];
  jobId: string | null;
  jdMode: 'paste' | 'select';
  jobTitle: string;
  jobDescription: string;
  round1Threshold: number;
  round2Threshold: number;
  calendlyLink: string;
  assessmentConfigId?: string;
}

interface PipelineContextType {
  isRunning: boolean;
  phase: 'idle' | 'creating-job' | 'uploading' | 'screening' | 'done';
  screeningProgress: ScreeningProgress;
  uploadResult: UploadResult | null;
  assessmentStatuses: AssessmentStatus[];
  queuedFiles: File[];
  setQueuedFiles: (files: File[] | ((prev: File[]) => File[])) => void;
  launchPipeline: (params: LaunchPipelineParams) => Promise<void>;
  clearResults: () => void;
  refreshAssessments: () => Promise<void>;
  simulateSubmission: (assessmentId: string, candidateEmail: string) => Promise<boolean>;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

const LOCAL_STORAGE_RESULT_KEY = 'recruitcrm_active_pipeline_results';
const LOCAL_STORAGE_STATUSES_KEY = 'recruitcrm_active_assessment_statuses';

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'creating-job' | 'uploading' | 'screening' | 'done'>('idle');
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [screeningProgress, setScreeningProgress] = useState<ScreeningProgress>({
    current: 0,
    total: 0,
    currentFileName: '',
    candidateName: '',
    statusText: '',
  });

  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [assessmentStatuses, setAssessmentStatuses] = useState<AssessmentStatus[]>([]);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore cached results from localStorage on initial mount
  useEffect(() => {
    try {
      const savedResult = localStorage.getItem(LOCAL_STORAGE_RESULT_KEY);
      if (savedResult) {
        const parsed = JSON.parse(savedResult);
        if (parsed && Array.isArray(parsed.processed)) {
          setUploadResult(parsed);
        }
      }
      const savedStatuses = localStorage.getItem(LOCAL_STORAGE_STATUSES_KEY);
      if (savedStatuses) {
        const parsed = JSON.parse(savedStatuses);
        if (Array.isArray(parsed)) {
          setAssessmentStatuses(parsed);
        }
      }
    } catch {}
  }, []);

  // Save results to localStorage whenever they change
  useEffect(() => {
    try {
      if (uploadResult && (uploadResult.processed.length > 0 || uploadResult.failed.length > 0)) {
        localStorage.setItem(LOCAL_STORAGE_RESULT_KEY, JSON.stringify(uploadResult));
      }
    } catch {}
  }, [uploadResult]);

  useEffect(() => {
    try {
      if (assessmentStatuses.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_STATUSES_KEY, JSON.stringify(assessmentStatuses));
      }
    } catch {}
  }, [assessmentStatuses]);

  // Polling for assessment submissions
  const refreshAssessments = useCallback(async () => {
    try {
      const res = await fetch('/api/assessments', { cache: 'no-store' });
      const data = await res.json();
      const assignments: any[] = data.assignments || [];
      const interviews: any[] = data.interviews || [];

      setAssessmentStatuses((prev) => {
        if (prev.length === 0) return prev;
        return prev.map((item) => {
          const assignment = assignments.find((a) => a.application_id === item.applicationId);
          const interview = interviews.find((i: any) => i.application_id === item.applicationId);

          return {
            ...item,
            status: assignment?.status || item.status,
            percentageScore: assignment?.percentage_score ?? item.percentageScore,
            interviewScheduled: !!interview || item.interviewScheduled,
            meetLink: interview?.meeting_url || item.meetLink,
            scheduledStart: interview?.scheduled_start || item.scheduledStart,
            interviewerName: interview?.interviewer_name || item.interviewerName,
          };
        });
      });
    } catch {}
  }, []);

  // Set up periodic assessment polling if any assessments are pending
  useEffect(() => {
    const hasPending = assessmentStatuses.some(
      (s) => s.status === 'SENT' || s.status === 'STARTED'
    );
    if (hasPending && !pollTimerRef.current) {
      pollTimerRef.current = setInterval(refreshAssessments, 5000);
    } else if (!hasPending && pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [assessmentStatuses, refreshAssessments]);

  const clearResults = useCallback(() => {
    setUploadResult(null);
    setAssessmentStatuses([]);
    setPhase('idle');
    setScreeningProgress({ current: 0, total: 0, currentFileName: '', candidateName: '', statusText: '' });
    try {
      localStorage.removeItem(LOCAL_STORAGE_RESULT_KEY);
      localStorage.removeItem(LOCAL_STORAGE_STATUSES_KEY);
    } catch {}
  }, []);

  // Simulate submission
  const simulateSubmission = useCallback(
    async (assessmentId: string, candidateEmail: string): Promise<boolean> => {
      try {
        const res = await fetch('/api/assessments/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assessmentId,
            assignmentId: assessmentId,
            candidateEmail,
            score: 92,
            timeSpentMinutes: 32,
            answers: [
              {
                questionId: 'q-mcq-1',
                type: 'mcq',
                selectedOptionId: 'opt-b',
              },
              {
                questionId: 'q-code-1',
                type: 'coding',
                codeAnswer: `export function throttle<T extends (...args: any[]) => void>(fn: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}`,
              },
              {
                questionId: 'q-arch-1',
                type: 'subjective',
                subjectiveAnswer: `Implemented Redis idempotency lock combined with PostgreSQL row-level locks (FOR UPDATE) to guarantee zero double-spends under concurrent distributed requests.`,
              },
            ],
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          await refreshAssessments();
          window.dispatchEvent(new CustomEvent('recruitcrm:data_updated'));
          return true;
        }
      } catch {}
      return false;
    },
    [refreshAssessments]
  );

  // Main Pipeline Runner (Persists across navigation because this provider lives in RootLayout)
  const launchPipeline = useCallback(
    async (params: LaunchPipelineParams) => {
      const {
        files,
        jobId: initialJobId,
        jdMode,
        jobTitle,
        jobDescription,
        round1Threshold,
        round2Threshold,
        calendlyLink,
        assessmentConfigId,
      } = params;

      if (!files || files.length === 0) return;

      setIsRunning(true);
      let activeJobId = initialJobId;

      try {
        // Step 1: Create Job if needed
        if (jdMode === 'paste') {
          setPhase('creating-job');
          setScreeningProgress({
            current: 0,
            total: files.length,
            currentFileName: '',
            candidateName: '',
            statusText: 'Setting up role criteria...',
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
              assessment_config_id: assessmentConfigId || undefined,
            }),
          });
          const jobData = await jobRes.json();
          if (!jobRes.ok) throw new Error(jobData.error || 'Failed to create job');
          activeJobId = jobData.job.id;
        }

        // Save thresholds & assessment config
        if (activeJobId) {
          try {
            await fetch(`/api/jobs/${activeJobId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pass_threshold_score: round1Threshold,
                assessment_pass_threshold: round2Threshold,
                calendly_link: calendlyLink.trim(),
                assessment_config_id: assessmentConfigId || undefined,
              }),
            });
          } catch {}
        }

        // Step 2: Progressive screening of files
        setPhase('screening');
        const total = files.length;
        let sharedBatchId: string | undefined = undefined;
        const aggregatedProcessed: ProcessedCandidate[] = [];
        const aggregatedFailed: { fileName: string; error: string }[] = [];

        // Initialize empty container
        setUploadResult({
          success: true,
          totalFiles: total,
          processedCount: 0,
          failedCount: 0,
          processed: [],
          failed: [],
        });

        // Forward LLM config from localStorage
        let activeLlmConfigJson = '';
        try {
          const stored = localStorage.getItem('recruitai_llm_config');
          if (stored) activeLlmConfigJson = stored;
        } catch {}

        for (let idx = 0; idx < total; idx++) {
          const file = files[idx];
          const cleanName = file.name
            .replace(/^\d+[\s_-]*/, '')
            .replace(/\.[^/.]+$/, '')
            .replace(/_/g, ' ');

          setScreeningProgress({
            current: idx + 1,
            total,
            currentFileName: file.name,
            candidateName: cleanName,
            statusText: `Screening ${idx + 1} of ${total}: ${cleanName}`,
          });

          const formData = new FormData();
          formData.append('jobId', activeJobId || '');
          formData.append('roleTitle', jobTitle.trim());
          formData.append('calendlyLink', calendlyLink.trim());
          if (assessmentConfigId) formData.append('assessmentConfigId', assessmentConfigId);
          if (sharedBatchId) formData.append('batchId', sharedBatchId);
          formData.append(
            'batchName',
            `Pipeline — ${jobTitle || 'Role'} — ${new Date().toLocaleDateString()}`
          );
          formData.append('files', file);
          if (activeLlmConfigJson) formData.append('llmConfig', activeLlmConfigJson);

          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
              try {
                controller.abort(new Error('Screening evaluation timed out on server. Please retry.'));
              } catch {
                controller.abort();
              }
            }, 90000);

            const headers: Record<string, string> = {};
            if (activeLlmConfigJson) headers['x-llm-config'] = activeLlmConfigJson;

            let res = await fetch('/api/upload', {
              method: 'POST',
              headers,
              body: formData,
              signal: controller.signal,
            });

            // If the hosting server (e.g. Vercel) times out with 504 / 502, automatically retry once with fast semantic fallback
            if (res.status === 504 || res.status === 502) {
              console.warn(`[Pipeline] Server returned HTTP ${res.status}. Retrying with fast semantic fallback...`);
              headers['x-fast-fallback'] = 'true';
              res = await fetch('/api/upload', {
                method: 'POST',
                headers,
                body: formData,
              });
            }

            clearTimeout(timeoutId);

            const resText = await res.text();
            let data: any = null;
            try {
              data = resText ? JSON.parse(resText) : null;
            } catch {
              throw new Error(
                `Server returned HTTP ${res.status}: ${resText ? resText.slice(0, 150) : 'No response'}`
              );
            }

            if (res.ok && data?.success) {
              if (!sharedBatchId && data.batchId) sharedBatchId = data.batchId;
              if (data.processed) aggregatedProcessed.push(...data.processed);
              if (data.failed) aggregatedFailed.push(...data.failed);

              // Update assessment tracking list
              const newShortlisted = (data.processed || []).filter((p: ProcessedCandidate) => p.isShortlisted);
              if (newShortlisted.length > 0) {
                setAssessmentStatuses((prev) => {
                  const updated = [...prev];
                  for (const cand of newShortlisted) {
                    if (!updated.some((u) => u.applicationId === cand.applicationId)) {
                      const realAssessmentId = (cand as any).assessmentId || (cand.testUrl ? cand.testUrl.replace(/^\/assessment\/take\//, '') : cand.applicationId);
                      updated.push({
                        id: realAssessmentId,
                        applicationId: cand.applicationId,
                        candidateEmail: cand.candidateEmail,
                        candidateName: cand.candidateName,
                        status: 'SENT',
                        passThreshold: round2Threshold,
                        interviewScheduled: false,
                      });
                    }
                  }
                  return updated;
                });
              }
            } else {
              const errMsg =
                data?.message ||
                data?.error ||
                data?.details ||
                data?.failed?.[0]?.error ||
                `Failed to screen (${res.status})`;
              aggregatedFailed.push({ fileName: file.name, error: errMsg });
            }
          } catch (fileErr: unknown) {
            let errorMsg = 'Processing error';
            if (fileErr instanceof Error) {
              if (fileErr.name === 'AbortError' || fileErr.message.includes('aborted') || fileErr.message.includes('abort')) {
                errorMsg = 'Screening evaluation timed out. Please retry or verify LLM settings.';
              } else {
                errorMsg = fileErr.message;
              }
            }
            aggregatedFailed.push({
              fileName: file.name,
              error: errorMsg,
            });
          }

          // Update aggregated result state
          const currentSnapshot: UploadResult = {
            success: true,
            totalFiles: total,
            processedCount: aggregatedProcessed.length,
            failedCount: aggregatedFailed.length,
            processed: [...aggregatedProcessed],
            failed: [...aggregatedFailed],
          };
          setUploadResult(currentSnapshot);

          // Broadcast update event so Dashboard and Candidates pages refresh live!
          window.dispatchEvent(new CustomEvent('recruitcrm:data_updated'));
        }

        setPhase('done');
      } catch (err: unknown) {
        console.error('Pipeline execution error:', err);
      } finally {
        setIsRunning(false);
      }
    },
    []
  );

  return (
    <PipelineContext.Provider
      value={{
        isRunning,
        phase,
        screeningProgress,
        uploadResult,
        assessmentStatuses,
        queuedFiles,
        setQueuedFiles,
        launchPipeline,
        clearResults,
        refreshAssessments,
        simulateSubmission,
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
}
