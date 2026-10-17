import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignment = db.getAssessmentById(id);

    if (!assignment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const application = db.getApplicationById(assignment.application_id);
    const candidate = application?.candidate || null;
    const job = application?.job || null;

    const rawConfig = db.getAssessmentConfig(assignment.config_id || job?.assessment_config_id || job?.title);
    const sanitizedConfig = {
      id: rawConfig.id,
      title: rawConfig.title,
      role: rawConfig.role,
      mode: rawConfig.mode,
      duration_minutes: rawConfig.duration_minutes || 45,
      pass_threshold_percentage: assignment.pass_threshold_percentage || rawConfig.pass_threshold_percentage || 70,
      questions: (rawConfig.questions || []).map(q => ({
        id: q.id,
        type: q.type || 'subjective',
        title: q.title,
        category: q.category,
        description: q.description,
        points: q.points || 25,
        options: q.options || [],
        placeholder: q.placeholder || '',
        language: q.language || 'typescript',
        starter_code: q.starter_code || q.placeholder || '',
        test_cases: (q.test_cases || []).filter(tc => !tc.is_hidden),
        hints: q.hints || []
      }))
    };

    return NextResponse.json({
      success: true,
      assessment: assignment,
      candidate,
      job,
      application,
      config: sanitizedConfig
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: 'Failed to retrieve assessment',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
