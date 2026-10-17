import { NextRequest, NextResponse } from 'next/server';
import { getLLMConfig, saveLLMConfig, PROVIDER_PRESETS } from '@/lib/llm/client';

export async function GET() {
  const config = getLLMConfig();
  
  // Format masked key for UI display (e.g. AIza••••••••k3Q)
  let maskedKey = '';
  if (config.apiKey) {
    if (config.apiKey.length <= 8) {
      maskedKey = '••••••••';
    } else {
      maskedKey = `${config.apiKey.substring(0, 4)}••••••••${config.apiKey.substring(config.apiKey.length - 4)}`;
    }
  }

  return NextResponse.json({
    config: {
      provider: config.provider,
      baseUrl: config.baseUrl,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens || 4096,
      customHeaders: config.customHeaders || {},
      apiKeyMasked: maskedKey,
      hasKey: !!config.apiKey
    },
    presets: PROVIDER_PRESETS
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const updated = saveLLMConfig({
      provider: body.provider,
      baseUrl: body.baseUrl?.trim(),
      apiKey: body.apiKey,
      clearApiKey: body.clearApiKey === true,
      model: body.model?.trim(),
      temperature: body.temperature !== undefined ? parseFloat(body.temperature) : 0.1,
      maxTokens: body.maxTokens !== undefined ? parseInt(body.maxTokens, 10) : 4096,
      customHeaders: body.customHeaders
    });

    let maskedKey = '';
    if (updated.apiKey) {
      if (updated.apiKey.length <= 8) {
        maskedKey = '••••••••';
      } else {
        maskedKey = `${updated.apiKey.substring(0, 4)}••••••••${updated.apiKey.substring(updated.apiKey.length - 4)}`;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Connected to ${updated.provider} using model ${updated.model}.`,
      config: {
        provider: updated.provider,
        baseUrl: updated.baseUrl,
        model: updated.model,
        temperature: updated.temperature,
        maxTokens: updated.maxTokens,
        apiKeyMasked: maskedKey,
        hasKey: !!updated.apiKey
      }
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: 'Failed to update LLM configuration',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
