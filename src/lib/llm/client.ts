import fs from 'fs';
import path from 'path';

export type LLMProviderId =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'openrouter'
  | 'deepseek'
  | 'mistral'
  | 'ollama'
  | 'lmstudio'
  | 'custom'
  | 'openai_compatible';

export interface LLMConfig {
  provider: LLMProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens?: number;
  customHeaders?: Record<string, string>;
}

export interface ProviderPreset {
  id: LLMProviderId;
  name: string;
  category: 'cloud' | 'local' | 'aggregator';
  badge: string;
  description: string;
  defaultBaseUrl: string;
  defaultModel: string;
  popularModels: string[];
  requiresApiKey: boolean;
  keyPlaceholder: string;
  keyUrl?: string;
  iconName?: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    category: 'cloud',
    badge: 'Fast & Multimodal',
    description: 'Direct integration with Google Generative AI & Gemini 2.5/2.0 Flash models.',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.5-flash',
    popularModels: [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-2.0-flash-lite'
    ],
    requiresApiKey: true,
    keyPlaceholder: 'AIzaSy...',
    keyUrl: 'https://aistudio.google.com/app/apikey'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    category: 'cloud',
    badge: 'Industry Standard',
    description: 'GPT-4o, GPT-4o-mini, o3-mini, and OpenAI official reasoning models.',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    popularModels: [
      'gpt-4o-mini',
      'gpt-4o',
      'o3-mini',
      'o1',
      'gpt-4-turbo'
    ],
    requiresApiKey: true,
    keyPlaceholder: 'sk-proj-...',
    keyUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    category: 'cloud',
    badge: 'Top Reasoning',
    description: 'Claude 3.7 Sonnet, Claude 3.5 Sonnet, and Claude 3.5 Haiku via native Messages API.',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    popularModels: [
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229'
    ],
    requiresApiKey: true,
    keyPlaceholder: 'sk-ant-api03-...',
    keyUrl: 'https://console.anthropic.com/settings/keys'
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    category: 'cloud',
    badge: 'Ultra Fast (Free Tier)',
    description: 'Sub-second inference speed powered by LPU hardware running Llama 3.3 70B & Mixtral.',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    popularModels: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'deepseek-r1-distill-llama-70b',
      'gemma2-9b-it'
    ],
    requiresApiKey: true,
    keyPlaceholder: 'gsk_...',
    keyUrl: 'https://console.groq.com/keys'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    category: 'cloud',
    badge: 'Affordable & Smart',
    description: 'DeepSeek-V3 Chat & DeepSeek-R1 Deep Thinking models via standard API.',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    popularModels: [
      'deepseek-chat',
      'deepseek-reasoner'
    ],
    requiresApiKey: true,
    keyPlaceholder: 'sk-...',
    keyUrl: 'https://platform.deepseek.com/api_keys'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    category: 'aggregator',
    badge: '200+ Models',
    description: 'One key to route across Claude, GPT, Llama, DeepSeek, Mistral, and open-source LLMs.',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    popularModels: [
      'meta-llama/llama-3.3-70b-instruct',
      'anthropic/claude-3.5-sonnet',
      'deepseek/deepseek-chat',
      'openai/gpt-4o-mini',
      'google/gemini-2.0-flash-exp:free',
      'mistralai/mistral-large-2411'
    ],
    requiresApiKey: true,
    keyPlaceholder: 'sk-or-v1-...',
    keyUrl: 'https://openrouter.ai/keys'
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    category: 'cloud',
    badge: 'European Frontier AI',
    description: 'Mistral Large, Codestral, and open-weight models hosted on Mistral platform.',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    popularModels: [
      'mistral-large-latest',
      'mistral-small-latest',
      'codestral-latest',
      'open-mixtral-8x22b'
    ],
    requiresApiKey: true,
    keyPlaceholder: 'sk-...',
    keyUrl: 'https://console.mistral.ai/api-keys/'
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    category: 'local',
    badge: 'Offline & 100% Private',
    description: 'Run local LLMs with zero cloud cost and full data confidentiality on your workstation.',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    popularModels: [
      'llama3.2',
      'llama3.1:8b',
      'mistral',
      'deepseek-r1:8b',
      'qwen2.5:7b',
      'phi3'
    ],
    requiresApiKey: false,
    keyPlaceholder: 'Not needed for local Ollama'
  },
  {
    id: 'lmstudio',
    name: 'LM Studio / LocalAI',
    category: 'local',
    badge: 'Local Inference Server',
    description: 'Local UI server running GGUF/HF models locally via OpenAI-compatible endpoints.',
    defaultBaseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    popularModels: ['local-model'],
    requiresApiKey: false,
    keyPlaceholder: 'Optional (typically not needed)'
  },
  {
    id: 'custom',
    name: 'Custom / Enterprise API',
    category: 'cloud',
    badge: 'Any Endpoint',
    description: 'Connect any OpenAI-compatible proxy, Azure OpenAI, vLLM, LiteLLM, or internal gateway.',
    defaultBaseUrl: 'https://api.mycompany.com/v1',
    defaultModel: 'custom-model',
    popularModels: ['custom-model'],
    requiresApiKey: true,
    keyPlaceholder: 'Bearer token or custom key'
  }
];

