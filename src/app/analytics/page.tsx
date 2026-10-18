'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock, 
  CalendarClock, 
  AlertTriangle, 
  RefreshCw,
  Filter,
  Award,
  FileText,
  XCircle,
  ArrowRight
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
            Real-time pipeline metrics and candidate assessment scores calculated directly from verified submissions.
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
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (8 Cards with Score Tracking) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Jobs */}
        <div className="app-card p-4 space-y-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Jobs Active</div>
          <div className="text-2xl font-bold tracking-tight">{analytics?.totalJobs ?? 0}</div>
          <div className="text-[10px] text-neutral-400">Current requisitions</div>
        </div>

        {/* CVs Uploaded */}
        <div className="app-card p-4 space-y-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total CVs Processed</div>
          <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{analytics?.totalCVsUploaded ?? 0}</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{analytics?.cvsParsedSuccessfully ?? 0} parsed successfully</div>
        </div>

        {/* Screening Completed & AI Avg Match */}
        <div className="app-card p-4 space-y-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">AI Screening Match</div>
          <div className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
            {analytics?.averageScreeningScore ? `${analytics.averageScreeningScore}%` : '—'}
          </div>
          <div className="text-[10px] text-neutral-400">{analytics?.screeningCompleted ?? 0} screened profiles</div>
        </div>

        {/* Approved Invitations */}
        <div className="app-card p-4 space-y-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Assessment Invites</div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{analytics?.approvedAssessmentInvitations ?? 0}</div>
          <div className="text-[10px] text-neutral-400">Dispatched to candidates</div>
        </div>

        {/* Assessment Submissions */}
        <div className="app-card p-4 space-y-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Assessments Submitted</div>
          <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">{analytics?.assessmentSubmissions ?? 0}</div>
          <div className="text-[10px] text-neutral-400">{analytics?.resultsAwaitingVerification ? `${analytics.resultsAwaitingVerification} awaiting review` : 'All graded'}</div>
        </div>

        {/* Average Assessment Score */}
        <div className="app-card p-4 space-y-1 border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/20">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium flex items-center justify-between">
            <span>Average Score</span>
            <Award className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
            {analytics?.averageAssessmentScore ? `${analytics.averageAssessmentScore}%` : '—'}
          </div>
          <div className="text-[10px] text-neutral-500">
            {analytics?.highestAssessmentScore ? `High: ${analytics.highestAssessmentScore}% | Low: ${analytics.lowestAssessmentScore}%` : 'From submitted tests'}
          </div>
        </div>

        {/* Assessment Pass Rate */}
        <div className="app-card p-4 space-y-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Assessment Pass Rate</div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{analytics?.assessmentPassRate ?? 0}%</div>
          <div className="text-[10px] text-neutral-400">Passing score &ge; 70%</div>
        </div>

        {/* Round 2 Interviews Scheduled */}
        <div className="app-card p-4 space-y-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Round 2 Interviews</div>
          <div className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">{analytics?.interviewsScheduled ?? 0}</div>
          <div className="text-[10px] text-neutral-400">Confirmed calendar invites</div>
        </div>
      </div>

      {/* Grid: Conversion Funnel & Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recruitment Funnel Visual */}
        <div className="app-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-semibold">Conversion Funnel Drop-off</h2>
            </div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Pipeline Progression</span>
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

        {/* Score Distribution Brackets */}
        <div className="app-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-semibold">Assessment Score Distribution</h2>
            </div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Grade Brackets</span>
          </div>

          <div className="space-y-3.5 pt-2 text-xs">
            {/* 85 - 100% */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="font-medium text-emerald-700 dark:text-emerald-400">Top Performers (85% - 100%)</span>
                <span className="font-bold">{analytics?.scoreDistribution?.excellent ?? 0}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <div 
                  className="h-full rounded-full bg-emerald-500" 
                  style={{ width: `${Math.max(0, Math.min(100, ((analytics?.scoreDistribution?.excellent || 0) / Math.max(analytics?.assessmentSubmissions || 1, 1)) * 100))}%` }} 
                />
              </div>
            </div>

            {/* 70 - 84% */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="font-medium text-blue-700 dark:text-blue-400">Qualified Pass (70% - 84%)</span>
                <span className="font-bold">{analytics?.scoreDistribution?.good ?? 0}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <div 
                  className="h-full rounded-full bg-blue-500" 
                  style={{ width: `${Math.max(0, Math.min(100, ((analytics?.scoreDistribution?.good || 0) / Math.max(analytics?.assessmentSubmissions || 1, 1)) * 100))}%` }} 
                />
              </div>
            </div>

            {/* 50 - 69% */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="font-medium text-amber-700 dark:text-amber-400">Borderline / Review (50% - 69%)</span>
                <span className="font-bold">{analytics?.scoreDistribution?.borderline ?? 0}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <div 
                  className="h-full rounded-full bg-amber-500" 
                  style={{ width: `${Math.max(0, Math.min(100, ((analytics?.scoreDistribution?.borderline || 0) / Math.max(analytics?.assessmentSubmissions || 1, 1)) * 100))}%` }} 
                />
              </div>
            </div>

            {/* < 50% */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="font-medium text-rose-700 dark:text-rose-400">Did Not Pass (&lt; 50%)</span>
                <span className="font-bold">{analytics?.scoreDistribution?.below ?? 0}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                <div 
                  className="h-full rounded-full bg-rose-500" 
                  style={{ width: `${Math.max(0, Math.min(100, ((analytics?.scoreDistribution?.below || 0) / Math.max(analytics?.assessmentSubmissions || 1, 1)) * 100))}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Assessment Score Tracker Table */}
      <div className="app-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-500" />
              <span>Candidate Assessment Score Tracker</span>
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Live scores recorded directly from completed technical submissions
            </p>
          </div>
          <Link
            href="/assessments"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
          >
            <span>Assessment Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {(!analytics?.recentSubmissions || analytics.recentSubmissions.length === 0) ? (
          <div className="text-center py-10 text-xs text-neutral-400 space-y-2">
            <p>No assessment submissions recorded yet.</p>
            <p className="text-[11px] text-neutral-500">
              When candidates take and submit their assessment, their scores will automatically appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-2.5 font-medium">Candidate</th>
                  <th className="py-2.5 font-medium">Requisition</th>
                  <th className="py-2.5 font-medium">Score</th>
                  <th className="py-2.5 font-medium">Status</th>
                  <th className="py-2.5 font-medium">Date</th>
                  <th className="py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {analytics.recentSubmissions.map((sub: any) => {
                  const isPass = sub.passed || sub.status === 'PASSED';
                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                    >
                      <td className="py-3 font-medium">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {sub.candidateName}
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          {sub.candidateEmail}
                        </div>
                      </td>
                      <td className="py-3 text-neutral-600 dark:text-neutral-300">
                        {sub.jobTitle}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold font-mono text-sm ${isPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {sub.score}%
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            (&ge;{sub.passThreshold}% pass)
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isPass
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                          }`}
                        >
                          {isPass ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{isPass ? 'Passed' : 'Failed'}</span>
                        </span>
                      </td>
                      <td className="py-3 text-neutral-500 text-[11px]">
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href="/candidates"
                          className="btn-secondary py-1 px-2.5 text-[11px]"
                        >
                          View Candidate
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
