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
import { useToast } from '@/components/ui/Toast';

export default function CandidatesPage() {
  const { toast } = useToast();
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
    const handleUpdate = () => fetchCandidates();
    window.addEventListener('recruitcrm:data_updated', handleUpdate);
    return () => window.removeEventListener('recruitcrm:data_updated', handleUpdate);
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
      toast.success('Candidate data and CV files have been purged in compliance with GDPR.', 'Record Erased');
      await fetchCandidates();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Deletion Request Error');
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span>Candidate Records & Pipeline</span>
            <span className="app-badge">Multi-Job Pipeline</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Candidate profiles linked to job applications with explicit stage separation and GDPR erasure controls.
          </p>
        </div>

        <button
          onClick={fetchCandidates}
          className="btn-secondary self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="app-card p-3.5 flex items-center justify-between">
        <div className="relative w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search candidate by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs app-input pl-9 pr-3 py-2"
          />
        </div>

        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          Total Candidates: <strong className="text-neutral-900 dark:text-neutral-100">{filtered.length}</strong>
        </div>
      </div>

      {/* Candidates Table */}
      <div className="app-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
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
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-neutral-400">
                    No candidates found. Use the Upload CVs page to ingest candidate resumes.
                  </td>
                </tr>
              ) : (
                filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors">
                    <td className="py-3 px-4 font-medium">
                      <div className="font-semibold">{app.candidate?.first_name} {app.candidate?.last_name}</div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-neutral-400" />
                        <span>{app.candidate?.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                      <div>{app.job?.title || 'Engineer'}</div>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Stage: {app.stage}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="app-badge font-mono text-[10px]">
                        {app.screening_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="app-badge font-mono text-[10px]">
                        {app.invitation_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        app.assessment_status === 'PASSED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : app.assessment_status === 'FAILED'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}>
                        {app.assessment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        app.interview_status === 'SCHEDULED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : app.interview_status === 'APPROVED'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                          : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
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
                        className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-rose-500/30 hover:bg-rose-500/10 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
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
          <div className="app-card max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>GDPR / CCPA Personal Data Deletion</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Permanently anonymize candidate personal identifying records, contact details, and private CV documents for{' '}
              <strong className="text-neutral-900 dark:text-neutral-100">
                {candidateToDelete?.candidate?.first_name} {candidateToDelete?.candidate?.last_name}
              </strong>.
            </p>

            <div className="space-y-1 text-xs">
              <label className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Deletion Justification</label>
              <textarea
                rows={2}
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                className="w-full rounded app-input p-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletionLoading}
                className="btn-primary bg-rose-600 hover:bg-rose-500 disabled:opacity-50"
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
