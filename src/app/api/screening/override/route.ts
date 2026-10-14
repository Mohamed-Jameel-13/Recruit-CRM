import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { screeningRunId, overrideRecommendation, reason, overrideBy } = body;

    if (!screeningRunId || !overrideRecommendation || !reason) {
      return NextResponse.json({ 
        error: 'Screening run ID, override recommendation, and mandatory reason are required.' 
      }, { status: 400 });
    }

    const updated = db.overrideScreening(
      screeningRunId,
      overrideRecommendation,
      reason,
      overrideBy || 'Admin Reviewer'
    );

    if (!updated) {
      return NextResponse.json({ error: 'Screening run record not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, screeningRun: updated });
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: 'Failed to record override', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
