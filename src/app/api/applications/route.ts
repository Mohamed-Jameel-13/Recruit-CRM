import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  await db.ensureHydrated(true);
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId') || undefined;
  const stage = searchParams.get('stage') || undefined;
  const screeningStatus = searchParams.get('screeningStatus') || undefined;

  const applications = db.getApplications({
    jobId: jobId === 'all' ? undefined : jobId,
    stage: stage === 'all' ? undefined : stage,
    screeningStatus: screeningStatus === 'all' ? undefined : screeningStatus
  });

  return NextResponse.json({ applications }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}
