import { describe, it, expect, beforeEach } from 'vitest';
import { getLLMConfig, saveLLMConfig, PROVIDER_PRESETS, fetchAvailableModels } from '../llm/client';

describe('Universal LLM Configuration & Client Suite', () => {
  beforeEach(() => {
    // Reset to test configuration
    saveLLMConfig({
      provider: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test-mock-key-12345678',
      model: 'gpt-4o-mini',
      temperature: 0.1
    });
  });

  it('should provide presets for all major LLM providers including Gemini, Claude, OpenAI, Groq, Ollama', () => {
    const presetIds = PROVIDER_PRESETS.map(p => p.id);
    expect(presetIds).toContain('gemini');
    expect(presetIds).toContain('openai');
    expect(presetIds).toContain('anthropic');
    expect(presetIds).toContain('groq');
    expect(presetIds).toContain('openrouter');
    expect(presetIds).toContain('deepseek');
    expect(presetIds).toContain('mistral');
    expect(presetIds).toContain('ollama');
    expect(presetIds).toContain('lmstudio');
    expect(presetIds).toContain('custom');
  });

  it('should save and retrieve LLM configuration properly', () => {
    const updated = saveLLMConfig({
      provider: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2
    });

    expect(updated.provider).toBe('groq');
    expect(updated.baseUrl).toBe('https://api.groq.com/openai/v1');
    expect(updated.model).toBe('llama-3.3-70b-versatile');
    expect(updated.temperature).toBe(0.2);

    const retrieved = getLLMConfig();
    expect(retrieved.provider).toBe('groq');
    expect(retrieved.model).toBe('llama-3.3-70b-versatile');
  });

  it('should NEVER wipe existing API key when saving partial settings without new key', () => {
    // Save initial key
    saveLLMConfig({
      apiKey: 'sk-secret-permanent-key-9999'
    });

    // Update only the model and temperature without providing apiKey
    const result = saveLLMConfig({
      model: 'gpt-4o',
      temperature: 0.05
    });

    expect(result.apiKey).toBe('sk-secret-permanent-key-9999');
    expect(result.model).toBe('gpt-4o');

    const loaded = getLLMConfig();
    expect(loaded.apiKey).toBe('sk-secret-permanent-key-9999');
  });

  it('should allow explicitly clearing the API key when requested', () => {
    saveLLMConfig({
      apiKey: 'sk-to-be-cleared'
    });

    saveLLMConfig({
      clearApiKey: true
    });

    const loaded = getLLMConfig();
    expect(loaded.apiKey).toBe('');
  });

  it('should provide popular model fallbacks during model discovery', async () => {
    const result = await fetchAvailableModels({
      provider: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: 'fake-key-for-fallback'
    });

    expect(result.models).toBeDefined();
    expect(result.models.length).toBeGreaterThan(0);
  });
});
