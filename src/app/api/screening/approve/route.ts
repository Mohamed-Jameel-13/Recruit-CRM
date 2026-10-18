import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { emailDispatcher, getAppBaseUrl } from '@/lib/email/dispatcher';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await db.ensureHydrated(true);
    const body = await req.json();
    const { applicationId, approvedBy } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required.' }, { status: 400 });
    }

    const updated = db.approveForAssessment(
      applicationId, 
      approvedBy || 'Admin User'
    );

    if (!updated) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    }

    // Automatically send assessment form invitation email to candidate
    const candidate = updated.candidate;
    const job = updated.job;
    const assignment = db.getAssessmentByApplicationId(applicationId);

    let emailSent = null;
    if (candidate && assignment) {
      emailSent = emailDispatcher.sendAssessmentInvitation({
        applicationId,
        candidateEmail: candidate.email,
        candidateName: `${candidate.first_name} ${candidate.last_name}`.trim(),
        jobTitle: job?.title || 'Senior Full-Stack Cloud Engineer',
        testUrl: assignment.assessment_url || `/assessment/take/${assignment.id}`,
        baseUrl: getAppBaseUrl(),
        passThreshold: assignment.pass_threshold_percentage || 70
      });
    }

    try {
      await db.persistStoreAsync();
    } catch {}

    return NextResponse.json({ 
      success: true, 
      application: updated, 
      assignment,
      emailSent: !!emailSent,
      emailReceipt: emailSent 
    });
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: 'Failed to approve application', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
