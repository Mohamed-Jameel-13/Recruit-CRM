'use client';

import { useState, useEffect } from 'react';
import { Mail, X, ExternalLink, Calendar, Video, Clock, CheckCircle2, FileText, ArrowRight } from 'lucide-react';
import { SentEmail } from '@/types/database';

interface EmailOutboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmailOutboxModal({ isOpen, onClose }: EmailOutboxModalProps) {
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchEmails();
    }
  }, [isOpen]);

  async function fetchEmails() {
    setLoading(true);
    try {
      const res = await fetch('/api/emails');
      const data = await res.json();
      setEmails(data.emails || []);
      if (data.emails && data.emails.length > 0) {
        setSelectedEmail(data.emails[0]);
      }
    } catch (err) {
      console.error('Failed to load emails:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Dispatched Email Communications Outbox
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Audited record of all candidate notifications, assessment links, and Round 2 Google Meet invitations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content split pane */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-neutral-800">
          {/* Email list */}
          <div className="overflow-y-auto max-h-[60vh] divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {loading ? (
              <div className="p-6 text-center text-xs text-neutral-400">Loading communications...</div>
            ) : emails.length === 0 ? (
              <div className="p-6 text-center text-xs text-neutral-400">No emails dispatched yet.</div>
            ) : (
              emails.map((e) => {
                const isSelected = selectedEmail?.id === e.id;
                const isInterview = e.template_type === 'ROUND_2_INTERVIEW_INVITATION';
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelectedEmail(e)}
                    className={`w-full text-left p-3.5 transition-colors space-y-1 block ${
                      isSelected 
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-l-blue-600' 
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[130px]">
                        {e.recipient_name}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {new Date(e.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-700 dark:text-neutral-300 font-medium truncate">
                      {e.subject}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded font-semibold ${
                        isInterview 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                          : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      }`}>
                        {isInterview ? 'Interview Invite Emailed' : 'Assessment Link'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Email Preview */}
          <div className="md:col-span-2 p-5 overflow-y-auto max-h-[60vh] space-y-4">
            {selectedEmail ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">To:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {selectedEmail.recipient_name} &lt;{selectedEmail.recipient_email}&gt;
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Subject:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {selectedEmail.subject}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-400">
                    <span>Dispatched:</span>
                    <span>{new Date(selectedEmail.sent_at).toLocaleString()}</span>
                  </div>
                </div>

                <div 
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-950 overflow-x-auto text-xs"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                />
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-neutral-400">
                Select an email from the list to preview its exact content.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="text-xs text-neutral-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Real-time email dispatcher synchronizer active</span>
          </div>
          <button onClick={onClose} className="btn-secondary text-xs">
            Close Outbox
          </button>
        </div>
      </div>
    </div>
  );
}
