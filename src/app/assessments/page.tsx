'use client';

import { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  Upload, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  FileSpreadsheet,
  Edit3,
  RefreshCw,
  Search,
  Check,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // CSV Import Modal State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [emailCol, setEmailCol] = useState('Candidate Email');
  const [scoreCol, setScoreCol] = useState('Quiz Score');
  const [maxScoreCol, setMaxScoreCol] = useState('Max Score');
  const [passThreshold, setPassThreshold] = useState('70');
  const [csvResultSummary, setCsvResultSummary] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);

  // Manual Entry Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [manualScore, setManualScore] = useState('');
  const [manualMaxScore, setManualMaxScore] = useState('100');
  const [manualNotes, setManualNotes] = useState('');

  useEffect(() => {
    fetchAssessments();
  }, []);

  async function fetchAssessments() {
    setLoading(true);
    try {
      const res = await fetch('/api/assessments');
      const data = await res.json();
      setAssessments(data.assessments || []);
    } catch (err) {
      console.error('Failed to load assessments:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadSampleCsv() {
    try {
      const sample = `Candidate Email,Candidate Name,Quiz Score,Max Score,Completed At
elena.rostova@example.com,Elena Rostova,92,100,2026-10-12T14:30:00Z
david.chen@example.com,David Chen,88,100,2026-10-12T15:15:00Z
marcus.brody@example.com,Marcus Brody,85,100,2026-10-12T16:00:00Z
samantha.miller@example.com,Samantha Miller,94,100,2026-10-12T16:45:00Z
priya.sharma@example.com,Priya Sharma,74,100,2026-10-13T10:00:00Z
liam.oconnor@example.com,Liam O'Connor,82,100,2026-10-13T11:20:00Z
jordan.vance@example.com,Jordan Vance,54,100,2026-10-13T12:00:00Z`;
      setCsvRawText(sample);
      setEmailCol('Candidate Email');
      setScoreCol('Quiz Score');
      setMaxScoreCol('Max Score');
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCsvImportSubmit() {
    if (!csvRawText.trim()) {
      alert('Please paste or load CSV content.');
      return;
    }
    setImporting(true);
    setCsvResultSummary(null);

    try {
      const res = await fetch('/api/assessments/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent: csvRawText,
          mapping: {
            emailColumn: emailCol,
            scoreColumn: scoreCol,
            maxScoreColumn: maxScoreCol,
          },
          passThresholdPercentage: parseFloat(passThreshold) || 70,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setCsvResultSummary(data);
      await fetchAssessments();
    } catch (err: unknown) {
      alert(`CSV Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImporting(false);
    }
  }

  async function handleManualEntrySubmit() {
    if (!selectedAssignmentId || !manualScore) {
      alert('Please select an assessment and enter a score.');
      return;
    }
    try {
      const res = await fetch('/api/assessments/manual-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: selectedAssignmentId,
          score: manualScore,
          maxScore: manualMaxScore,
          notes: manualNotes,
          enteredBy: 'Recruiter Admin'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record score');
      setShowManualModal(false);
      setManualScore('');
      await fetchAssessments();
    } catch (err: unknown) {
      alert(`Manual entry error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const filtered = assessments.filter((a) => {
    const name = `${a.candidate?.first_name || ''} ${a.candidate?.last_name || ''}`.toLowerCase();
    const email = (a.candidate?.email || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Technical Assessment Management</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
              Google Forms & CSV
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track invitations, synchronize Google Forms/Sheets scores, or import bulk CSV evaluations with automated pass policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Manual Score Entry</span>
          </button>

          <button
            onClick={() => {
              setShowCsvModal(true);
              handleLoadSampleCsv();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV Result Import Wizard</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
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

        <button
          onClick={fetchAssessments}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-200 text-xs border border-slate-800 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Assessments Records Table */}
      <div className="glass-card rounded-2xl border border-slate-800/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800 bg-slate-950/40">
              <tr>
                <th className="py-3 px-4 font-medium">Candidate</th>
                <th className="py-3 px-4 font-medium">Assessment Type</th>
                <th className="py-3 px-4 font-medium">Pass Policy</th>
                <th className="py-3 px-4 font-medium">Score / Max</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Result Source</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    No technical assessments active yet. Approve candidates in the Screening Review page or import a CSV file above.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const passed = item.status === 'PASSED';
                  const failed = item.status === 'FAILED';
                  const hasScore = item.score !== undefined && item.score !== null;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-200">
                        <div>{item.candidate?.first_name} {item.candidate?.last_name}</div>
                        <div className="text-[11px] text-slate-400">{item.candidate?.email}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {item.assessment_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <span>Min {item.pass_threshold_percentage}%</span>
                      </td>
                      <td className="py-3 px-4">
                        {hasScore ? (
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className={passed ? 'text-emerald-400' : 'text-rose-400'}>
                              {item.score} / {item.max_score}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({item.percentage_score}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Awaiting submission</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          passed
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : failed
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : item.status === 'SENT'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {item.result_source ? (
                          <span className="capitalize">{item.result_source.replace('_', ' ')}</span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedAssignmentId(item.id);
                            setShowManualModal(true);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-medium border border-slate-700 transition-all"
                        >
                          Record Score
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Import Wizard Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full p-6 rounded-2xl border border-slate-700 bg-slate-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">CSV Assessment Result Import Wizard</h3>
              </div>
              <button
                onClick={handleLoadSampleCsv}
                className="text-xs px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium hover:bg-indigo-500/30 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-cyan-300" />
                <span>Load Sample Data</span>
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Paste CSV contents or edit the mappings below. The system validates headers, detects duplicate candidate rows, calculates percentages, and verifies scores against your pass policy.
            </p>

            {/* Column Mapping Inputs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Email Column</label>
                <input
                  type="text"
                  value={emailCol}
                  onChange={(e) => setEmailCol(e.target.value)}
                  className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Score Column</label>
                <input
                  type="text"
                  value={scoreCol}
                  onChange={(e) => setScoreCol(e.target.value)}
                  className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Max Score Column</label>
                <input
                  type="text"
                  value={maxScoreCol}
                  onChange={(e) => setMaxScoreCol(e.target.value)}
                  className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Pass Threshold %</label>
                <input
                  type="number"
                  value={passThreshold}
                  onChange={(e) => setPassThreshold(e.target.value)}
                  className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-800 text-slate-200"
                />
              </div>
            </div>

            {/* CSV Raw Content Area */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">CSV Raw Data</label>
              <textarea
                rows={6}
                value={csvRawText}
                onChange={(e) => setCsvRawText(e.target.value)}
                placeholder="Candidate Email,Quiz Score,Max Score..."
                className="w-full font-mono text-xs rounded-lg glass-input p-2.5 bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600"
              />
            </div>

            {/* Import Summary Results */}
            {csvResultSummary && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Import Completed: {csvResultSummary.validRowsCount} valid rows processed</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300">
                  <div>Matched Candidates: <strong className="text-white">{csvResultSummary.matchedApplications}</strong></div>
                  <div>Duplicate Rows: <strong className="text-amber-400">{csvResultSummary.duplicateCount}</strong></div>
                  <div>Invalid Rows: <strong className="text-rose-400">{csvResultSummary.invalidRowsCount}</strong></div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowCsvModal(false);
                  setCsvResultSummary(null);
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
              <button
                onClick={handleCsvImportSubmit}
                disabled={importing}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
              >
                {importing ? 'Processing & Validating...' : 'Validate & Import CSV'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-slate-700 bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-cyan-400" />
              <span>Record Assessment Result</span>
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Select Assessment Assignment</label>
              <select
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                className="w-full text-xs rounded-lg glass-input p-2.5 bg-slate-950 border border-slate-700 text-slate-200"
              >
                <option value="">-- Choose Candidate Assessment --</option>
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.candidate?.first_name} {a.candidate?.last_name} ({a.candidate?.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Score Earned</label>
                <input
                  type="number"
                  placeholder="e.g. 85"
                  value={manualScore}
                  onChange={(e) => setManualScore(e.target.value)}
                  className="w-full text-xs rounded-lg glass-input p-2.5 bg-slate-950 border border-slate-700 text-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Max Possible Score</label>
                <input
                  type="number"
                  value={manualMaxScore}
                  onChange={(e) => setManualMaxScore(e.target.value)}
                  className="w-full text-xs rounded-lg glass-input p-2.5 bg-slate-950 border border-slate-700 text-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Reviewer Notes (Optional)</label>
              <textarea
                rows={2}
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Details regarding test performance or manual test review..."
                className="w-full text-xs rounded-lg glass-input p-2.5 bg-slate-950 border border-slate-700 text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowManualModal(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleManualEntrySubmit}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
              >
                Submit Result
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
