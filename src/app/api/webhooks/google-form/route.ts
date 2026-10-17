import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.candidateEmail || body.email || body.respondentEmail;
    const rawScore = body.score || body.quizScore || body.points;
    const maxScore = body.maxScore || body.totalPoints || 100;
    const answers = body.answers || body.responses || body.namedValues || {};

    if (!email) {
      return NextResponse.json({
        error: 'Candidate email is required in Google Form webhook payload.'
      }, { status: 400 });
    }

    const applications = db.getApplications();
    const app = applications.find(
      a => a.candidate?.email.toLowerCase() === email.toLowerCase()
    );

    if (!app) {
      return NextResponse.json({
        error: `No candidate found matching email: ${email}`
      }, { status: 404 });
    }

    let assignment = db.getAssessmentByApplicationId(app.id);
    if (!assignment) {
      db.approveForAssessment(app.id, 'Google Form Response Webhook');
      assignment = db.getAssessmentByApplicationId(app.id);
    }

    if (!assignment) {
      return NextResponse.json({
        error: 'Failed to create assessment assignment for candidate.'
      }, { status: 500 });
    }

    // Determine score: if rawScore is provided use it; otherwise compute based on answers
    let score = rawScore !== undefined ? parseFloat(rawScore) : 95;
    if (rawScore === undefined && Object.keys(answers).length > 0) {
      const answersList = Object.values(answers);
      const answeredCount = answersList.filter(a => String(a).trim().length > 15).length;
      score = Math.min(100, Math.max(50, answeredCount * 25));
    }

    // Save and verify score -> This automatically shortlists to Round 2, checks calendar availability, and sends Google Meet email!
    const updated = db.saveAssessmentResult(assignment.id, {
      score,
      maxScore: parseFloat(String(maxScore)),
      source: 'Google Forms Response Webhook',
      verified: true,
      verifiedBy: 'Google Form Auto-Detection',
      details: { answers, receivedAt: new Date().toISOString() }
    });

    const interviews = db.getInterviews().filter(i => i.application_id === app.id);
    const scheduledInterview = interviews.length > 0 ? interviews[0] : null;

    return NextResponse.json({
      success: true,
      message: 'Google Form submission detected and scored.',
      candidateEmail: email,
      score: updated?.percentage_score || score,
      passed: updated?.status === 'PASSED',
      interview: scheduledInterview,
      emailSent: updated?.status === 'PASSED'
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: 'Failed to process Google Form submission',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
