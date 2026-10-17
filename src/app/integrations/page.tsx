'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Cpu, 
  Workflow, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  FileCode, 
  Save, 
  Zap,
  Globe,
  Radio,
  Server,
  Sliders
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function IntegrationsPage() {
  const { toast } = useToast();
  // LLM Config State
  const [provider, setProvider] = useState<'openai_compatible' | 'gemini' | 'ollama' | 'groq' | 'custom'>('openai_compatible');
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434/v1');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('llama3.2');
  const [temperature, setTemperature] = useState('0.1');

  const [savingLLM, setSavingLLM] = useState(false);
  const [testingLLM, setTestingLLM] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // n8n State
  const [n8nUrl, setN8nUrl] = useState('http://localhost:5678/webhook/cv-batch');
  const [n8nSecret, setN8nSecret] = useState('demo_shared_secret_2026');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchLLMConfig();
  }, []);

  async function fetchLLMConfig() {
    try {
      const res = await fetch('/api/llm/config');
      const data = await res.json();
      if (data.config) {
        setBaseUrl(data.config.baseUrl || 'http://localhost:11434/v1');
        setModel(data.config.model || 'llama3.2');
        setProvider(data.config.provider || 'openai_compatible');
        setTemperature(String(data.config.temperature ?? 0.1));
      }
    } catch (err) {
      console.error('Failed reading LLM config:', err);
    }
  }

  function applyPreset(preset: string) {
    if (preset === 'ollama') {
      setProvider('openai_compatible');
      setBaseUrl('http://localhost:11434/v1');
      setModel('llama3.2');
      setApiKey('');
    } else if (preset === 'groq') {
      setProvider('openai_compatible');
      setBaseUrl('https://api.groq.com/openai/v1');
      setModel('llama-3.3-70b-versatile');
    } else if (preset === 'openrouter') {
      setProvider('openai_compatible');
      setBaseUrl('https://openrouter.ai/api/v1');
      setModel('meta-llama/llama-3.3-70b-instruct:free');
    } else if (preset === 'openai') {
      setProvider('openai_compatible');
      setBaseUrl('https://api.openai.com/v1');
      setModel('gpt-4o-mini');
    } else if (preset === 'deepseek') {
      setProvider('openai_compatible');
      setBaseUrl('https://api.deepseek.com/v1');
      setModel('deepseek-chat');
    } else if (preset === 'gemini') {
      setProvider('gemini');
      setBaseUrl('https://generativelanguage.googleapis.com/v1beta');
      setModel('gemini-1.5-flash');
    }
  }

  async function handleSaveLLM() {
    setSavingLLM(true);
    setTestResult(null);
    try {
      const payload: any = {
        provider,
        baseUrl,
        model,
        temperature: parseFloat(temperature) || 0.1,
      };
      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim();
      }

      const res = await fetch('/api/llm/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success(`LLM configuration saved. Provider: ${provider}, Model: ${model}`, 'Configuration Saved');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Configuration Error');
    } finally {
      setSavingLLM(false);
    }
  }

  async function handleTestLLM() {
    setTestingLLM(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          baseUrl,
          apiKey,
          model,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: unknown) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTestingLLM(false);
    }
  }

  const WORKFLOWS = [
    {
      title: '★ Master All-in-One (Recommended Single Canvas)',
      filename: 'master_all_in_one_workflow.json',
      description: 'All 5 recruitment automation pipelines combined into a single canvas. Import this once to get full CV ingestion, screening, assessment invitations, Google sync, and interviews.'
    },
    {
      title: '01: CV Document Processing & AI Screening',
      filename: '01_cv_processing_workflow.json',
      description: 'Triggered when a CV batch is created. Extracts text, calls configured LLM with semantic rubric, and posts validated scores.'
    },
    {
      title: '02: Assessment Invitations & Delivery',
      filename: '02_assessment_invitations_workflow.json',
      description: 'Dispatches assessment invitations via email only after admin approval with retry protection.'
    },
    {
      title: '03: Google Forms & Sheets Result Sync',
      filename: '03_assessment_result_sync_workflow.json',
      description: 'Synchronizes Google Forms quiz scores directly to candidate applications via authenticated webhooks.'
    },
    {
      title: '04: Interview Coordination & Google Calendar',
      filename: '04_interview_coordination_workflow.json',
      description: 'Handles Round 2 scheduling, queries real Google Calendar availability, requests Meet links, or falls back to manual mode.'
    },
    {
      title: '05: Reminders & Dead-Letter Error Recovery',
      filename: '05_reminders_and_errors_workflow.json',
      description: 'Sends due-date reminder emails for pending assessments and surfaces error alerts in the audit trail.'
    }
  ];

  function handleCopyWorkflow(filename: string, idx: number) {
    navigator.clipboard.writeText(`n8n-workflows/${filename}`);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="border-b border-[var(--border-subtle)] pb-4">
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
          <span>Universal LLM & Integration Configuration</span>
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Connect any OpenAI-compatible Base URL (Ollama, Groq, OpenRouter, DeepSeek, vLLM) or Google Gemini to power semantic screening.
        </p>
      </div>

      {/* Direct Banner to Dedicated Settings Hub */}
      <div className="p-3.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <span className="text-xs text-[var(--text-primary)]">
            Explore the new <strong>UI Settings Hub</strong> with 10+ provider presets (OpenAI, Claude, Groq, Ollama), live model auto-detection, and testing playground!
          </span>
        </div>
        <Link href="/settings" className="btn-primary text-xs shrink-0 self-start sm:self-auto">
          Open UI Settings →
        </Link>
      </div>

      {/* SECTION 1: Universal LLM Model Configuration */}
      <div className="app-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--accent)] text-white flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                LLM Endpoint & Model Settings
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Use any local or cloud AI endpoint via standard OpenAI-compatible protocol
              </p>
            </div>
          </div>

          {/* Quick Provider Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-[var(--text-muted)] mr-1">Presets:</span>
            {[
              { id: 'ollama', name: 'Ollama (Local)' },
              { id: 'groq', name: 'Groq (Free)' },
              { id: 'openrouter', name: 'OpenRouter' },
              { id: 'deepseek', name: 'DeepSeek' },
              { id: 'openai', name: 'OpenAI' },
              { id: 'gemini', name: 'Gemini' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Base URL */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--text-primary)]">
              API Base URL <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="e.g. http://localhost:11434/v1 or https://api.groq.com/openai/v1"
              className="w-full text-xs font-mono rounded-md app-input p-2.5 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
            />
            <p className="text-[10px] text-[var(--text-muted)]">
              Any OpenAI-compatible server endpoint (e.g. Ollama, LM Studio, Groq, vLLM).
            </p>
          </div>

          {/* Model Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--text-primary)]">
              Model Name / Identifier <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. llama3.2, mistral, gpt-4o-mini, deepseek-chat"
              className="w-full text-xs font-mono rounded-md app-input p-2.5 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
            />
            <p className="text-[10px] text-[var(--text-muted)]">
              Target model ID to invoke on the server.
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--text-primary)]">
              API Key / Bearer Token <span className="text-[10px] text-[var(--text-muted)] font-normal">(Optional for local Ollama)</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Leave empty for local Ollama/LM Studio"
              className="w-full text-xs font-mono rounded-md app-input p-2.5 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--text-primary)]">
              Temperature (Factual Consistency)
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full text-xs font-mono rounded-md app-input p-2.5 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
            />
          </div>
        </div>

        {/* Live Test Outcome Box */}
        {testResult && (
          <div className={`p-3 rounded-md text-xs border ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
          }`}>
            <div className="flex items-center gap-1.5 font-semibold">
              {testResult.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Connection Verified! ({testResult.provider} • {testResult.latencyMs}ms)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Connection Failed</span>
                </>
              )}
            </div>
            {testResult.error && (
              <p className="text-[11px] mt-1 font-mono opacity-90">{testResult.error}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={handleTestLLM}
            disabled={testingLLM}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] transition-all disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-500 ${testingLLM ? 'animate-bounce' : ''}`} />
            <span>{testingLLM ? 'Testing Connection...' : 'Test Connection'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveLLM}
            disabled={savingLLM}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingLLM ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: n8n Webhook Configuration */}
      <div className="app-card p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div className="w-7 h-7 rounded-md bg-amber-500 text-white flex items-center justify-center">
            <Workflow className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Hosted n8n Instance Webhook
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Configure target webhook URL and shared secret
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--text-primary)]">n8n Batch Webhook Target URL</label>
            <input
              type="text"
              value={n8nUrl}
              onChange={(e) => setN8nUrl(e.target.value)}
              className="w-full text-xs font-mono rounded-md app-input p-2.5 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--text-primary)]">N8N_SHARED_SECRET (Authorization)</label>
            <input
              type="text"
              value={n8nSecret}
              onChange={(e) => setN8nSecret(e.target.value)}
              className="w-full text-xs font-mono rounded-md app-input p-2.5 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: Downloadable / Importable n8n Workflows */}
      <div className="app-card p-6 space-y-3">
        <div className="border-b border-[var(--border-subtle)] pb-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            5 Pre-Packaged n8n Workflows
          </h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            Located in <code className="font-mono text-[var(--text-primary)]">n8n-workflows/</code> in your repository
          </p>
        </div>

        <div className="space-y-2">
          {WORKFLOWS.map((wf, idx) => (
            <div key={idx} className="p-3 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <span>{wf.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                    {wf.filename}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{wf.description}</p>
              </div>

              <button
                onClick={() => handleCopyWorkflow(wf.filename, idx)}
                className="px-2.5 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-muted)] text-[var(--text-primary)] text-[11px] font-medium border border-[var(--border-subtle)] transition-all flex items-center gap-1 self-start sm:self-auto shrink-0"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-500">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-[var(--text-muted)]" />
                    <span>Copy Path</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
