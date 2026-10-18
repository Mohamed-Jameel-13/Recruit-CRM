'use client';

import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Eye, 
  Bot, 
  ShieldCheck, 
  ArrowRight,
  RefreshCw,
  GitCompare,
  FileText,
  BadgeAlert,
  X,
  User,
  Mail,
  Briefcase,
  MailCheck,
  Video,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function ScreeningReviewPage() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendationFilter, setRecommendationFilter] = useState('ALL');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

  // Override dialog state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideRec, setOverrideRec] = useState<'STRONG_MATCH' | 'POTENTIAL_MATCH' | 'BORDERLINE' | 'NOT_A_MATCH'>('POTENTIAL_MATCH');
  const [overrideReason, setOverrideReason] = useState('');

  // Reject dialog state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications(preserveId?: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      const apps = data.applications || [];
      setApplications(apps);

      // Preserve previously selected application or select target
      const targetId = preserveId || selectedApp?.id;
      if (apps.length > 0) {
        if (targetId) {
          const matched = apps.find((a: any) => a.id === targetId);
          setSelectedApp(matched || apps[0]);
        } else {
          setSelectedApp(apps[0]);
        }
      } else {
        setSelectedApp(null);
      }
    } catch (err: unknown) {
      toast.error('Failed to load candidate applications from database.', 'Load Error');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(appId: string) {
    setActionLoading(true);
    try {
      const res = await fetch('/api/screening/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: appId,
          approvedBy: 'Recruitment Admin'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');
      
      toast.success(
        `${selectedApp?.candidate?.first_name || 'Candidate'} has been approved for the Assessment stage.`,
        'Candidate Approved'
      );
      await fetchApplications(appId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Approval Failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleOverrideSubmit() {
    if (!selectedApp?.latest_screening?.id) {
      toast.warning('This candidate must have an AI screening run before an override can be recorded.', 'Cannot Override');
      return;
    }
    if (!overrideReason.trim()) {
      toast.warning('Please enter a mandatory justification for overriding this recommendation.', 'Justification Required');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/screening/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screeningRunId: selectedApp.latest_screening.id,
          overrideRecommendation: overrideRec,
          reason: overrideReason.trim(),
          overrideBy: 'Recruitment Admin'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Override failed');

      toast.success('Recommendation override successfully recorded with immutable audit trail.', 'Override Recorded');
      setShowOverrideModal(false);
      setOverrideReason('');
      await fetchApplications(selectedApp.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Override Failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectSubmit() {
    if (!selectedApp?.id) return;
    if (!rejectReason.trim()) {
      toast.warning('Please enter a mandatory justification for rejecting this application.', 'Justification Required');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/screening/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedApp.id,
          reason: rejectReason.trim(),
          rejectedBy: 'Recruitment Admin'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rejection failed');

      toast.info('Candidate application has been marked as Rejected.', 'Application Closed');
      setShowRejectModal(false);
      setRejectReason('');
      await fetchApplications(selectedApp.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Rejection Failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRunScreening(appId: string) {
    setEvaluatingId(appId);
    setActionLoading(true);
    try {
      let storedConfig = '';
      try {
        storedConfig = localStorage.getItem('recruitai_llm_config') || '';
      } catch {}

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedConfig) {
        headers['x-llm-config'] = storedConfig;
      }

      const res = await fetch('/api/screening/evaluate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ applicationId: appId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Evaluation failed');

      toast.success(
        `AI screening complete! Match score: ${data.screeningRun?.match_score ?? '--'}/100 (${data.screeningRun?.recommendation?.replace(/_/g, ' ') || 'Evaluated'})`,
        'Screening Complete'
      );
      await fetchApplications(appId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'AI Evaluation Error');
    } finally {
      setEvaluatingId(null);
      setActionLoading(false);
    }
  }

  // Filter applications
  const filteredApps = applications.filter((app) => {
    const candidateName = `${app.candidate?.first_name || ''} ${app.candidate?.last_name || ''}`.toLowerCase();
    const email = (app.candidate?.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = candidateName.includes(query) || email.includes(query);

    const rec = app.latest_screening?.recommendation || 'UNSCORED';
    let matchesRec = true;
    if (recommendationFilter === 'UNSCORED') {
      matchesRec = !app.latest_screening || rec === 'UNSCORED' || rec === 'PENDING';
    } else if (recommendationFilter !== 'ALL') {
      matchesRec = rec === recommendationFilter;
    }

    return matchesSearch && matchesRec;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span>Screening Queue & Human Review</span>
            <span className="app-badge">Human-in-the-Loop</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Explainable AI evaluations with transferable skill reasoning, evidence citations, and mandatory approval workflows.
          </p>
        </div>

        <button
          onClick={() => fetchApplications()}
          disabled={loading}
          className="btn-secondary self-start md:self-auto flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="app-card p-3.5 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search candidates by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs app-input pl-9 pr-3 py-2"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Filter:</span>
          <select
            value={recommendationFilter}
            onChange={(e) => setRecommendationFilter(e.target.value)}
            className="text-xs app-input px-3 py-1.5"
          >
            <option value="ALL">All Categories ({applications.length})</option>
            <option value="STRONG_MATCH">Strong Match</option>
            <option value="POTENTIAL_MATCH">Potential Match</option>
            <option value="BORDERLINE">Borderline</option>
            <option value="NOT_A_MATCH">Not A Match</option>
            <option value="UNSCORED">Pending Evaluation</option>
          </select>
        </div>
      </div>

      {/* Two Column Layout: Candidates Table + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Applications Table (7 cols) */}
        <div className="lg:col-span-7 app-card overflow-hidden">
          <div className="p-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
            <span className="text-xs font-semibold">
              Evaluated Candidates ({filteredApps.length})
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Click a candidate to inspect findings</span>
          </div>

          {filteredApps.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-2">
              <User className="w-8 h-8 mx-auto text-neutral-400 opacity-60" />
              <div className="text-xs font-medium text-neutral-400">No candidates found in the queue.</div>
              <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                Upload CVs or click &ldquo;Load 10 Fictional Demo CVs&rdquo; on the upload page to populate candidates.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800 max-h-[700px] overflow-y-auto">
              {filteredApps.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                const screening = app.latest_screening;
                const score = screening?.match_score ?? null;
                const rec = screening?.recommendation;
                const isOverridden = !!screening?.human_override_recommendation;
                const effectiveRec = screening?.human_override_recommendation || rec;
                const hasTransferable = (screening?.transferable_skills?.length || 0) > 0;
                const isUnscored = score === null;

                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-500/10 border-l-4 border-blue-600 dark:border-blue-500 shadow-sm'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-xs flex items-center gap-2">
                          <span className="text-sm">
                            {app.candidate?.first_name} {app.candidate?.last_name}
                          </span>
                          {app.human_approved && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Approved
                            </span>
                          )}
                          {isOverridden && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              Overridden
                            </span>
                          )}
                          {app.stage === 'REJECTED' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                              Rejected
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-2">
                          <span>{app.candidate?.email}</span>
                          <span>•</span>
                          <span className="text-neutral-400">{app.job?.title || 'Engineer'}</span>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className="text-right shrink-0">
                        {!isUnscored ? (
                          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-bold text-xs ${
                            score >= 80 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                              : score >= 65 
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' 
                              : score >= 50 
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
                              : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                          }`}>
                            <span>{score}</span>
                            <span className="text-[10px] font-normal opacity-70">/ 100</span>
                          </div>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 font-medium">
                            Pending Eval
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Recommendation Pill & Badges */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                      {effectiveRec ? (
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          effectiveRec === 'STRONG_MATCH'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : effectiveRec === 'POTENTIAL_MATCH'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                            : effectiveRec === 'BORDERLINE'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        }`}>
                          {effectiveRec.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-400 italic">
                          Awaiting Screening
                        </span>
                      )}

                      {hasTransferable && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1 font-mono">
                          <GitCompare className="w-3 h-3 text-blue-500" />
                          <span>{screening.transferable_skills[0].candidate_skill} ⇄ {screening.transferable_skills[0].target_skill}</span>
                        </span>
                      )}

                      <span className="text-[11px] text-neutral-400 ml-auto">
                        Stage: <strong className="text-neutral-700 dark:text-neutral-300 capitalize">{app.stage?.toLowerCase()}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Evidence & Action Panel (5 cols) */}
        <div className="lg:col-span-5 app-card p-5 space-y-5 sticky top-20">
          {selectedApp ? (
            <>
              {/* Candidate Heading */}
              <div className="border-b border-neutral-200 dark:border-neutral-800 pb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {selectedApp.candidate?.first_name} {selectedApp.candidate?.last_name}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{selectedApp.candidate?.email}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Role: {selectedApp.job?.title || 'Technical Specialist'}</span>
                  </p>
                </div>

                <div className="text-right">
                  {selectedApp.latest_screening?.match_score !== undefined ? (
                    <>
                      <div className="text-2xl font-black">
                        {selectedApp.latest_screening.match_score}
                        <span className="text-xs text-neutral-400 font-normal">/100</span>
                      </div>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {selectedApp.latest_screening.is_rule_based_fallback 
                          ? 'Rule-Based Semantic' 
                          : `${selectedApp.latest_screening.model_provider || 'Universal LLM'} Screened`}
                      </span>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-amber-500">Unscored</span>
                      <p className="text-[10px] text-neutral-400">Needs Evaluation</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Unscored Callout if No Screening Has Run */}
              {!selectedApp.latest_screening && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-amber-500">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Candidate Awaiting Initial AI Evaluation</span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed">
                    This candidate application has not been evaluated against the job criteria yet. Run the semantic evaluation engine to score competencies and analyze transferable skills.
                  </p>
                  <button
                    onClick={() => handleRunScreening(selectedApp.id)}
                    disabled={actionLoading}
                    className="w-full btn-primary py-2.5 text-xs justify-center flex items-center gap-2"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${evaluatingId === selectedApp.id ? 'animate-spin' : ''}`} />
                    <span>{evaluatingId === selectedApp.id ? 'Evaluating with AI...' : 'Run AI Semantic Screening'}</span>
                  </button>
                </div>
              )}

              {/* Executive Summary */}
              {selectedApp.latest_screening?.executive_summary && (
                <div className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-xs leading-relaxed">
                  <div className="font-semibold mb-1 flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Explainable Evaluation Summary</span>
                  </div>
                  <p className="text-neutral-700 dark:text-neutral-300">
                    {selectedApp.latest_screening.executive_summary}
                  </p>
                </div>
              )}

              {/* Semantic Transferable Skills Breakdown */}
              {selectedApp.latest_screening?.transferable_skills && selectedApp.latest_screening.transferable_skills.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>Semantic Equivalence Detected (Credit Granted)</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedApp.latest_screening.transferable_skills.map((t: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs space-y-1">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{t.candidate_skill} ➔ {t.target_skill}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t.credit_percentage}% Credit</span>
                        </div>
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-300">{t.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Skills vs Missing Requirements (Only if screened) */}
              {selectedApp.latest_screening && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-1">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Matching ({selectedApp.latest_screening.matching_skills?.length || 0})</span>
                    </span>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selectedApp.latest_screening.matching_skills?.length > 0 ? (
                        selectedApp.latest_screening.matching_skills.map((s: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px]">
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-neutral-400 italic">No exact matches</span>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5 space-y-1">
                    <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 text-[11px]">
                      <XCircle className="w-3 h-3" />
                      <span>Gaps ({selectedApp.latest_screening.missing_requirements?.length || 0})</span>
                    </span>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selectedApp.latest_screening.missing_requirements?.length > 0 ? (
                        selectedApp.latest_screening.missing_requirements.map((m: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[10px]">
                            {m}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-medium">No critical gaps</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Evidence Snippets from CV */}
              {selectedApp.latest_screening?.evidence && selectedApp.latest_screening.evidence.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Evidence Citations from Resume:</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {selectedApp.latest_screening.evidence.map((ev: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-[11px]">
                        <div className="font-medium text-blue-600 dark:text-blue-400">{ev.criterion}</div>
                        <div className="italic text-[10px] mt-0.5 text-neutral-700 dark:text-neutral-300">&ldquo;{ev.matched_text}&rdquo;</div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{ev.reasoning}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Human Override Information if present */}
              {selectedApp.latest_screening?.human_override_recommendation && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                  <div className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <BadgeAlert className="w-3.5 h-3.5" />
                    <span>Admin Override Active</span>
                  </div>
                  <div className="text-[11px]">
                    Verdict: <strong className="font-bold text-amber-400">{selectedApp.latest_screening.human_override_recommendation}</strong>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Justification: {selectedApp.latest_screening.human_override_reason}
                  </div>
                </div>
              )}

              {/* Human Action Command Center */}
              <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Recruiter Decision:</div>

                {/* Approve Button */}
                {!selectedApp.human_approved && selectedApp.stage === 'SCREENING' ? (
                  <button
                    onClick={() => handleApprove(selectedApp.id)}
                    disabled={actionLoading}
                    className="w-full btn-primary py-2.5 justify-center flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve for Assessment Invitation</span>
                  </button>
                ) : selectedApp.human_approved ? (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <MailCheck className="w-3.5 h-3.5" />
                        <span>Assessment Form Dispatched</span>
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20">
                        {selectedApp.assessment_assignment?.status || 'SENT'}
                      </span>
                    </div>

                    {selectedApp.assessment_assignment && (
                      <a
                        href={`/assessment/take/${selectedApp.assessment_assignment.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full btn-secondary py-2 justify-center flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Open Candidate Test Form</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    )}

                    {selectedApp.interview && (
                      <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs space-y-2">
                        <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 font-bold">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Round 2 Interview Booked</span>
                          </span>
                          <span>{selectedApp.assessment_assignment?.percentage_score || 95}% Test Score</span>
                        </div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
                          Interviewer: {selectedApp.interview.interviewer_name || 'Sarah Connor'}
                        </div>
                        <a
                          href={selectedApp.interview.meeting_url || 'https://meet.google.com/rec-sarah-connor-r2'}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-primary py-1.5 px-3 w-full justify-center text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Google Meet</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowOverrideModal(true)}
                    disabled={!selectedApp.latest_screening}
                    className="btn-secondary py-2 text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <BadgeAlert className="w-3.5 h-3.5" />
                    <span>Override AI Score</span>
                  </button>

                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="btn-secondary py-2 text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Candidate</span>
                  </button>
                </div>

                <button
                  onClick={() => handleRunScreening(selectedApp.id)}
                  disabled={actionLoading}
                  className="w-full btn-secondary py-2 text-xs justify-center flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${evaluatingId === selectedApp.id ? 'animate-spin' : ''}`} />
                  <span>
                    {evaluatingId === selectedApp.id 
                      ? 'Re-evaluating with AI...' 
                      : selectedApp.latest_screening ? 'Re-evaluate Resume with AI' : 'Run AI Evaluation'}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-xs text-neutral-400 space-y-2">
              <Eye className="w-6 h-6 mx-auto opacity-50" />
              <div>Select a candidate from the list to inspect evaluation findings.</div>
            </div>
          )}
        </div>
      </div>

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="app-card max-w-md w-full p-6 space-y-4 shadow-2xl border-neutral-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2 text-amber-400">
                <BadgeAlert className="w-4 h-4" />
                <span>Override AI Screening Recommendation</span>
              </h3>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Administrative overrides are recorded in the immutable audit log with your operator identifier.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-400">Target Override Verdict</label>
              <select
                value={overrideRec}
                onChange={(e) => setOverrideRec(e.target.value as any)}
                className="w-full text-xs app-input p-2.5"
              >
                <option value="STRONG_MATCH">Strong Match</option>
                <option value="POTENTIAL_MATCH">Potential Match</option>
                <option value="BORDERLINE">Borderline</option>
                <option value="NOT_A_MATCH">Not A Match</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-neutral-400">Mandatory Justification</label>
                <span className="text-[10px] text-amber-400">Required</span>
              </div>
              <textarea
                rows={3}
                placeholder="Explain why this candidate should be overridden..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full text-xs app-input p-2.5"
              />
            </div>

            {/* Quick Templates */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-neutral-500 font-medium">Quick Rationale Templates:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  'Exceptional hands-on production depth',
                  'Equivalent transferable technology experience',
                  'Strong domain expertise overrides minor gap'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setOverrideReason(preset)}
                    className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideSubmit}
                disabled={actionLoading}
                className="btn-primary bg-amber-600 hover:bg-amber-500"
              >
                {actionLoading ? 'Saving...' : 'Record Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="app-card max-w-md w-full p-6 space-y-4 shadow-2xl border-neutral-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2 text-rose-400">
                <XCircle className="w-4 h-4" />
                <span>Reject Candidate Application</span>
              </h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Applications cannot be automatically closed by AI. A human rationale is required under recruitment compliance.
            </p>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-neutral-400">Mandatory Rejection Reason</label>
                <span className="text-[10px] text-rose-400">Required</span>
              </div>
              <textarea
                rows={3}
                placeholder="Specify the reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full text-xs app-input p-2.5"
              />
            </div>

            {/* Quick Templates */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-neutral-500 font-medium">Quick Reason Templates:</span>
              <div className="flex flex-wrap gap-1">
                {[
                  'Insufficient core technical skills for senior role',
                  'Seniority level does not match minimum threshold',
                  'Stack mismatch with infrastructure requirements'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                onClick={() => setShowRejectModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={actionLoading}
                className="btn-primary bg-rose-600 hover:bg-rose-500"
              >
                {actionLoading ? 'Closing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
