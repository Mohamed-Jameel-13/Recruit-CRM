import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  await db.ensureHydrated(true);
  const interviews = db.getInterviews();
  const interviewers = db.getInterviewers();
  const applications = db.getApplications();

  const joinedInterviews = interviews.map(item => {
    const app = applications.find(a => a.id === item.application_id);
    return {
      ...item,
      candidate: app?.candidate,
      job: app?.job,
      application: app
    };
  });

  return NextResponse.json({ 
    interviews: joinedInterviews,
    interviewers
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}
