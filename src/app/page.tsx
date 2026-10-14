'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Briefcase, 
  FileCheck2, 
  CalendarClock, 
  UploadCloud, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  TrendingUp,
  Brain,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface AnalyticsData {
  totalJobs: number;
  totalCVsUploaded: number;
  cvsParsedSuccessfully: number;
  processingFailures: number;
  screeningCompleted: number;
  candidatesAwaitingApproval: number;
  approvedAssessmentInvitations: number;
  assessmentSubmissions: number;
  resultsAwaitingVerification: number;
  assessmentPassRate: number;
  candidatesAwaitingInterviewApproval: number;
  interviewsScheduled: number;
  funnel: Array<{ stage: string; count: number }>;
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentApps, setRecentApps] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [resAnalytics, resApps] = await Promise.all([
          fetch('/api/analytics'),
          fetch('/api/applications')
        ]);
        const dataAnalytics = await resAnalytics.json();
        const dataApps = await resApps.json();

        setAnalytics(dataAnalytics.analytics);
        setRecentApps(dataApps.applications ? dataApps.applications.slice(0, 6) : []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-card p-6 lg:p-8 border border-indigo-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Zero-Budget AI Recruitment Engine • Active</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            AI Screening & Recruitment Automation
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Welcome to the automated recruitment command center. Upload batches of candidate CVs, automatically extract credentials, screen candidates with intelligent semantic matching, and coordinate technical assessments and second-round interviews.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload New CV Batch</span>
            </Link>
            <Link
              href="/screening"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
            >
              <Brain className="w-4 h-4 text-indigo-400" />
              <span>Review AI Screening Queue</span>
            </Link>
            <Link
              href="/integrations"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>n8n Workflows & APIs</span>
            </Link>
          </div>
        </div>

        {/* Semantic Matching Callout Pill */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
            <Brain className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="font-semibold text-slate-200">Semantic Matching Guarantee: </span>
            <span className="text-slate-300">
              The AI screening engine matches candidate competencies conceptually, not just on exact keyword strings. For instance, if an employer requires PostgreSQL, candidate experience with MySQL or MariaDB is credited at 95% proficiency without unfair score penalties.
            </span>
          </div>
        </div>
      </div>

      {/* Primary Key Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="glass-card p-5 rounded-xl border border-slate-800/90">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">CVs Uploaded</span>
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : analytics?.totalCVsUploaded ?? 0}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{analytics?.cvsParsedSuccessfully ?? 0} Parsed Successfully</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-card p-5 rounded-xl border border-slate-800/90">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Awaiting Approval</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {loading ? '...' : analytics?.candidatesAwaitingApproval ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Human Review Queue</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-card p-5 rounded-xl border border-slate-800/90">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Assessment Pass Rate</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400">
            {loading ? '...' : `${analytics?.assessmentPassRate ?? 0}%`}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {analytics?.assessmentSubmissions ?? 0} Submissions Evaluated
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-card p-5 rounded-xl border border-slate-800/90">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Interviews Scheduled</span>
            <CalendarClock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {loading ? '...' : analytics?.interviewsScheduled ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Google Meet / Manual</span>
          </div>
        </div>
      </div>

      {/* Funnel & Pipeline Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recruitment Funnel */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-slate-800/90 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Recruitment Pipeline Funnel</h2>
              <p className="text-xs text-slate-400">Real-time candidate progression through the hiring lifecycle</p>
            </div>
            <Link
              href="/analytics"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <span>View Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 pt-2">
            {analytics?.funnel?.map((step, idx) => {
              const maxCount = Math.max(...(analytics.funnel.map(s => s.count)), 1);
              const percentage = Math.round((step.count / maxCount) * 100);
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-300">{step.stage}</span>
                    <span className="font-semibold text-white">{step.count} candidates</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-700"
                      style={{ width: `${Math.max(percentage, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Human-in-the-Loop Safeguard Panel */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800/90 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>Human Approval Guardrail</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              In accordance with human-in-the-loop ethical recruitment guidelines, <strong>AI screening scores are strictly advisory</strong>. The system will never automatically reject candidates or dispatch assessment invitations without explicit administrative confirmation.
            </p>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>Phase 1 Approval:</span>
                <span className="text-emerald-400 font-medium">Assessment Invitation</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Phase 2 Approval:</span>
                <span className="text-emerald-400 font-medium">Second-Round Interview</span>
              </div>
            </div>
          </div>

          <Link
            href="/screening"
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold text-center transition-all flex items-center justify-center gap-2"
          >
            <span>Open Review Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Recent Applications Table */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800/90 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Recent Candidate Applications</h2>
            <p className="text-xs text-slate-400">Candidates processed in the active hiring batch</p>
          </div>
          <Link
            href="/candidates"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            <span>View All Candidates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentApps.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No candidates uploaded yet. Click &quot;Upload CVs&quot; above to process your first batch!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 font-medium">Candidate</th>
                  <th className="py-2.5 font-medium">Target Role</th>
                  <th className="py-2.5 font-medium">AI Match Score</th>
                  <th className="py-2.5 font-medium">Recommendation</th>
                  <th className="py-2.5 font-medium">Stage</th>
                  <th className="py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentApps.map((app) => {
                  const score = app.latest_screening?.match_score ?? null;
                  const rec = app.latest_screening?.recommendation ?? 'PENDING';
                  return (
                    <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-medium text-slate-200">
                        <div>{app.candidate?.first_name} {app.candidate?.last_name}</div>
                        <div className="text-[11px] text-slate-400">{app.candidate?.email}</div>
                      </td>
                      <td className="py-3 text-slate-300">{app.job?.title || 'Senior Cloud Engineer'}</td>
                      <td className="py-3">
                        {score !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{score}</span>
                            <span className="text-[10px] text-slate-400">/ 100</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Processing...</span>
                        )}
                      </td>
                      <td className="py-3">
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
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-medium">
                          {app.stage}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href="/screening"
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-medium border border-slate-700 transition-all"
                        >
                          Review
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
