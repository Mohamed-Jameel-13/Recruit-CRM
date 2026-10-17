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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span>Audit Trail & Activity Logs</span>
            <span className="app-badge">Compliance & Safety</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Tamper-evident record of all candidate approvals, AI score overrides, assessment imports, and privacy deletions.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="btn-secondary self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="app-card p-3.5 flex items-center justify-between">
        <div className="relative w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by action, entity type or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs app-input pl-9 pr-3 py-2"
          />
        </div>

        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
          Recorded Events: <strong className="text-neutral-900 dark:text-neutral-100">{filtered.length}</strong>
        </div>
      </div>

      {/* Logs Table */}
      <div className="app-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
              <tr>
                <th className="py-3 px-4 font-medium">Timestamp</th>
                <th className="py-3 px-4 font-medium">Action</th>
                <th className="py-3 px-4 font-medium">Entity Type</th>
                <th className="py-3 px-4 font-medium">Entity ID</th>
                <th className="py-3 px-4 font-medium">Performed By</th>
                <th className="py-3 px-4 font-medium">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-mono text-[11px]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-neutral-400 font-sans text-xs">
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
                    <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors">
                      <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          log.action === 'APPROVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : log.action === 'OVERRIDE'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : log.action === 'REJECT' || log.action === 'DELETE'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300 font-sans">
                        {log.entity_type}
                      </td>
                      <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400 truncate max-w-[150px]">
                        {log.entity_id}
                      </td>
                      <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300 font-sans">
                        {log.user_name || 'System Admin'}
                      </td>
                      <td className="py-3 px-4 text-neutral-500 dark:text-neutral-400 font-mono text-[10px] max-w-xs truncate">
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
