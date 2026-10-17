import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookRequest } from '@/lib/n8n/auth';
import { db } from '@/lib/db/repository';

export async function GET(req: NextRequest) {
  const auth = verifyWebhookRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const assessments = db.getAssessments();
    const applications = db.getApplications();

    const pending = assessments.filter(a => a.status !== 'PASSED' && a.status !== 'FAILED');
    const formatted = pending.map(item => {
      const app = applications.find(a => a.id === item.application_id);
      return {
        assignment_id: item.id,
        application_id: item.application_id,
        candidate_name: app?.candidate ? `${app.candidate.first_name} ${app.candidate.last_name}` : 'Applicant',
        candidate_email: app?.candidate?.email || 'unknown@example.com',
        job_title: app?.job?.title || 'Engineer',
        assessment_url: item.assessment_url,
        due_date: item.due_date,
        status: item.status
      };
    });

    return NextResponse.json({
      success: true,
      count: formatted.length,
      data: formatted
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: 'Failed to retrieve overdue assessments',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
