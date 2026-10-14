'use client';

import { useState, useEffect } from 'react';
import { 
  CalendarClock, 
  Calendar, 
  Video, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  User, 
  ExternalLink,
  RefreshCw,
  Globe,
  Lock,
  BadgeAlert
} from 'lucide-react';

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [interviewers, setInterviewers] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Schedule Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [selectedInterviewerId, setSelectedInterviewerId] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [timezone, setTimezone] = useState('America/New_York');
  const [schedulingMode, setSchedulingMode] = useState<'GOOGLE_CALENDAR' | 'MANUAL'>('MANUAL');
  const [customMeetingUrl, setCustomMeetingUrl] = useState('');
  const [schedulingError, setSchedulingError] = useState<string | null>(null);
  const [schedulingSuccess, setSchedulingSuccess] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [resInt, resApps] = await Promise.all([
        fetch('/api/interviews'),
        fetch('/api/applications')
      ]);
      const dataInt = await resInt.json();
      const dataApps = await resApps.json();

      setInterviews(dataInt.interviews || []);
      setInterviewers(dataInt.interviewers || []);
      if (dataInt.interviewers && dataInt.interviewers.length > 0) {
        setSelectedInterviewerId(dataInt.interviewers[0].id);
      }

      // Filter applications that passed assessment or are in interview stage
      const eligible = (dataApps.applications || []).filter(
        (a: any) => a.assessment_status === 'PASSED' || a.stage === 'INTERVIEW' || a.interview_status !== 'NOT_SCHEDULED'
      );
      setApplications(eligible);
      if (eligible.length > 0) {
        setSelectedAppId(eligible[0].id);
      }
    } catch (err) {
      console.error('Failed to load interview data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApproveForInterview(appId: string) {
    setActionLoading(true);
    try {
      const res = await fetch('/api/interviews/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, approvedBy: 'Admin Sarah Connor' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Approval failed');
      await fetchData();
    } catch (err: unknown) {
      alert(`Approval failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleScheduleSubmit() {
    setSchedulingError(null);
    setSchedulingSuccess(null);

    if (!selectedAppId || !selectedInterviewerId || !scheduledStart) {
      setSchedulingError('Please select a candidate, interviewer, and start date/time.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/interviews/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: selectedAppId,
          interviewerId: selectedInterviewerId,
          scheduledStart: new Date(scheduledStart).toISOString(),
          durationMinutes: parseInt(durationMinutes, 10),
          timezone,
          schedulingMode,
          meetingUrl: customMeetingUrl || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setSchedulingError(data.error || 'Failed to schedule interview.');
        return;
      }

      setSchedulingSuccess(data);
      await fetchData();
      setTimeout(() => {
        setShowScheduleModal(false);
        setSchedulingSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      setSchedulingError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Interview Management & Coordination</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Round 2 Pipeline
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Coordinate technical interviews with real-time conflict checking, Google Calendar/Meet integration, and manual scheduling fallback.
          </p>
        </div>

        <button
          onClick={() => {
            const nextWeek = new Date(Date.now() + 48 * 60 * 60 * 1000);
            nextWeek.setHours(14, 0, 0, 0);
            setScheduledStart(nextWeek.toISOString().slice(0, 16));
            setShowScheduleModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
        >
          <Calendar className="w-4 h-4" />
          <span>Schedule New Interview</span>
        </button>
      </div>

      {/* Integration Status & Human Approval Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4 rounded-xl border border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Google Calendar Connection Status</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
              Manual Mode Active
            </span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            When Google Cloud OAuth credentials are configured, the platform queries live free/busy availability and generates verified Google Meet links. In zero-budget demonstration mode, manual scheduling with built-in conflict checks is fully supported.
          </p>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Round 2 Admin Approval Policy</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Enforced
            </span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Candidates who successfully pass technical assessments must receive explicit human approval before a second-round interview booking can be dispatched.
          </p>
        </div>
      </div>

      {/* Candidates Awaiting Round 2 Approval */}
      {applications.filter(a => a.assessment_status === 'PASSED' && a.interview_status === 'AWAITING_APPROVAL').length > 0 && (
        <div className="glass-card p-4 rounded-xl border border-amber-500/30 bg-amber-950/10 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <BadgeAlert className="w-4 h-4 text-amber-400" />
            <span>Candidates Passed Assessment — Awaiting Round 2 Interview Approval:</span>
          </div>
          <div className="space-y-2">
            {applications
              .filter(a => a.assessment_status === 'PASSED' && a.interview_status === 'AWAITING_APPROVAL')
              .map((app) => (
                <div key={app.id} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{app.candidate?.first_name} {app.candidate?.last_name}</div>
                    <div className="text-[11px] text-slate-400">{app.candidate?.email} • Assessment: {app.assessment_assignment?.percentage_score}%</div>
                  </div>
                  <button
                    onClick={() => handleApproveForInterview(app.id)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve for Interview</span>
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Interviews Table */}
      <div className="glass-card rounded-2xl border border-slate-800/90 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <span className="text-xs font-semibold text-slate-300">
            Scheduled Interviews ({interviews.length})
          </span>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800 bg-slate-950/40">
              <tr>
                <th className="py-3 px-4 font-medium">Candidate</th>
                <th className="py-3 px-4 font-medium">Interviewer</th>
                <th className="py-3 px-4 font-medium">Scheduled Date & Time</th>
                <th className="py-3 px-4 font-medium">Duration</th>
                <th className="py-3 px-4 font-medium">Mode</th>
                <th className="py-3 px-4 font-medium">Meeting URL</th>
                <th className="py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {interviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    No interviews scheduled yet. Click &quot;Schedule New Interview&quot; above to book a candidate.
                  </td>
                </tr>
              ) : (
                interviews.map((item) => {
                  const dateStr = new Date(item.scheduled_start).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                    timeZone: item.timezone || 'UTC'
                  });

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-200">
                        <div>{item.candidate?.first_name} {item.candidate?.last_name}</div>
                        <div className="text-[11px] text-slate-400">{item.candidate?.email}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{item.interviewer_name || 'Sarah Connor'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div>{dateStr}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.timezone}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <span>{item.duration_minutes} mins</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.scheduling_mode === 'GOOGLE_CALENDAR'
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {item.scheduling_mode}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {item.meeting_url ? (
                          <a
                            href={item.meeting_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-900 text-indigo-400 hover:text-indigo-300 text-[11px] border border-slate-800"
                          >
                            <Video className="w-3 h-3 text-emerald-400" />
                            <span>Join Meeting</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                          {item.booking_status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Interview Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 rounded-2xl border border-slate-700 bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Book Round 2 Technical Interview</span>
            </h3>

            {/* Error Alert */}
            {schedulingError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{schedulingError}</span>
              </div>
            )}

            {/* Success Alert */}
            {schedulingSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Interview successfully booked without conflicts!</span>
              </div>
            )}

            {/* Candidate Selector */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Candidate</label>
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="w-full text-xs rounded-lg glass-input p-2.5 bg-slate-950 border border-slate-700 text-slate-200"
              >
                <option value="">-- Choose Candidate --</option>
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.candidate?.first_name} {a.candidate?.last_name} ({a.candidate?.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Interviewer Selector */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Interviewer</label>
              <select
                value={selectedInterviewerId}
                onChange={(e) => setSelectedInterviewerId(e.target.value)}
                className="w-full text-xs rounded-lg glass-input p-2.5 bg-slate-950 border border-slate-700 text-slate-200"
              >
                {interviewers.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.timezone})
                  </option>
                ))}
              </select>
            </div>

            {/* Date/Time & Duration */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-700 text-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Duration (Minutes)</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-700 text-slate-200"
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>
            </div>

            {/* Timezone & Mode */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-700 text-slate-200"
                >
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Scheduling Mode</label>
                <select
                  value={schedulingMode}
                  onChange={(e) => setSchedulingMode(e.target.value as any)}
                  className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-700 text-slate-200"
                >
                  <option value="MANUAL">Manual Scheduling</option>
                  <option value="GOOGLE_CALENDAR">Google Calendar & Meet</option>
                </select>
              </div>
            </div>

            {/* Meeting Link */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Meeting Link (Optional)</label>
              <input
                type="text"
                placeholder="https://meet.google.com/abc-defg-hij"
                value={customMeetingUrl}
                onChange={(e) => setCustomMeetingUrl(e.target.value)}
                className="w-full text-xs rounded glass-input p-2 bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setSchedulingError(null);
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleSubmit}
                disabled={actionLoading}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {actionLoading ? 'Checking Conflicts...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
