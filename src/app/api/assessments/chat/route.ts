import { NextRequest, NextResponse } from 'next/server';
import { callUniversalLLM, ChatMessage } from '@/lib/llm/client';
import { AssessmentConfig, AssessmentQuestion } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const { 
      message, 
      history = [], 
      currentAssessment 
    } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const assessmentSummary = currentAssessment ? {
      title: currentAssessment.title,
      role: currentAssessment.role,
      duration_minutes: currentAssessment.duration_minutes,
      pass_threshold_percentage: currentAssessment.pass_threshold_percentage,
      questionsCount: currentAssessment.questions?.length || 0,
      existingQuestions: (currentAssessment.questions || []).map((q: AssessmentQuestion, idx: number) => ({
        index: idx + 1,
        title: q.title,
        type: q.type,
        category: q.category,
        points: q.points
      }))
    } : null;

    const systemPrompt = `You are RecruitAI Assessment Copilot, a world-class Principal Technical Assessment Architect.
Your mission is to help the recruiter dynamically create, refine, and balance technical challenges for any engineering role.

CURRENT ASSESSMENT CONTEXT:
${JSON.stringify(assessmentSummary, null, 2)}

You can generate all types of questions:
1. 'mcq': 4 options (A-D), 1 correct_option_index (0-3), and clear technical explanation.
2. 'subjective': Open-ended architecture, system design, or engineering trade-off scenario with rubric and sample pass/fail answers.
3. 'coding': Algorithmic or real-world coding challenge with language, starter_code, test_cases (inputs/expected_output), rubric, and sample_pass_answer.

INSTRUCTIONS:
- If the user asks to add questions (e.g. "Add 2 MCQs on PostgreSQL locks", "Add a coding problem for LRU cache", "Add an architecture question on Kafka"), generate high-caliber questions and set action="ADD_QUESTIONS".
- If the user asks to completely rebuild or replace the assessment (e.g. "Make this a full 4-question DevOps assessment"), generate the complete question suite and set action="REPLACE_ALL".
- If the user asks to change time limit, pass threshold, title, or target role, set action="UPDATE_CONFIG" (or combine with ADD_QUESTIONS if they also asked for questions).
- If the user is asking for architectural advice, review, or feedback without generating questions, set action="NONE".

Return ONLY valid JSON matching this schema:
{
  "reply": string (warm, professional, concise explanation of what was created or suggested),
  "action": "ADD_QUESTIONS" | "REPLACE_ALL" | "UPDATE_CONFIG" | "NONE",
  "generatedQuestions": [ ...array of AssessmentQuestion objects matching the TypeScript schema if action is ADD_QUESTIONS or REPLACE_ALL... ],
  "configUpdates": {
    "title"?: string,
    "role"?: string,
    "duration_minutes"?: number,
    "pass_threshold_percentage"?: number
  }
}

DO NOT wrap in markdown codeblocks. Return pure JSON.`;

    const llmMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map((h: { role: string; content: string }) => ({
        role: h.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: h.content
      })),
      { role: 'user', content: message }
    ];

    const response = await callUniversalLLM(llmMessages);

    let clean = response.content.trim();
    if (clean.startsWith('```json')) clean = clean.replace(/^```json/, '').replace(/```$/, '').trim();
    else if (clean.startsWith('```')) clean = clean.replace(/^```/, '').replace(/```$/, '').trim();

    try {
      const parsed = JSON.parse(clean);
      if (parsed.generatedQuestions && Array.isArray(parsed.generatedQuestions)) {
        parsed.generatedQuestions = parsed.generatedQuestions.map((q: AssessmentQuestion, i: number) => ({
          ...q,
          id: q.id || `q_chat_${Date.now()}_${i}`
        }));
      }
      return NextResponse.json({ success: true, ...parsed });
    } catch {
      // Fallback if LLM returned plain text instead of JSON
      return NextResponse.json({
        success: true,
        reply: clean,
        action: 'NONE',
        generatedQuestions: []
      });
    }
  } catch (err: unknown) {
    console.error('Assessment Copilot Chat Error:', err);
    return NextResponse.json({
      error: 'Failed to process chat message',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
