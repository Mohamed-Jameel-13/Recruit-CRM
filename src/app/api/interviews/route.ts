import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function GET() {
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
  });
}
