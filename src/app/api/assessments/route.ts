import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function GET() {
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
  });
}
