import { NextRequest, NextResponse } from 'next/server';
import { callUniversalLLM } from '@/lib/llm/client';
import { AssessmentQuestion } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const { 
      role = 'Senior Full-Stack Cloud Engineer', 
      type = 'mcq', 
      category = 'Architecture',
      instructions = '',
      difficulty = 'Senior'
    } = await req.json();

    const prompt = `You are a Principal Engineering Architect designing a technical assessment question for the job role: "${role}".
Question Type requested: "${type}" ('mcq' | 'subjective' | 'coding')
Difficulty Level: "${difficulty}"
Category/Focus: "${category}"
${instructions ? `Specific Instructions/Topic: "${instructions}"` : ''}

Generate an authentic, challenging, high-caliber engineering question with no fluff.
Respond ONLY with a valid JSON object matching the exact schema below for the requested type:

IF type is 'mcq':
{
  "title": string (concise scenario title),
  "category": string (e.g. Architecture, Concurrency, Database, DevOps, etc.),
  "type": "mcq",
  "points": 25,
  "description": string (the detailed technical problem scenario),
  "options": string[] (array of exactly 4 detailed, realistic choices A, B, C, D),
  "correct_option_index": number (0, 1, 2, or 3),
  "explanation": string (clear technical explanation of why the correct option is optimal)
}

IF type is 'subjective':
{
  "title": string (concise scenario title),
  "category": string,
  "type": "subjective",
  "points": 25,
  "description": string (the detailed system architecture or trade-off scenario),
  "placeholder": string (clear prompt hint for the candidate),
  "rubric": string (specific architectural concepts and edge cases required for 100% score),
  "sample_pass_answer": string (a comprehensive, production-grade reference answer),
  "sample_fail_answer": string (a shallow or naive answer that would fail)
}

IF type is 'coding':
{
  "title": string (concise problem title),
  "category": string (e.g. Algorithms, Data Structures, Concurrency),
  "type": "coding",
  "points": 25,
  "language": "typescript" or "python" or "go",
  "description": string (clear functional requirements, edge cases, and time/space complexity constraints),
  "starter_code": string (clean boilerplate skeleton with function signature and type hints),
  "test_cases": [
    {
      "input": string (sample input description/arguments),
      "expected_output": string (expected return value),
      "description": string (test scenario description),
      "is_hidden": false
    },
    {
      "input": string (edge case input),
      "expected_output": string (expected return value),
      "description": string (edge case test scenario),
      "is_hidden": true
    }
  ],
  "hints": string[] (1-2 subtle engineering hints),
  "rubric": string (evaluation criteria: time complexity, edge cases, error handling),
  "sample_pass_answer": string (complete, optimal implementation)
}

DO NOT include markdown code blocks like \`\`\`json. Return pure JSON.`;

    const response = await callUniversalLLM([
      { role: 'system', content: 'You are an elite Principal Technical Interviewer. Return only clean JSON without markdown code block syntax.' },
      { role: 'user', content: prompt }
    ]);

    let clean = response.content.trim();
    if (clean.startsWith('```json')) clean = clean.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (clean.startsWith('```')) clean = clean.replace(/^```/, '').replace(/```$/, '').trim();

    const parsedQuestion: AssessmentQuestion = JSON.parse(clean);
    parsedQuestion.id = 'q_' + Date.now();
    if (!parsedQuestion.type) parsedQuestion.type = type;
    if (!parsedQuestion.points) parsedQuestion.points = 25;

    return NextResponse.json({ success: true, question: parsedQuestion });
  } catch (err: unknown) {
    console.error('AI question generation error:', err);
    return NextResponse.json({
      error: 'Failed to generate question',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
