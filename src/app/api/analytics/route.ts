import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  await db.ensureHydrated(true);
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId') || undefined;

  const analytics = db.getAnalytics(jobId);
  return NextResponse.json({ analytics }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}
