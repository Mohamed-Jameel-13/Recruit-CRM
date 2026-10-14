import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assignmentId, score, maxScore, notes, enteredBy } = body;

    if (!assignmentId || score === undefined) {
      return NextResponse.json({ 
        error: 'Assignment ID and score are required.' 
      }, { status: 400 });
    }

    const numScore = parseFloat(score);
    const numMax = maxScore ? parseFloat(maxScore) : 100;

    if (isNaN(numScore) || numScore < 0) {
      return NextResponse.json({ error: 'Score must be a positive number.' }, { status: 400 });
    }

    const updated = db.saveAssessmentResult(assignmentId, {
      score: numScore,
      maxScore: numMax,
      source: 'manual_entry',
      verified: true,
      verifiedBy: enteredBy || 'Recruiter User',
      details: { notes }
    });

    if (!updated) {
      return NextResponse.json({ error: 'Assessment assignment not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, assessment: updated });
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: 'Failed to record manual assessment result', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
