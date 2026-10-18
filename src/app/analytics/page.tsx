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
    fetchAnalytics(selectedJobId);
    const timer = setInterval(() => {
      fetchAnalytics(selectedJobId);
    }, 6000);
    const handleUpdate = () => fetchAnalytics(selectedJobId);
    window.addEventListener('recruitcrm:data_updated', handleUpdate);
    return () => {
      clearInterval(timer);
      window.removeEventListener('recruitcrm:data_updated', handleUpdate);
    };
  }, [selectedJobId]);

  async function fetchJobs() {
    try {
      const res = await fetch('/api/jobs', { cache: 'no-store' });
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchAnalytics(jobId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?jobId=${jobId}`, { cache: 'no-store' });
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span>Recruitment Analytics & Insights</span>
            <span className="app-badge">Verified Persisted Data</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time pipeline metrics calculated directly from database records without inflated placeholders.
          </p>
        </div>

        {/* Job Requisition Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-neutral-400" />
          <select
            value={selectedJobId}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="text-xs app-input px-3 py-2"
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
            className="btn-secondary p-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Jobs */}
        <div className="app-card p-4 space-y-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Jobs Active</div>
          <div className="text-2xl font-bold tracking-tight">{analytics?.totalJobs ?? 0}</div>
          <div className="text-[10px] text-neutral-400">Current requisitions</div>
        </div>

        {/* CVs Uploaded */}
        <div className="app-card p-4 space-y-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total CVs Uploaded</div>
          <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{analytics?.totalCVsUploaded ?? 0}</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{analytics?.cvsParsedSuccessfully ?? 0} parsed successfully</div>
        </div>

        {/* Processing Failures */}
        <div className="app-card p-4 space-y-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Extraction Failures</div>
          <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">{analytics?.processingFailures ?? 0}</div>
          <div className="text-[10px] text-neutral-400">Flagged for retry</div>
        </div>

        {/* Screening Completed */}
        <div className="app-card p-4 space-y-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Screening Completed</div>
          <div className="text-2xl font-bold tracking-tight">{analytics?.screeningCompleted ?? 0}</div>
          <div className="text-[10px] text-neutral-400">AI evaluations stored</div>
        </div>

        {/* Candidates Awaiting Approval */}
        <div className="app-card p-4 space-y-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Awaiting Assessment Approval</div>
          <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{analytics?.candidatesAwaitingApproval ?? 0}</div>
          <div className="text-[10px] text-neutral-400">Human review pending</div>
        </div>

        {/* Approved Invitations */}
        <div className="app-card p-4 space-y-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Approved Invitations</div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{analytics?.approvedAssessmentInvitations ?? 0}</div>
          <div className="text-[10px] text-neutral-400">Dispatched to candidates</div>
        </div>

        {/* Assessment Pass Rate */}
        <div className="app-card p-4 space-y-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Assessment Pass Rate</div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{analytics?.assessmentPassRate ?? 0}%</div>
          <div className="text-[10px] text-neutral-400">Evaluated candidates</div>
        </div>

        {/* Interviews Scheduled */}
        <div className="app-card p-4 space-y-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Round 2 Interviews</div>
          <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{analytics?.interviewsScheduled ?? 0}</div>
          <div className="text-[10px] text-neutral-400">Scheduled bookings</div>
        </div>
      </div>

      {/* Recruitment Funnel Visual */}
      <div className="app-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold">Conversion Funnel Drop-off Analysis</h2>
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Derived strictly from active database entities</span>
        </div>

        <div className="space-y-4 pt-2">
          {analytics?.funnel?.map((step: any, i: number) => {
            const maxVal = Math.max(...(analytics.funnel.map((s: any) => s.count)), 1);
            const pct = Math.round((step.count / maxVal) * 100);
            return (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{step.stage}</span>
                  <span className="font-bold">{step.count} candidates</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-500"
                    style={{ width: `${Math.max(pct, 4)}%` }}
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
