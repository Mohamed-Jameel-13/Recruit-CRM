import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookRequest } from '@/lib/n8n/auth';
import { db } from '@/lib/db/repository';

export async function POST(req: NextRequest) {
  const auth = verifyWebhookRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { candidateEmail, score, maxScore, source, rawPayload } = body;

    if (!candidateEmail || score === undefined) {
      return NextResponse.json({ 
        error: 'Candidate email and score are required in webhook payload.' 
      }, { status: 400 });
    }

    const applications = db.getApplications();
    const app = applications.find(
      a => a.candidate?.email.toLowerCase() === candidateEmail.toLowerCase()
    );

    if (!app) {
      return NextResponse.json({ 
        error: `No open application found for candidate email: ${candidateEmail}` 
      }, { status: 404 });
    }

    let assignment = db.getAssessments().find(a => a.application_id === app.id);
    if (!assignment) {
      db.approveForAssessment(app.id, 'Webhook Automation Sync');
      assignment = db.getAssessments().find(a => a.application_id === app.id);
    }

    if (assignment) {
      const updated = db.saveAssessmentResult(assignment.id, {
        score: parseFloat(score),
        maxScore: maxScore ? parseFloat(maxScore) : 100,
        source: source || 'n8n_google_sync',
        verified: true,
        verifiedBy: 'n8n Webhook Sync',
        details: rawPayload
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Assessment result synchronized successfully.',
        assignment: updated 
      });
    }

    return NextResponse.json({ error: 'Failed to find or create assignment.' }, { status: 500 });
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: 'Failed to process webhook payload', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
