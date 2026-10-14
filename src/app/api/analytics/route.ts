import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId') || undefined;

  const analytics = db.getAnalytics(jobId);
  return NextResponse.json({ analytics });
}
