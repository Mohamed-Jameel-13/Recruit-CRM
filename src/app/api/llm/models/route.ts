import { NextRequest, NextResponse } from 'next/server';
import { fetchAvailableModels, getLLMConfigAsync, sanitizeBaseUrl } from '@/lib/llm/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const currentConfig = await getLLMConfigAsync();

    let apiKey = body.apiKey;
    if (apiKey === undefined || apiKey === null || apiKey === '' || apiKey === '__KEEP_EXISTING__') {
      apiKey = currentConfig.apiKey;
    }

    const result = await fetchAvailableModels({
      provider: body.provider || currentConfig.provider,
      baseUrl: sanitizeBaseUrl(body.baseUrl || currentConfig.baseUrl),
      apiKey: apiKey,
      model: body.model || currentConfig.model,
      customHeaders: body.customHeaders || currentConfig.customHeaders
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      models: []
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await fetchAvailableModels();
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      models: []
    }, { status: 500 });
  }
}