const isTestEnv = typeof process !== 'undefined' && (!!process.env.VITEST || process.env.NODE_ENV === 'test');
const CONFIG_PATH = isTestEnv
  ? path.resolve(process.cwd(), '.data', 'test_llm_config.json')
  : path.resolve(process.cwd(), '.data', 'llm_config.json');

// Default fallback configuration
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'openai_compatible',
  baseUrl: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
  apiKey: process.env.LLM_API_KEY || '',
  model: process.env.LLM_MODEL || 'llama3.2',
  temperature: 0.1,
  maxTokens: 4096
};

export function getLLMConfig(): LLMConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        return { ...DEFAULT_LLM_CONFIG, ...parsed };
      }
    }
  } catch (err) {
    console.error('Failed reading LLM configuration:', err);
  }

  // Check if GEMINI_API_KEY is configured in env
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    return {
      provider: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-2.5-flash',
      temperature: 0.1,
      maxTokens: 4096
    };
  }

  return DEFAULT_LLM_CONFIG;
}

export function saveLLMConfig(newConfig: Partial<LLMConfig> & { clearApiKey?: boolean }): LLMConfig {
  const current = getLLMConfig();
  
  let apiKeyToSave = current.apiKey;
  if (newConfig.clearApiKey) {
    apiKeyToSave = '';
  } else if (
    newConfig.apiKey !== undefined &&
    newConfig.apiKey !== '__KEEP_EXISTING__' &&
    newConfig.apiKey.trim() !== ''
  ) {
    apiKeyToSave = newConfig.apiKey.trim();
  }

  const updated: LLMConfig = {
    ...current,
    ...newConfig,
    apiKey: apiKeyToSave,
  };

  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed saving LLM configuration:', err);
  }

  return updated;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Universal LLM caller: supports ANY OpenAI-compatible API endpoint,
 * native Anthropic Claude Messages API, Google Gemini, Ollama, Groq, OpenRouter, etc.
 */
