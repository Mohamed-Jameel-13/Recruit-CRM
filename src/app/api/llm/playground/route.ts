import { NextRequest, NextResponse } from 'next/server';
import { callUniversalLLM, getLLMConfigAsync } from '@/lib/llm/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const currentConfig = await getLLMConfigAsync();

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
      maxTokens: body.maxTokens !== undefined ? parseInt(body.maxTokens, 10) : 4096,
      customHeaders: body.customHeaders || currentConfig.customHeaders
    };

    const promptType = body.promptType || 'candidate_screening';

    let messages = [];
    if (promptType === 'candidate_screening') {
      messages = [
        {
          role: 'system' as const,
          content: `You are an expert HR Recruitment Architect evaluating technical CVs.
Respond with a strict JSON object:
{
  "matchScore": number (0-100),
  "recommendation": "STRONG_MATCH" | "POTENTIAL_MATCH" | "BORDERLINE" | "NOT_A_MATCH",
  "matchingSkills": string[],
  "transferableSkills": string[],
  "executiveSummary": string
}`
        },
        {
          role: 'user' as const,
          content: `Evaluate candidate for Senior Cloud Engineer (PostgreSQL, Docker, React, TypeScript).
Candidate resume highlights:
"5 years building scalable backend APIs in Node.js and TypeScript. Designed database schemas in MySQL with complex indexing and ACID transactions. Deployed containerized applications with Kubernetes and Docker. Developed web dashboards in React."`
        }
      ];
    } else {
      messages = [
        {
          role: 'system' as const,
          content: body.systemPrompt || 'You are an intelligent assistant.'
        },
        {
          role: 'user' as const,
          content: body.userPrompt || 'Say hello and verify connection.'
        }
      ];
    }

    const result = await callUniversalLLM(messages, testConfig);

    return NextResponse.json({
      success: true,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      content: result.content
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }, { status: 400 });
  }
}
