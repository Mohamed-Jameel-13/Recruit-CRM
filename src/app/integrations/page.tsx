'use client';

import { useState } from 'react';
import { 
  Workflow, 
  Key, 
  Globe, 
  Sparkles, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  FileCode,
  Copy,
  Check
} from 'lucide-react';

export default function IntegrationsPage() {
  const [n8nUrl, setN8nUrl] = useState('http://localhost:5678/webhook/cv-batch');
  const [n8nSecret, setN8nSecret] = useState('demo_shared_secret_2026');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const WORKFLOWS = [
    {
      title: '01: CV Document Processing & AI Screening',
      filename: '01_cv_processing_workflow.json',
      description: 'Triggered when a CV batch is created. Extracts text, calls AI model with semantic matching rubric, and posts validated scores back to the application.'
    },
    {
      title: '02: Assessment Invitations & Delivery',
      filename: '02_assessment_invitations_workflow.json',
      description: 'Dispatches assessment invitations via email only after admin approval. Implements exponential backoff retries without duplicate invitations.'
    },
    {
      title: '03: Google Forms & Sheets Result Sync',
      filename: '03_assessment_result_sync_workflow.json',
      description: 'Synchronizes Google Forms quiz scores directly to candidate applications via authenticated webhooks with duplicate prevention.'
    },
    {
      title: '04: Interview Coordination & Google Calendar',
      filename: '04_interview_coordination_workflow.json',
      description: 'Handles Round 2 scheduling, queries real Google Calendar availability, requests Google Meet links, and supports manual fallback.'
    },
    {
      title: '05: Reminders & Dead-Letter Error Recovery',
      filename: '05_reminders_and_errors_workflow.json',
      description: 'Sends due-date reminder emails for pending assessments, captures failed workflows, and surfaces alerts in the audit trail.'
    }
  ];

  function handleCopyWorkflow(filename: string, idx: number) {
    navigator.clipboard.writeText(`n8n-workflows/${filename}`);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>n8n Workflows & Integration Boundaries</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
            Zero-Budget Automation
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Connect your hosted n8n instance and Google Workspace integrations with secure authentication and fallback boundaries.
        </p>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supabase Status */}
        <div className="glass-card p-5 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">Supabase & Storage</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Connected
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            PostgreSQL schema, RLS policies, and private CV document storage active.
          </p>
        </div>

        {/* Gemini AI Status */}
        <div className="glass-card p-5 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">Google Gemini AI</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              Semantic Mode
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Using Free-Tier Gemini API with automatic semantic equivalence fallback when key is unconfigured.
          </p>
        </div>

        {/* Google Workspace */}
        <div className="glass-card p-5 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">Google Calendar / Meet</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Manual Fallback
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Manual scheduling and conflict engine active. Add Google OAuth client keys to enable live Meet generation.
          </p>
        </div>
      </div>

      {/* n8n Configuration Section */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Workflow className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-semibold text-white">Hosted n8n Instance Configuration</h2>
            <p className="text-xs text-slate-400">Configure webhook target URLs and shared authentication secret</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400">n8n Batch Webhook Target URL</label>
            <input
              type="text"
              value={n8nUrl}
              onChange={(e) => setN8nUrl(e.target.value)}
              className="w-full rounded glass-input p-2.5 bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400">N8N_SHARED_SECRET (Authorization Bearer)</label>
            <input
              type="text"
              value={n8nSecret}
              onChange={(e) => setN8nSecret(e.target.value)}
              className="w-full rounded glass-input p-2.5 bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px]"
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-1">
          <div className="font-semibold text-indigo-300">Protected Application Callback Endpoints:</div>
          <div className="font-mono text-[11px] text-slate-400 space-y-0.5">
            <div>POST /api/webhooks/n8n/screening-callback (Requires X-N8N-Secret)</div>
            <div>POST /api/webhooks/n8n/assessment-callback (Requires X-N8N-Secret)</div>
          </div>
        </div>
      </div>

      {/* Downloadable / Importable n8n Workflows */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Ready-to-Import n8n Workflow JSON Files</h2>
              <p className="text-xs text-slate-400">Available in your project repository under <code className="text-indigo-300 font-mono">n8n-workflows/</code></p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {WORKFLOWS.map((wf, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="space-y-1 max-w-2xl">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span>{wf.title}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-indigo-400 border border-slate-800 font-mono">
                    {wf.filename}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{wf.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopyWorkflow(wf.filename, idx)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all flex items-center gap-1.5"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Path</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
