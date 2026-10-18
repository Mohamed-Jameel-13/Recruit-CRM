'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  FileCheck2,
  CalendarClock,
  UploadCloud,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText,
  TrendingUp,
  ShieldCheck,
  Zap,
  Mail,
  Video,
} from 'lucide-react';

import { EmailOutboxModal } from '@/components/email/EmailOutboxModal';

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
  const [showEmailModal, setShowEmailModal] = useState(false);

  async function loadData() {
    try {
      const [resAnalytics, resApps] = await Promise.all([
        fetch('/api/analytics', { cache: 'no-store' }),
        fetch('/api/applications', { cache: 'no-store' }),
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

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 5000);
    const handleUpdate = () => loadData();
    window.addEventListener('recruitcrm:data_updated', handleUpdate);
    return () => {
      clearInterval(timer);
      window.removeEventListener('recruitcrm:data_updated', handleUpdate);
    };
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="app-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Recruitment Overview
          </h1>
          <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Real-time candidate tracking, AI-assisted competency screening, and interview scheduling.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/upload"
            className="btn-primary px-4 py-2 flex items-center gap-2 font-medium text-xs md:text-sm shadow-sm"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Launch Pipeline</span>
          </Link>
          <button
            onClick={() => setShowEmailModal(true)}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="View dispatched emails"
          >
            <Mail className="w-3.5 h-3.5 text-blue-500" />
            <span>Email Outbox</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="app-card p-5 space-y-2">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">CVs Processed</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight">
            {loading ? '…' : analytics?.totalCVsUploaded ?? 0}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>{analytics?.cvsParsedSuccessfully ?? 0} Parsed</span>
          </div>
        </div>

        <div className="app-card p-5 space-y-2">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Shortlisted</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {loading ? '…' : analytics?.approvedAssessmentInvitations ?? 0}
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Assessment invites sent
          </div>
        </div>

        <div className="app-card p-5 space-y-2">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Pass Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {loading ? '…' : `${analytics?.assessmentPassRate ?? 0}%`}
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {analytics?.assessmentSubmissions ?? 0} assessments graded
          </div>
        </div>

        <div className="app-card p-5 space-y-2">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
            <span className="text-xs font-medium uppercase tracking-wider">Interviews</span>
            <CalendarClock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight">
            {loading ? '…' : analytics?.interviewsScheduled ?? 0}
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <Video className="w-3 h-3 text-emerald-500" />
            <span>Meet links dispatched</span>
          </div>
        </div>
      </div>

      {/* Funnel & Recent Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel */}
        <div className="lg:col-span-2 app-card p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-neutral-200 dark:border-neutral-800">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Pipeline Funnel</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Real-time candidate progression through each hiring stage
              </p>
            </div>
            <button
              onClick={loadData}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
          <div className="space-y-3 pt-1">
            {analytics?.funnel?.map((step, idx) => {
              const maxCount = Math.max(...(analytics.funnel.map((s) => s.count)), 1);
              const pct = Math.round((step.count / maxCount) * 100);
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{step.stage}</span>
                    <span className="font-semibold">{step.count} candidates</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-700"
                      style={{ width: `${Math.max(pct, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="app-card p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold tracking-tight">Quick Actions</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Manage your candidate workflow and assessment criteria.
            </p>
            <div className="space-y-2 pt-1 text-xs">
              <Link
                href="/upload"
                className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
              >
                <span className="font-medium">Screen New Resumes</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
              </Link>
              <Link
                href="/candidates"
                className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
              >
                <span className="font-medium">Candidate Directory</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
              </Link>
              <Link
                href="/assessments"
                className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
              >
                <span className="font-medium">Assessment Studio</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
              </Link>
            </div>
          </div>
          <Link href="/upload" className="w-full btn-primary text-center justify-center py-2 text-xs font-semibold">
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Launch New Screening</span>
          </Link>
        </div>
      </div>

      {/* Recent Applications */}
      <div className="app-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Recent Candidates</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Latest candidates in the active hiring pool
            </p>
          </div>
          <Link
            href="/candidates"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentApps.length === 0 ? (
          <div className="text-center py-10 text-xs text-neutral-400 space-y-3">
            <p>No candidates processed yet.</p>
            <Link href="/upload" className="btn-primary inline-flex">
              <Zap className="w-4 h-4 text-amber-300" />
              Launch Your First Pipeline
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-2.5 font-medium">Candidate</th>
                  <th className="py-2.5 font-medium">Role</th>
                  <th className="py-2.5 font-medium">AI Score</th>
                  <th className="py-2.5 font-medium">Recommendation</th>
                  <th className="py-2.5 font-medium">Stage</th>
                  <th className="py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {recentApps.map((app) => {
                  const score = app.latest_screening?.match_score ?? null;
                  const rec = app.latest_screening?.recommendation ?? 'PENDING';
                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                    >
                      <td className="py-3 font-medium">
                        <div>
                          {app.candidate?.first_name} {app.candidate?.last_name}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          {app.candidate?.email}
                        </div>
                      </td>
                      <td className="py-3 text-neutral-600 dark:text-neutral-300">
                        {app.job?.title || 'Engineer'}
                      </td>
                      <td className="py-3">
                        {score !== null ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm">{score}</span>
                            <span className="text-[10px] text-neutral-400">/ 100</span>
                          </div>
                        ) : (
                          <span className="text-neutral-400">Pending</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            rec === 'STRONG_MATCH'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : rec === 'POTENTIAL_MATCH'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                              : rec === 'BORDERLINE'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {rec.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="app-badge">{app.stage}</span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          href="/candidates"
                          className="btn-secondary py-1 px-2.5 text-[11px]"
                        >
                          View
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

      {/* Email Outbox Modal */}
      <EmailOutboxModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      />
    </div>
  );
}
