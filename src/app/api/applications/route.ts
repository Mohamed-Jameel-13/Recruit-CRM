import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId') || undefined;
  const stage = searchParams.get('stage') || undefined;
  const screeningStatus = searchParams.get('screeningStatus') || undefined;

  const applications = db.getApplications({
    jobId: jobId === 'all' ? undefined : jobId,
    stage: stage === 'all' ? undefined : stage,
    screeningStatus: screeningStatus === 'all' ? undefined : screeningStatus
  });

  return NextResponse.json({ applications });
}
