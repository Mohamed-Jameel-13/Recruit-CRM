'use client';

import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Clock, 
  User, 
  Tag, 
  FileText 
} from 'lucide-react';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = logs.filter((log) => {
    const act = (log.action || '').toLowerCase();
    const type = (log.entity_type || '').toLowerCase();
    const user = (log.user_name || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return act.includes(q) || type.includes(q) || user.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Immutable Audit Trail & Activity Logs</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              Compliance & Safety
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident record of all candidate approvals, AI score overrides, assessment imports, and privacy deletions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4 rounded-xl border border-slate-800/90 flex items-center justify-between">
        <div className="relative w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, entity type or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-lg glass-input pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500"
          />
        </div>

        <div className="text-xs text-slate-400">
          Recorded Events: <strong className="text-white">{filtered.length}</strong>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-2xl border border-slate-800/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800 bg-slate-950/40">
              <tr>
                <th className="py-3 px-4 font-medium">Timestamp</th>
                <th className="py-3 px-4 font-medium">Action</th>
                <th className="py-3 px-4 font-medium">Entity Type</th>
                <th className="py-3 px-4 font-medium">Entity ID</th>
                <th className="py-3 px-4 font-medium">Performed By</th>
                <th className="py-3 px-4 font-medium">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500 font-sans text-xs">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const dateStr = new Date(log.created_at).toLocaleString('en-US', {
                    dateStyle: 'short',
                    timeStyle: 'medium'
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          log.action === 'APPROVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : log.action === 'OVERRIDE'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : log.action === 'REJECT' || log.action === 'DELETE'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-sans">
                        {log.entity_type}
                      </td>
                      <td className="py-3 px-4 text-slate-400 truncate max-w-[150px]">
                        {log.entity_id}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-sans">
                        {log.user_name || 'System Admin'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[10px] max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '--'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
