'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Server,
  Play,
  Key,
  Sliders,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Workflow,
  RotateCcw,
  Clock,
  Check,
  Globe
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { ProviderPreset, LLMProviderId } from '@/lib/llm/client';

function cleanBaseUrl(url: string): string {
  if (!url) return '';
  let clean = url.trim();
  clean = clean.replace(/\s+/g, '');
  clean = clean.replace(/\/+$/, '');
  clean = clean.replace(/\/chat\/completions\/?$/i, '');
  clean = clean.replace(/\/v1\/messages\/?$/i, '/v1');
  clean = clean.replace(/\/messages\/?$/i, '');
  clean = clean.replace(/\/v1(?:\/v1)+$/i, '/v1');
  clean = clean.replace(/\/v1v1$/i, '/v1');
  return clean;
}

export default function SettingsPage() {
  const { toast } = useToast();

  // Tabs
  const [activeTab, setActiveTab] = useState<'llm' | 'rubrics' | 'system'>('llm');

  // LLM Config State
  const [provider, setProvider] = useState<LLMProviderId>('gemini');
  const [baseUrl, setBaseUrl] = useState('https://generativelanguage.googleapis.com/v1beta');
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [apiKeyMasked, setApiKeyMasked] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState('gemini-2.5-flash');
  const [temperature, setTemperature] = useState(0.1);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [customHeadersStr, setCustomHeadersStr] = useState('');

  // Presets & Models
  const [presets, setPresets] = useState<ProviderPreset[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);

  // Advanced section collapse
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Testing & Saving state
  const [testingLLM, setTestingLLM] = useState(false);
  const [savingLLM, setSavingLLM] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    provider?: string;
    model?: string;
    latencyMs?: number;
    responseSample?: string;
    error?: string;
  } | null>(null);

  // Playground state
  const [playgroundMode, setPlaygroundMode] = useState<'screening' | 'custom'>('screening');
  const [playgroundUserPrompt, setPlaygroundUserPrompt] = useState('Are you ready to screen technical resumes?');
  const [playgroundRunning, setPlaygroundRunning] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState<any | null>(null);

  // Provider category filter
  const [providerCategory, setProviderCategory] = useState<'all' | 'cloud' | 'local' | 'aggregator'>('all');

  // Load config on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const res = await fetch('/api/llm/config');
      const data = await res.json();
      if (data.presets) {
        setPresets(data.presets);
      }
      if (data.config) {
        const c = data.config;
        setProvider(c.provider || 'gemini');
        setBaseUrl(c.baseUrl || 'https://generativelanguage.googleapis.com/v1beta');
        setModel(c.model || 'gemini-2.5-flash');
        setTemperature(c.temperature ?? 0.1);
        setMaxTokens(c.maxTokens || 4096);
        setHasKey(c.hasKey || false);
        setApiKeyMasked(c.apiKeyMasked || '');
        if (c.customHeaders && Object.keys(c.customHeaders).length > 0) {
          setCustomHeadersStr(JSON.stringify(c.customHeaders, null, 2));
        }

        // Set initial model list from preset
        const currentPreset = (data.presets as ProviderPreset[] | undefined)?.find(p => p.id === c.provider);
        if (currentPreset?.popularModels) {
          setAvailableModels(currentPreset.popularModels);
        }
        if (c.provider === 'custom' || (currentPreset && !currentPreset.popularModels.includes(c.model))) {
          setIsCustomModel(true);
        }

        // Cache to browser localStorage for instant UI recovery
        try {
          localStorage.setItem('recruitai_llm_config', JSON.stringify({
            provider: c.provider,
            baseUrl: c.baseUrl,
            model: c.model,
            temperature: c.temperature,
            maxTokens: c.maxTokens,
            customHeaders: c.customHeaders
          }));
        } catch {}
      }
    } catch (err) {
      console.error('Failed reading LLM config:', err);
      // Fallback: restore from localStorage if server fetch failed
      try {
        const localStr = localStorage.getItem('recruitai_llm_config');
        if (localStr) {
          const c = JSON.parse(localStr);
          if (c.provider) setProvider(c.provider);
          if (c.baseUrl) setBaseUrl(c.baseUrl);
          if (c.model) setModel(c.model);
          if (c.temperature !== undefined) setTemperature(c.temperature);
          if (c.maxTokens) setMaxTokens(c.maxTokens);
          if (c.customHeaders) setCustomHeadersStr(JSON.stringify(c.customHeaders, null, 2));
          if (c.provider === 'custom') setIsCustomModel(true);
        }
      } catch {}
    }
  }

  // Handle Preset selection
  function handleSelectPreset(preset: ProviderPreset) {
    setProvider(preset.id);
    setBaseUrl(preset.defaultBaseUrl);
    setModel(preset.defaultModel);
    setAvailableModels(preset.popularModels);
    setIsCustomModel(preset.id === 'custom');
    setTestResult(null);

    // If switching to local Ollama/LM Studio without key, clear key state
    if (!preset.requiresApiKey && preset.id !== 'custom') {
      setApiKey('');
    }
  }

  // Live Auto-Discovery of Models
  async function handleFetchLiveModels() {
    setFetchingModels(true);
    try {
      const sanitizedUrl = cleanBaseUrl(baseUrl);
      setBaseUrl(sanitizedUrl);

      let customHeaders: Record<string, string> | undefined;
      if (customHeadersStr.trim()) {
        try {
          customHeaders = JSON.parse(customHeadersStr);
        } catch {
          // ignore
        }
      }

      const res = await fetch('/api/llm/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          baseUrl: sanitizedUrl,
          apiKey: apiKey.trim() || (hasKey ? '__KEEP_EXISTING__' : ''),
          customHeaders
        })
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels(data.models);
        if (!data.models.includes(model)) {
          setModel(data.models[0]);
        }
        toast.success(`Discovered ${data.models.length} active models from endpoint!`, 'Models Loaded');
      } else {
        toast.warning(data.error || 'Endpoint returned no models list. You can enter the model name manually.', 'Model Discovery');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to query models from endpoint', 'Discovery Error');
    } finally {
      setFetchingModels(false);
    }
  }

  // Live Connection Ping Test
  async function handleTestConnection() {
    setTestingLLM(true);
    setTestResult(null);
    try {
      const sanitizedUrl = cleanBaseUrl(baseUrl);
      setBaseUrl(sanitizedUrl);

      let customHeaders: Record<string, string> | undefined;
      if (customHeadersStr.trim()) {
        try {
          customHeaders = JSON.parse(customHeadersStr);
        } catch {
          toast.error('Invalid JSON in Custom Headers field', 'Header Format Error');
          setTestingLLM(false);
          return;
        }
      }

      const res = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          baseUrl: sanitizedUrl,
          apiKey: apiKey.trim() || (hasKey ? '__KEEP_EXISTING__' : ''),
          model,
          temperature,
          customHeaders
        })
      });

      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        toast.success(`Connected to ${data.provider} (${data.model}) in ${data.latencyMs}ms!`, 'Connection Successful');
      } else {
        toast.error(data.error || 'Connection failed', 'LLM Connection Error');
      }
    } catch (err: unknown) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setTestingLLM(false);
    }
  }

  // Save LLM Configuration
  async function handleSaveConfig() {
    setSavingLLM(true);
    try {
      const sanitizedUrl = cleanBaseUrl(baseUrl);
      setBaseUrl(sanitizedUrl);

      let customHeaders: Record<string, string> | undefined;
      if (customHeadersStr.trim()) {
        try {
          customHeaders = JSON.parse(customHeadersStr);
        } catch {
          toast.error('Invalid JSON format in Custom Headers', 'Header Format Error');
          setSavingLLM(false);
          return;
        }
      }

      const payload: any = {
        provider,
        baseUrl: sanitizedUrl,
        model,
        temperature,
        maxTokens,
        customHeaders
      };

      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim();
      } else if (hasKey) {
        payload.apiKey = '__KEEP_EXISTING__';
      }

      const res = await fetch('/api/llm/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration');

      if (data.config) {
        setHasKey(data.config.hasKey);
        setApiKeyMasked(data.config.apiKeyMasked);
        setApiKey(''); // clear dirty plain input
        if (data.config.customHeaders && Object.keys(data.config.customHeaders).length > 0) {
          setCustomHeadersStr(JSON.stringify(data.config.customHeaders, null, 2));
        }
      }

      // Persist to browser localStorage
      try {
        localStorage.setItem('recruitai_llm_config', JSON.stringify({
          provider,
          baseUrl,
          model,
          temperature,
          maxTokens,
          customHeaders
        }));
      } catch {}

      toast.success(`Saved! Active Model: ${model} on ${provider}`, 'Configuration Persisted');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save LLM configuration', 'Save Error');
    } finally {
      setSavingLLM(false);
    }
  }

  // Clear Saved API Key
  async function handleClearKey() {
    if (!confirm('Are you sure you want to remove the stored API key?')) return;
    try {
      const res = await fetch('/api/llm/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          baseUrl,
          model,
          clearApiKey: true
        })
      });
      const data = await res.json();
      if (res.ok) {
        setHasKey(false);
        setApiKeyMasked('');
        setApiKey('');
        toast.info('API key removed from system storage.', 'Key Cleared');
      }
    } catch (err) {
      toast.error('Failed to clear API key', 'Error');
    }
  }

  // Run Test Playground
  async function handleRunPlayground() {
    setPlaygroundRunning(true);
    setPlaygroundResult(null);
    try {
      const res = await fetch('/api/llm/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          baseUrl,
          apiKey: apiKey.trim() || (hasKey ? '__KEEP_EXISTING__' : ''),
          model,
          temperature,
          promptType: playgroundMode === 'screening' ? 'candidate_screening' : 'custom',
          userPrompt: playgroundUserPrompt
        })
      });

      const data = await res.json();
      setPlaygroundResult(data);
      if (data.success) {
        toast.success(`Completed in ${data.latencyMs}ms!`, 'Playground Evaluation');
      } else {
        toast.error(data.error || 'Playground execution failed', 'Evaluation Error');
      }
    } catch (err: unknown) {
      setPlaygroundResult({
        success: false,
        error: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setPlaygroundRunning(false);
    }
  }

  const currentPreset = presets.find(p => p.id === provider);
  const filteredPresets = presets.filter(p => {
    if (providerCategory === 'all') return true;
    return p.category === providerCategory;
  });

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[var(--accent)]" />
            <span>UI Settings & Universal LLM Connection</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl">
            Configure any AI Language Model (Google Gemini, OpenAI, Claude, Groq, DeepSeek, OpenRouter, Ollama, or Custom API) to drive intelligent CV screening and assessment scoring.
          </p>
        </div>

        {/* Live Active LLM Badge */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-lg px-3 py-1.5 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-left">
            <div className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider">Active Engine</div>
            <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1 font-mono">
              <span>{model}</span>
              <span className="text-[10px] font-normal text-[var(--text-secondary)]">({provider})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)]">
        <button
          onClick={() => setActiveTab('llm')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'llm'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>LLM & AI Engine</span>
        </button>
        <button
          onClick={() => setActiveTab('rubrics')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'rubrics'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Screening Rubric Defaults</span>
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'system'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>System & Integrations Status</span>
        </button>
      </div>

      {/* TAB 1: LLM & AI Engine */}
      {activeTab === 'llm' && (
        <div className="space-y-6">
          {/* SECTION A: 1-Click Provider Selection */}
          <div className="app-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Choose Your LLM Provider</span>
                </h2>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Select a provider to automatically load its base URL, protocol, and recommended models.
                </p>
              </div>

              {/* Provider Category Filter Tabs */}
              <div className="flex items-center bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-md p-0.5 text-[11px]">
                {(['all', 'cloud', 'local', 'aggregator'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setProviderCategory(cat)}
                    className={`px-2.5 py-0.5 rounded capitalize transition-all ${
                      providerCategory === cat
                        ? 'bg-[var(--accent)] text-white font-medium shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {cat === 'all' ? 'All (10)' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Provider Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPresets.map((p) => {
                const isSelected = provider === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className={`cursor-pointer rounded-lg p-3.5 border transition-all text-left relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)] shadow-sm'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                          <span>{p.name}</span>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-[var(--accent)] text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-mono bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] mb-2">
                        {p.badge}
                      </span>
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-mono">
                      <span>Default: {p.defaultModel}</span>
                      {p.requiresApiKey ? (
                        <span className="text-amber-500 flex items-center gap-0.5">
                          <Key className="w-2.5 h-2.5" /> Key Req.
                        </span>
                      ) : (
                        <span className="text-emerald-500 font-medium">Free/Local</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION B: Connection Parameters Form */}
          <div className="app-card p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[var(--accent)] text-white flex items-center justify-center shadow-sm">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-primary)]">
                    Connection Parameters & Authentication
                  </h2>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Endpoint URL, access credentials, and model specification for {currentPreset?.name || provider}
                  </p>
                </div>
              </div>

              {currentPreset?.keyUrl && (
                <a
                  href={currentPreset.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-1 text-[11px] text-[var(--accent)] hover:underline font-medium"
                >
                  <span>Get {currentPreset.name} API Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* API Base URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1">
                    <Globe className="w-3 h-3 text-[var(--text-muted)]" />
                    <span>API Base URL</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  {currentPreset && baseUrl !== currentPreset.defaultBaseUrl && (
                    <button
                      type="button"
                      onClick={() => setBaseUrl(currentPreset.defaultBaseUrl)}
                      className="text-[10px] text-[var(--accent)] hover:underline"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  onBlur={() => setBaseUrl(cleanBaseUrl(baseUrl))}
                  placeholder="https://api.openai.com/v1 or http://localhost:11434/v1"
                  className="w-full text-xs font-mono rounded-md app-input p-2.5 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
                <p className="text-[10px] text-[var(--text-muted)]">
                  The base HTTP address where chat completions or messages requests are dispatched.
                </p>
              </div>

              {/* API Key / Bearer Token */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1">
                    <Key className="w-3 h-3 text-[var(--text-muted)]" />
                    <span>API Key / Secret Token</span>
                    {currentPreset?.requiresApiKey ? (
                      <span className="text-rose-500">*</span>
                    ) : (
                      <span className="text-[10px] text-emerald-500 font-normal">(Optional for local)</span>
                    )}
                  </label>
                  {hasKey && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Saved: {apiKeyMasked}
                      </span>
                      <button
                        type="button"
                        onClick={handleClearKey}
                        className="text-[10px] text-rose-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      hasKey
                        ? '•••••••••••••••••••• (Leave blank to keep existing key)'
                        : currentPreset?.keyPlaceholder || 'Enter API Key'
                    }
                    className="w-full text-xs font-mono rounded-md app-input p-2.5 pr-9 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] flex items-center justify-between">
                  <span>Never shared with third parties. Encrypted and stored locally in system storage.</span>
                  {currentPreset?.keyUrl && (
                    <a
                      href={currentPreset.keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] hover:underline ml-2"
                    >
                      Get key ↗
                    </a>
                  )}
                </p>
              </div>

              {/* Model Selection & Auto-Discovery */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1">
                    <Cpu className="w-3 h-3 text-[var(--text-muted)]" />
                    <span>Target Model Identifier</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCustomModel(!isCustomModel)}
                      className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      {isCustomModel ? '← Select from list' : '+ Type custom model'}
                    </button>
                    <button
                      type="button"
                      onClick={handleFetchLiveModels}
                      disabled={fetchingModels}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--accent)] hover:border-[var(--accent)] transition-all"
                    >
                      <RefreshCw className={`w-3 h-3 ${fetchingModels ? 'animate-spin' : ''}`} />
                      <span>{fetchingModels ? 'Querying...' : 'Auto-Detect Live Models'}</span>
                    </button>
                  </div>
                </div>

                {!isCustomModel ? (
                  <div className="relative">
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full text-xs font-mono rounded-md app-input p-2.5 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                    >
                      {availableModels.map((m) => (
                        <option key={m} value={m}>
                          {m} {m === currentPreset?.defaultModel ? '★ (Recommended Default)' : ''}
                        </option>
                      ))}
                      {!availableModels.includes(model) && (
                        <option value={model}>
                          {model} (Current Active)
                        </option>
                      )}
                    </select>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. llama3.2:3b, gpt-4o, claude-3-5-sonnet-20241022, mistral-large-latest"
                    className="w-full text-xs font-mono rounded-md app-input p-2.5 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                )}
                <p className="text-[10px] text-[var(--text-muted)]">
                  Specifies which model to invoke on the server. Click &quot;Auto-Detect Live Models&quot; to inspect all models active on your account or local Ollama server.
                </p>
              </div>
            </div>

            {/* Collapsible Advanced Hyperparameters */}
            <div className="border-t border-[var(--border-subtle)] pt-3">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>Advanced Parameters (Temperature, Max Tokens, Custom Headers)</span>
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-2 text-xs">
                  {/* Temperature Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[var(--text-primary)]">Temperature</span>
                      <span className="font-mono text-[var(--accent)] font-bold">{temperature.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-[var(--accent)]"
                    />
                    <div className="flex justify-between text-[9px] text-[var(--text-muted)]">
                      <span>0.0 (Strict / Deterministic)</span>
                      <span>0.1 (Recommended for CVs)</span>
                      <span>1.0 (Creative)</span>
                    </div>
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[var(--text-primary)]">
                      Max Output Tokens
                    </label>
                    <input
                      type="number"
                      step="256"
                      min="512"
                      max="16384"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 4096)}
                      className="w-full text-xs font-mono rounded-md app-input p-2 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                    <p className="text-[10px] text-[var(--text-muted)]">
                      Cap on completion response length (default 4096).
                    </p>
                  </div>

                  {/* Custom Headers JSON */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-between">
                      <span>Custom HTTP Headers (Optional JSON)</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-normal">Useful for Azure OpenAI, LiteLLM, or corporate proxies</span>
                    </label>
                    <textarea
                      rows={2}
                      value={customHeadersStr}
                      onChange={(e) => setCustomHeadersStr(e.target.value)}
                      placeholder='{"X-My-Custom-Auth": "secret-value", "api-key": "azure-key"}'
                      className="w-full text-xs font-mono rounded-md app-input p-2 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Live Test Diagnostic Card */}
            {testResult && (
              <div
                className={`p-4 rounded-lg text-xs border space-y-2 transition-all ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                    <span>
                      {testResult.success
                        ? `Live Connection Verified: ${testResult.provider} (${testResult.model})`
                        : 'Connection Failed'}
                    </span>
                  </div>
                  {testResult.latencyMs !== undefined && (
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                      ⚡ {testResult.latencyMs}ms
                    </span>
                  )}
                </div>

                {testResult.success ? (
                  <div className="space-y-1 text-[11px] text-emerald-900 dark:text-emerald-300 font-mono">
                    <p className="font-sans font-medium">Model Response Verified:</p>
                    <pre className="p-2 rounded bg-emerald-950/20 border border-emerald-500/20 overflow-x-auto text-[10px]">
                      {testResult.responseSample}
                    </pre>
                  </div>
                ) : (
                  <div className="space-y-1 text-[11px] text-rose-800 dark:text-rose-300">
                    <p className="font-semibold">Error Details:</p>
                    <p className="font-mono text-[10px] bg-rose-950/20 p-2 rounded border border-rose-500/20 whitespace-pre-wrap">
                      {testResult.error}
                    </p>
                    <p className="text-[10px] text-rose-700 dark:text-rose-400">
                      Troubleshooting tip: If using Ollama, ensure &apos;ollama serve&apos; is running locally. If using cloud APIs, verify your API key and billing credits.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingLLM}
                className="w-full sm:w-auto btn-secondary text-xs flex items-center justify-center gap-2 px-4 py-2"
              >
                <Play className={`w-3.5 h-3.5 ${testingLLM ? 'animate-spin' : 'text-emerald-500'}`} />
                <span>{testingLLM ? 'Testing Connection...' : 'Test Connection & Ping'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingLLM}
                  className="w-full sm:w-auto btn-primary text-xs flex items-center justify-center gap-2 px-5 py-2 shadow-sm"
                >
                  <Save className={`w-3.5 h-3.5 ${savingLLM ? 'animate-spin' : ''}`} />
                  <span>{savingLLM ? 'Saving Configuration...' : 'Save LLM Configuration'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION C: Interactive Screening Playground */}
          <div className="app-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Play className="w-4 h-4 text-purple-500" />
                  <span>LLM Candidate Screening Playground</span>
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Verify how your connected model screens realistic candidate profiles before running bulk batches.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-md p-0.5 text-[11px]">
                <button
                  onClick={() => setPlaygroundMode('screening')}
                  className={`px-2.5 py-0.5 rounded transition-all ${
                    playgroundMode === 'screening'
                      ? 'bg-[var(--accent)] text-white font-medium'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Simulate CV Screening
                </button>
                <button
                  onClick={() => setPlaygroundMode('custom')}
                  className={`px-2.5 py-0.5 rounded transition-all ${
                    playgroundMode === 'custom'
                      ? 'bg-[var(--accent)] text-white font-medium'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Custom Prompt
                </button>
              </div>
            </div>

            {playgroundMode === 'custom' ? (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-[var(--text-primary)]">Custom Test Prompt</label>
                <textarea
                  rows={2}
                  value={playgroundUserPrompt}
                  onChange={(e) => setPlaygroundUserPrompt(e.target.value)}
                  className="w-full text-xs font-mono rounded-md app-input p-2.5 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
              </div>
            ) : (
              <div className="p-3 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] space-y-1">
                <p className="font-semibold text-[var(--text-primary)]">Test Scenario:</p>
                <p>
                  Screens a candidate with MySQL &amp; React experience against a <strong>Senior Cloud Engineer</strong> job requiring <strong>PostgreSQL, Docker, and React</strong> to test intelligent semantic transferability credit.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleRunPlayground}
                disabled={playgroundRunning}
                className="btn-primary text-xs flex items-center gap-2"
              >
                <Sparkles className={`w-3.5 h-3.5 ${playgroundRunning ? 'animate-spin' : ''}`} />
                <span>{playgroundRunning ? 'Evaluating Candidate Profile...' : 'Run Simulation'}</span>
              </button>
            </div>

            {playgroundResult && (
              <div className="mt-3 p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)]">
                  <span>Model: <strong>{playgroundResult.model}</strong> ({playgroundResult.provider})</span>
                  {playgroundResult.latencyMs && (
                    <span className="text-emerald-500 font-bold">Latency: {playgroundResult.latencyMs}ms</span>
                  )}
                </div>
                <div className="font-mono text-[11px] bg-[var(--bg-surface)] p-3 rounded border border-[var(--border-subtle)] max-h-60 overflow-y-auto whitespace-pre-wrap text-[var(--text-primary)]">
                  {playgroundResult.content || playgroundResult.error}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Screening Rubric Defaults */}
      {activeTab === 'rubrics' && (
        <div className="app-card p-6 space-y-6 text-xs">
          <div className="border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Screening Rubrics & Semantic Scoring Weights
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Set default thresholds and scoring category distribution applied to newly created job roles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-[var(--text-primary)]">Default Passing Threshold</label>
                <span className="font-mono font-bold text-[var(--accent)]">65 / 100</span>
              </div>
              <input
                type="range"
                min="40"
                max="90"
                defaultValue="65"
                className="w-full accent-[var(--accent)]"
              />
              <p className="text-[10px] text-[var(--text-muted)]">
                Candidates scoring at or above this threshold receive a POTENTIAL_MATCH or STRONG_MATCH recommendation.
              </p>
            </div>

            <div className="space-y-3">
              <label className="font-semibold text-[var(--text-primary)]">Category Scoring Weight Distribution</label>
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between items-center">
                  <span>Technical Skills &amp; Equivalents:</span>
                  <span className="font-mono font-semibold">40%</span>
                </div>
                <div className="w-full bg-[var(--bg-subtle)] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '40%' }} />
                </div>

                <div className="flex justify-between items-center">
                  <span>Years of Relevant Experience:</span>
                  <span className="font-mono font-semibold">30%</span>
                </div>
                <div className="w-full bg-[var(--bg-subtle)] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '30%' }} />
                </div>

                <div className="flex justify-between items-center">
                  <span>Education &amp; Credentials:</span>
                  <span className="font-mono font-semibold">15%</span>
                </div>
                <div className="w-full bg-[var(--bg-subtle)] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '15%' }} />
                </div>

                <div className="flex justify-between items-center">
                  <span>Domain Experience &amp; Context:</span>
                  <span className="font-mono font-semibold">15%</span>
                </div>
                <div className="w-full bg-[var(--bg-subtle)] rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '15%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-secondary)]">
              Want to customize semantic rules per job? Visit the Jobs &amp; Criteria page.
            </span>
            <Link href="/jobs" className="btn-secondary text-[11px]">
              Manage Jobs &amp; Rubrics →
            </Link>
          </div>
        </div>
      )}

      {/* TAB 3: System & Integrations Status */}
      {activeTab === 'system' && (
        <div className="app-card p-6 space-y-6 text-xs">
          <div className="border-b border-[var(--border-subtle)] pb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Recruitment Platform System Status
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Operational status of backend infrastructure, databases, and third-party webhooks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--text-primary)]">Supabase Database</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">PostgreSQL &amp; Storage</p>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium pt-1">
                Connected &amp; Healthy
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--text-primary)]">SMTP Outbox</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">smtp.gmail.com:587</p>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-medium pt-1">
                Real Delivery Active
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--text-primary)]">n8n Orchestration</span>
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <p className="text-[10px] text-[var(--text-muted)]">Automated Webhooks</p>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-medium pt-1">
                Ready for Triggers
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-secondary)]">
              Need to inspect or download n8n recruitment workflow canvases?
            </span>
            <Link href="/integrations" className="btn-secondary text-[11px] flex items-center gap-1.5">
              <Workflow className="w-3.5 h-3.5" />
              <span>n8n Workflows Hub →</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