export async function callUniversalLLM(
  messages: ChatMessage[],
  configOverrides?: Partial<LLMConfig>
): Promise<{ content: string; model: string; provider: string; latencyMs: number }> {
  const config = { ...getLLMConfig(), ...configOverrides };
  const startTime = Date.now();
  const activeModel = config.model || 'gemini-2.5-flash';

  // 1. Google Gemini (Native SDK)
  if (
    config.provider === 'gemini' &&
    config.apiKey &&
    !config.baseUrl.includes('localhost') &&
    !config.baseUrl.includes('127.0.0.1') &&
    !config.baseUrl.endsWith('/openai') &&
    !config.baseUrl.endsWith('/openai/v1')
  ) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.apiKey);
    
    const genConfig: any = {
      responseMimeType: 'application/json',
      temperature: config.temperature ?? 0.1,
    };
    if (activeModel.includes('thinking')) {
      genConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const model = genAI.getGenerativeModel({
      model: activeModel,
      generationConfig: genConfig,
    });

    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const userMsg = messages.filter(m => m.role !== 'system').map(m => m.content).join('\n\n');
    const fullPrompt = systemMsg ? `${systemMsg}\n\n${userMsg}` : userMsg;

    console.log(`\n============================================================`);
    console.log(`🤖 [AI Call] Provider: Google Gemini | Model: ${activeModel}`);
    console.log(`   Prompt Size: ${fullPrompt.length} chars | Temp: ${config.temperature ?? 0.1}`);

    try {
      const res = await model.generateContent(fullPrompt);
      const content = res.response.text();
      const latencyMs = Date.now() - startTime;
      console.log(`⚡ [AI Call] Success in ${latencyMs}ms (${content.length} chars generated)`);
      console.log(`============================================================\n`);
      return {
        content,
        model: activeModel,
        provider: 'Google Gemini',
        latencyMs,
      };
    } catch (geminiErr: unknown) {
      console.error(`❌ [Google Gemini API Error]:`, geminiErr instanceof Error ? geminiErr.message : String(geminiErr));
      throw geminiErr;
    }
  }

  // 2. Anthropic Claude (Native Messages API)
  if (
    config.provider === 'anthropic' ||
    config.baseUrl.includes('api.anthropic.com')
  ) {
    let endpoint = config.baseUrl.trim().replace(/\/+$/, '');
    if (!endpoint.endsWith('/messages')) {
      if (endpoint.endsWith('/v1')) {
        endpoint += '/messages';
      } else {
        endpoint += '/v1/messages';
      }
    }

    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const anthropicMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

    const payload = {
      model: activeModel || 'claude-3-5-sonnet-20241022',
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature ?? 0.1,
      system: systemMsg,
      messages: anthropicMessages
    };

    console.log(`\n============================================================`);
    console.log(`🤖 [AI Call] Provider: Anthropic Claude | Model: ${payload.model} | Endpoint: ${endpoint}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey.trim(),
          'anthropic-version': '2023-06-01',
          ...(config.customHeaders || {})
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Anthropic Claude API failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const content = data.content?.[0]?.text || '';
      const latencyMs = Date.now() - startTime;
      console.log(`⚡ [AI Call] Success in ${latencyMs}ms (${content.length} chars generated)`);
      console.log(`============================================================\n`);

      return {
        content,
        model: payload.model,
        provider: 'Anthropic Claude',
        latencyMs
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  // 3. Universal OpenAI-Compatible API Protocol
  // Works with OpenAI, Groq, OpenRouter, DeepSeek, Mistral, Ollama, LM Studio, vLLM, LiteLLM, etc.
  let endpoint = config.baseUrl.trim();
  if (!endpoint.endsWith('/chat/completions')) {
    endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey && config.apiKey.trim()) {
    headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
  }

  // OpenRouter recommended identification headers
  if (endpoint.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://recruitaipipeline.com';
    headers['X-Title'] = 'RecruitAI CV Screener';
  }

  // Merge any custom headers (e.g. for enterprise gateways or Azure OpenAI)
  if (config.customHeaders) {
    Object.assign(headers, config.customHeaders);
  }

  const payload: any = {
    model: activeModel || 'llama3.2',
    messages,
    temperature: config.temperature ?? 0.1,
  };

  if (config.maxTokens) {
    payload.max_tokens = config.maxTokens;
  }

  // Attempt json_object response format if model supports it
  if (
    activeModel.includes('gpt') ||
    activeModel.includes('claude') ||
    activeModel.includes('groq') ||
    activeModel.includes('llama-3') ||
    activeModel.includes('deepseek') ||
    activeModel.includes('mistral')
  ) {
    payload.response_format = { type: 'json_object' };
  }

  console.log(`\n============================================================`);
  console.log(`🤖 [AI Call] Universal OpenAI Endpoint: ${endpoint}`);
  console.log(`   Model: ${payload.model} | Temp: ${payload.temperature}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    let res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    // If 400 occurred and response_format was specified, retry once without response_format
    if (!res.ok && res.status === 400 && payload.response_format) {
      delete payload.response_format;
      res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM API request to ${endpoint} failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    let content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
    
    // Fallback for reasoning models like DeepSeek R1 if content is in reasoning_content
    if (!content && data.choices?.[0]?.message?.reasoning_content) {
      content = data.choices[0].message.reasoning_content;
    }

    const latencyMs = Date.now() - startTime;
    console.log(`⚡ [AI Call] Success in ${latencyMs}ms (${content.length} chars)`);
    console.log(`============================================================\n`);

    const providerLabel = config.baseUrl.includes('localhost') || config.baseUrl.includes('127.0.0.1')
      ? 'Local LLM (Ollama/LM Studio)'
      : config.baseUrl.includes('groq')
      ? 'Groq Cloud'
      : config.baseUrl.includes('openrouter')
      ? 'OpenRouter'
      : config.baseUrl.includes('openai.com')
      ? 'OpenAI'
      : config.baseUrl.includes('deepseek')
      ? 'DeepSeek'
      : config.baseUrl.includes('mistral')
      ? 'Mistral AI'
      : 'OpenAI-Compatible Custom Endpoint';

    return {
      content,
      model: payload.model,
      provider: providerLabel,
      latencyMs,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Dynamically queries the configured (or passed) provider endpoint to list available models
 */
export async function fetchAvailableModels(
  testConfig?: Partial<LLMConfig>
): Promise<{ success: boolean; models: string[]; error?: string }> {
  const config = { ...getLLMConfig(), ...testConfig };
  const provider = config.provider;
  const baseUrl = config.baseUrl.trim();
  const apiKey = config.apiKey.trim();

  try {
    // 1. Ollama (Local)
    if (provider === 'ollama' || baseUrl.includes('11434')) {
      const host = baseUrl.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
      const ollamaTagsUrl = `${host}/api/tags`;
      const res = await fetch(ollamaTagsUrl, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        const models = (data.models || []).map((m: any) => m.name || m.model).filter(Boolean);
        if (models.length > 0) return { success: true, models };
      }
    }

    // 2. Anthropic
    if (provider === 'anthropic' || baseUrl.includes('anthropic.com')) {
      if (!apiKey) return { success: false, error: 'API key required to list Anthropic models', models: [] };
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const data = await res.json();
        const models = (data.data || []).map((m: any) => m.id).filter(Boolean);
        if (models.length > 0) return { success: true, models };
      }
    }

    // 3. Google Gemini
    if (provider === 'gemini' || baseUrl.includes('generativelanguage.googleapis.com')) {
      if (!apiKey) return { success: false, error: 'API key required to list Gemini models', models: [] };
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const data = await res.json();
        const models = (data.models || [])
          .map((m: any) => m.name.replace(/^models\//, ''))
          .filter((m: string) => m.includes('gemini'));
        if (models.length > 0) return { success: true, models };
      }
    }

    // 4. Standard OpenAI-Compatible /models endpoint (OpenAI, Groq, OpenRouter, DeepSeek, Mistral, LM Studio)
    let modelsEndpoint = baseUrl.replace(/\/chat\/completions\/?$/, '').replace(/\/+$/, '');
    if (!modelsEndpoint.endsWith('/models')) {
      modelsEndpoint += '/models';
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(modelsEndpoint, {
      headers,
      signal: AbortSignal.timeout(6000)
    });

    if (res.ok) {
      const data = await res.json();
      const rawList = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      const models = rawList.map((m: any) => m.id || m.name || m).filter(Boolean);
      if (models.length > 0) {
        return { success: true, models: Array.from(new Set(models)) };
      }
    }

    // Fallback to preset popular models if available
    const preset = PROVIDER_PRESETS.find(p => p.id === provider);
    return {
      success: true,
      models: preset?.popularModels || [config.model || 'llama3.2']
    };
  } catch (err: unknown) {
    const preset = PROVIDER_PRESETS.find(p => p.id === provider);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      models: preset?.popularModels || [config.model || 'llama3.2']
    };
  }
}
