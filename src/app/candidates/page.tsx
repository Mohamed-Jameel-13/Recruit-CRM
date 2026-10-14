'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';

export default function CandidatesPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // GDPR Deletion State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<any | null>(null);
  const [deletionReason, setDeletionReason] = useState('Candidate requested removal under GDPR Article 17.');
  const [deletionLoading, setDeletionLoading] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  async function fetchCandidates() {
    setLoading(true);
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err) {
      console.error('Failed to load candidate applications:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!candidateToDelete?.candidate_id) return;
    setDeletionLoading(true);
    try {
      const res = await fetch('/api/candidates/retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidateToDelete.candidate_id,
          reason: deletionReason,
          requestedBy: 'Data Protection Officer'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deletion failed');
      setShowDeleteModal(false);
      setCandidateToDelete(null);
      await fetchCandidates();
    } catch (err: unknown) {
      alert(`Deletion request error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeletionLoading(false);
    }
  }

  const filtered = applications.filter((app) => {
    const name = `${app.candidate?.first_name || ''} ${app.candidate?.last_name || ''}`.toLowerCase();
    const email = (app.candidate?.email || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Candidate Records & Application Pipeline</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              Multi-Job Pipeline
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Independent candidate profiles linked to job applications with explicit stage separation and GDPR deletion controls.
          </p>
        </div>

        <button
          onClick={fetchCandidates}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4 rounded-xl border border-slate-800/90 flex items-center justify-between">
        <div className="relative w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-lg glass-input pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500"
          />
        </div>

        <div className="text-xs text-slate-400">
          Total Candidates: <strong className="text-white">{filtered.length}</strong>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="glass-card rounded-2xl border border-slate-800/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800 bg-slate-950/40">
              <tr>
                <th className="py-3 px-4 font-medium">Candidate</th>
                <th className="py-3 px-4 font-medium">Target Requisition</th>
                <th className="py-3 px-4 font-medium">Screening Status</th>
                <th className="py-3 px-4 font-medium">Invitation Status</th>
                <th className="py-3 px-4 font-medium">Assessment Status</th>
                <th className="py-3 px-4 font-medium">Interview Status</th>
                <th className="py-3 px-4 font-medium text-right">Privacy / GDPR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    No candidates found. Use the Upload CVs page to ingest candidate resumes.
                  </td>
                </tr>
              ) : (
                filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-200">
                      <div className="font-semibold">{app.candidate?.first_name} {app.candidate?.last_name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{app.candidate?.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{app.job?.title || 'Senior Cloud Engineer'}</div>
                      <span className="text-[10px] text-indigo-400">Stage: {app.stage}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 font-mono text-slate-300">
                        {app.screening_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 font-mono text-slate-300">
                        {app.invitation_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        app.assessment_status === 'PASSED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : app.assessment_status === 'FAILED'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-900 border border-slate-800 text-slate-300'
                      }`}>
                        {app.assessment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        app.interview_status === 'SCHEDULED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : app.interview_status === 'APPROVED'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          : 'bg-slate-900 border border-slate-800 text-slate-400'
                      }`}>
                        {app.interview_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setCandidateToDelete(app);
                          setShowDeleteModal(true);
                        }}
                        title="Request GDPR Data Deletion"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GDPR Candidate Deletion Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-slate-700 bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>GDPR / CCPA Personal Data Deletion</span>
            </h3>
            <p className="text-xs text-slate-300">
              Permanently anonymize candidate personal identifying records, contact details, and private CV documents for{' '}
              <strong className="text-white">
                {candidateToDelete?.candidate?.first_name} {candidateToDelete?.candidate?.last_name}
              </strong>.
            </p>

            <div className="space-y-1 text-xs">
              <label className="text-[11px] font-medium text-slate-400">Deletion Justification</label>
              <textarea
                rows={2}
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-700 text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletionLoading}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-50"
              >
                {deletionLoading ? 'Processing...' : 'Confirm Erasure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
