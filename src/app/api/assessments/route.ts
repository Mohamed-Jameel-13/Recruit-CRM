import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  await db.ensureHydrated(true);
  const assessments = db.getAssessments();
  const applications = db.getApplications();
  const interviews = db.getInterviews();

  const joined = assessments.map(assess => {
    const app = applications.find(a => a.id === assess.application_id);
    return {
      ...assess,
      candidate: app?.candidate,
      job: app?.job,
      application: app
    };
  });

  return NextResponse.json({ 
    assessments: joined,
    // Also expose raw arrays for polling in the upload page tracker
    assignments: assessments,
    interviews
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}
