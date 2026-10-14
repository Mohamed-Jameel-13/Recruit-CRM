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
  BadgeAlert
} from 'lucide-react';

export default function ScreeningReviewPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendationFilter, setRecommendationFilter] = useState('ALL');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Override dialog state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideRec, setOverrideRec] = useState<'STRONG_MATCH' | 'POTENTIAL_MATCH' | 'BORDERLINE' | 'NOT_A_MATCH' | 'REJECT'>('POTENTIAL_MATCH');
  const [overrideReason, setOverrideReason] = useState('');

  // Reject dialog state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    setLoading(true);
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      setApplications(data.applications || []);
      if (data.applications && data.applications.length > 0) {
        setSelectedApp(data.applications[0]);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
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
          approvedBy: 'Admin Sarah Connor'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');
      await fetchApplications();
    } catch (err: unknown) {
      alert(`Approval error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleOverrideSubmit() {
    if (!selectedApp?.latest_screening?.id || !overrideReason.trim()) {
      alert('Please enter a mandatory justification for overriding this recommendation.');
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
          reason: overrideReason,
          overrideBy: 'Admin Sarah Connor'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Override failed');
      setShowOverrideModal(false);
      setOverrideReason('');
      await fetchApplications();
    } catch (err: unknown) {
      alert(`Override error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectSubmit() {
    if (!selectedApp?.id || !rejectReason.trim()) {
      alert('Please enter a mandatory justification for closing this application.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/screening/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedApp.id,
          reason: rejectReason,
          rejectedBy: 'Admin Sarah Connor'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rejection failed');
      setShowRejectModal(false);
      setRejectReason('');
      await fetchApplications();
    } catch (err: unknown) {
      alert(`Rejection error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRetryScreening(appId: string) {
    setActionLoading(true);
    try {
      const res = await fetch('/api/screening/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Retry failed');
      await fetchApplications();
    } catch (err: unknown) {
      alert(`Screening retry error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Filter applications
  const filteredApps = applications.filter((app) => {
    const candidateName = `${app.candidate?.first_name || ''} ${app.candidate?.last_name || ''}`.toLowerCase();
    const email = (app.candidate?.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = candidateName.includes(query) || email.includes(query);

    const rec = app.latest_screening?.recommendation || 'PENDING';
    const matchesRec = recommendationFilter === 'ALL' || rec === recommendationFilter;

    return matchesSearch && matchesRec;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Intelligent Screening Review & Approvals</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              Human-in-the-Loop
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Explainable AI evaluations with transferable skill reasoning, evidence citations, and mandatory approval workflows.
          </p>
        </div>

        <button
          onClick={fetchApplications}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 rounded-xl border border-slate-800/90 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by candidate name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-lg glass-input pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Recommendation:</span>
          <select
            value={recommendationFilter}
            onChange={(e) => setRecommendationFilter(e.target.value)}
            className="text-xs rounded-lg glass-input px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-200"
          >
            <option value="ALL">All Categories</option>
            <option value="STRONG_MATCH">Strong Match</option>
            <option value="POTENTIAL_MATCH">Potential Match</option>
            <option value="BORDERLINE">Borderline</option>
            <option value="NOT_A_MATCH">Not A Match</option>
          </select>
        </div>
      </div>

      {/* Two Column Layout: Candidates Table + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Applications Table (7 cols) */}
        <div className="lg:col-span-7 glass-card rounded-2xl border border-slate-800/90 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <span className="text-xs font-semibold text-slate-300">
              Evaluated Candidates ({filteredApps.length})
            </span>
            <span className="text-[11px] text-slate-400">Click a row to view evidence breakdown</span>
          </div>

          {filteredApps.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">
              No applications match your filter criteria.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60 max-h-[700px] overflow-y-auto">
              {filteredApps.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                const screening = app.latest_screening;
                const score = screening?.match_score ?? null;
                const rec = screening?.recommendation || 'PENDING';
                const hasTransferable = (screening?.transferable_skills?.length || 0) > 0;

                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/15 border-l-4 border-indigo-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-xs text-slate-200 flex items-center gap-2">
                          <span>{app.candidate?.first_name} {app.candidate?.last_name}</span>
                          {app.human_approved && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Approved
                            </span>
                          )}
                          {screening?.human_override_recommendation && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Overridden
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{app.candidate?.email}</div>
                      </div>

                      {/* Score Badge */}
                      <div className="text-right">
                        {score !== null ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-xs font-bold text-white">{score}</span>
                            <span className="text-[10px] text-slate-400">/ 100</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">Unscored</span>
                        )}
                      </div>
                    </div>

                    {/* Transferable Skills & Recommendation Pill */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        rec === 'STRONG_MATCH'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : rec === 'POTENTIAL_MATCH'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          : rec === 'BORDERLINE'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {rec.replace('_', ' ')}
                      </span>

                      {hasTransferable && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 font-mono">
                          <GitCompare className="w-3 h-3 text-indigo-400" />
                          <span>{screening.transferable_skills[0].candidate_skill} ⇄ {screening.transferable_skills[0].target_skill}</span>
                        </span>
                      )}

                      <span className="text-[11px] text-slate-500 ml-auto">
                        Stage: <strong className="text-slate-400">{app.stage}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Explainable Evidence & Action Panel (5 cols) */}
        <div className="lg:col-span-5 glass-card rounded-2xl border border-slate-800/90 p-5 space-y-5 sticky top-24">
          {selectedApp ? (
            <>
              {/* Candidate Heading */}
              <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {selectedApp.candidate?.first_name} {selectedApp.candidate?.last_name}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedApp.candidate?.email}</p>
                  <p className="text-[11px] text-indigo-400 mt-1">Role: {selectedApp.job?.title}</p>
                </div>

                <div className="text-right">
                  <div className="text-xl font-extrabold text-white">
                    {selectedApp.latest_screening?.match_score ?? '--'}
                    <span className="text-xs text-slate-400 font-normal">/100</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {selectedApp.latest_screening?.is_rule_based_fallback ? 'Rule-Based Semantic' : 'Gemini AI Evaluated'}
                  </span>
                </div>
              </div>

              {/* Executive Summary */}
              {selectedApp.latest_screening?.executive_summary && (
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Explainable Evaluation Summary</span>
                  </div>
                  {selectedApp.latest_screening.executive_summary}
                </div>
              )}

              {/* Semantic Transferable Skills Breakdown (e.g. MySQL for PostgreSQL) */}
              {selectedApp.latest_screening?.transferable_skills && selectedApp.latest_screening.transferable_skills.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                    <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Semantic Equivalence Detected (Credit Granted)</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedApp.latest_screening.transferable_skills.map((t: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/30 text-xs space-y-1">
                        <div className="flex items-center justify-between font-mono">
                          <span className="text-cyan-200 font-semibold">{t.candidate_skill} ➔ {t.target_skill}</span>
                          <span className="text-emerald-400 font-bold">{t.credit_percentage}% Credit</span>
                        </div>
                        <p className="text-[11px] text-slate-300">{t.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Skills vs Missing Requirements */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-emerald-950/15 border border-emerald-500/20 space-y-1">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Matching Skills ({selectedApp.latest_screening?.matching_skills?.length || 0})</span>
                  </span>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedApp.latest_screening?.matching_skills?.map((s: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-rose-950/15 border border-rose-500/20 space-y-1">
                  <span className="font-semibold text-rose-400 flex items-center gap-1 text-[11px]">
                    <XCircle className="w-3 h-3" />
                    <span>Gaps / Missing ({selectedApp.latest_screening?.missing_requirements?.length || 0})</span>
                  </span>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedApp.latest_screening?.missing_requirements?.map((m: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 text-[10px]">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Evidence Snippets from CV */}
              {selectedApp.latest_screening?.evidence && selectedApp.latest_screening.evidence.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-slate-300">Evidence Citations from Resume:</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedApp.latest_screening.evidence.map((ev: any, idx: number) => (
                      <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px]">
                        <div className="text-indigo-400 font-medium">{ev.criterion}</div>
                        <div className="text-slate-300 italic text-[10px] mt-0.5">&ldquo;{ev.matched_text}&rdquo;</div>
                        <div className="text-slate-400 text-[10px] mt-0.5">{ev.reasoning}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Human Override Information if present */}
              {selectedApp.latest_screening?.human_override_recommendation && (
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-xs space-y-1">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <BadgeAlert className="w-3.5 h-3.5" />
                    <span>Admin Override Applied</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Verdict: <strong className="text-white">{selectedApp.latest_screening.human_override_recommendation}</strong>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Reason: {selectedApp.latest_screening.human_override_reason}
                  </div>
                </div>
              )}

              {/* Human Action Command Center */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-300">Administrative Decision:</div>

                {/* Approve Button */}
                {!selectedApp.human_approved && selectedApp.stage === 'SCREENING' ? (
                  <button
                    onClick={() => handleApprove(selectedApp.id)}
                    disabled={actionLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve for Assessment Invitation</span>
                  </button>
                ) : (
                  <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs text-center font-medium">
                    Approved for Assessment Phase
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowOverrideModal(true)}
                    className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-medium transition-all"
                  >
                    Override AI Score
                  </button>

                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 text-xs font-medium transition-all"
                  >
                    Reject with Reason
                  </button>
                </div>

                <button
                  onClick={() => handleRetryScreening(selectedApp.id)}
                  className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-[11px] transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-evaluate Resume with AI</span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-xs text-slate-500">
              Select a candidate from the list to inspect screening findings.
            </div>
          )}
        </div>
      </div>

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-slate-700 bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BadgeAlert className="w-4 h-4 text-amber-400" />
              <span>Override AI Screening Recommendation</span>
            </h3>
            <p className="text-xs text-slate-300">
              Administrative overrides are logged to the immutable audit trail with your identifier.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Target Override Verdict</label>
              <select
                value={overrideRec}
                onChange={(e) => setOverrideRec(e.target.value as any)}
                className="w-full text-xs rounded-lg glass-input p-2.5 bg-slate-950 border border-slate-700 text-slate-200"
              >
                <option value="STRONG_MATCH">Strong Match</option>
                <option value="POTENTIAL_MATCH">Potential Match</option>
                <option value="BORDERLINE">Borderline</option>
                <option value="NOT_A_MATCH">Not A Match</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Mandatory Justification / Rationale</label>
              <textarea
                rows={3}
                placeholder="Explain why this candidate should be overridden (e.g. specialized industry domain background, portfolio excellence)..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full text-xs rounded-lg glass-input p-2.5 bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideSubmit}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
              >
                Record Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-slate-700 bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Reject Candidate Application</span>
            </h3>
            <p className="text-xs text-slate-300">
              Applications cannot be automatically closed by AI. A recorded human justification is required.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Mandatory Rejection Reason</label>
              <textarea
                rows={3}
                placeholder="Specify the reason for rejection (e.g. lacks required relational database experience, insufficient seniority)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full text-xs rounded-lg glass-input p-2.5 bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
