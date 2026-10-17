import { NextRequest, NextResponse } from 'next/server';
import { callUniversalLLM, getLLMConfigAsync } from '@/lib/llm/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const currentConfig = await getLLMConfigAsync();

    // If apiKey is omitted or blank or '__KEEP_EXISTING__', use currently configured key
    let apiKey = body.apiKey;
    if (apiKey === undefined || apiKey === null || apiKey === '' || apiKey === '__KEEP_EXISTING__') {
      apiKey = currentConfig.apiKey;
    }

    const testConfig = {
      provider: body.provider || currentConfig.provider,
      baseUrl: body.baseUrl?.trim() || currentConfig.baseUrl,
      apiKey: apiKey?.trim(),
      model: body.model?.trim() || currentConfig.model,
      temperature: body.temperature !== undefined ? parseFloat(body.temperature) : 0.1,
      customHeaders: body.customHeaders || currentConfig.customHeaders
    };

    const result = await callUniversalLLM(
      [
        {
          role: 'system',
          content: 'You are a recruitment screening AI engine test probe. Respond strictly with a JSON object: {"status":"connected","engine":"RecruitAI","verified":true,"notes":"LLM API connection established successfully"}'
        },
        {
          role: 'user',
          content: 'Health check probe: are you online and capable of structured JSON candidate scoring?'
        }
      ],
      testConfig
    );

    return NextResponse.json({
      success: true,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      responseSample: result.content.substring(0, 400)
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('LLM connection test failed:', errorMessage);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 400 });
  }
}
