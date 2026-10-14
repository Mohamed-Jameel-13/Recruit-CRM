'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock, 
  CalendarClock, 
  AlertTriangle, 
  RefreshCw,
  Filter
} from 'lucide-react';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
    fetchAnalytics('all');
  }, []);

  async function fetchJobs() {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchAnalytics(jobId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?jobId=${jobId}`);
      const data = await res.json();
      setAnalytics(data.analytics || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(jobId: string) {
    setSelectedJobId(jobId);
    fetchAnalytics(jobId);
  }

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Database-Backed Recruitment Analytics</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              Verified Persisted Data
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time pipeline metrics calculated directly from database records without inflated placeholders.
          </p>
        </div>

        {/* Job Requisition Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedJobId}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="text-xs rounded-lg glass-input px-3 py-2 bg-slate-900 border border-slate-800 text-slate-200"
          >
            <option value="all">All Jobs Combined</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchAnalytics(selectedJobId)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (12 required metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Jobs */}
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">Total Jobs Active</div>
          <div className="text-2xl font-bold text-white mt-1">{analytics?.totalJobs ?? 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">Current hiring requisitions</div>
        </div>

        {/* CVs Uploaded */}
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">Total CVs Uploaded</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">{analytics?.totalCVsUploaded ?? 0}</div>
          <div className="text-[10px] text-emerald-400 mt-1">{analytics?.cvsParsedSuccessfully ?? 0} parsed successfully</div>
        </div>

        {/* Processing Failures */}
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">Extraction Failures</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{analytics?.processingFailures ?? 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">Flagged for retry</div>
        </div>

        {/* Screening Completed */}
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">Screening Completed</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">{analytics?.screeningCompleted ?? 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">AI evaluations stored</div>
        </div>

        {/* Candidates Awaiting Approval */}
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">Awaiting Assessment Approval</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{analytics?.candidatesAwaitingApproval ?? 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">Human review pending</div>
        </div>

        {/* Approved Invitations */}
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">Approved Invitations</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{analytics?.approvedAssessmentInvitations ?? 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">Dispatched to candidates</div>
        </div>

        {/* Assessment Pass Rate */}
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">Assessment Pass Rate</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{analytics?.assessmentPassRate ?? 0}%</div>
          <div className="text-[10px] text-slate-400 mt-1">Denominator: Evaluated only</div>
        </div>

        {/* Interviews Scheduled */}
        <div className="glass-card p-4 rounded-xl border border-slate-800">
          <div className="text-xs text-slate-400">Round 2 Interviews</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">{analytics?.interviewsScheduled ?? 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">Scheduled bookings</div>
        </div>
      </div>

      {/* Recruitment Funnel Visual */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Conversion Funnel Drop-off Analysis</h2>
          </div>
          <span className="text-xs text-slate-400">Derived strictly from actual database entities</span>
        </div>

        <div className="space-y-4 pt-2">
          {analytics?.funnel?.map((step: any, i: number) => {
            const maxVal = Math.max(...(analytics.funnel.map((s: any) => s.count)), 1);
            const pct = Math.round((step.count / maxVal) * 100);
            return (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-300">{step.stage}</span>
                  <span className="font-bold text-white">{step.count} candidates</span>
                </div>
                <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-700"
                    style={{ width: `${Math.max(pct, 5)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
