import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      applicationId, 
      interviewerId, 
      scheduledStart, 
      durationMinutes, 
      timezone,
      schedulingMode,
      meetingUrl 
    } = body;

    if (!applicationId || !interviewerId || !scheduledStart) {
      return NextResponse.json({ 
        error: 'Application ID, Interviewer ID, and start time are required.' 
      }, { status: 400 });
    }

    const interviewer = db.getInterviewers().find(i => i.id === interviewerId);
    const interviewerName = interviewer?.name || 'Assigned Interviewer';

    // Check if Google credentials exist in environment
    const hasGoogle = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const effectiveMode = (schedulingMode === 'GOOGLE_CALENDAR' && hasGoogle) 
      ? 'GOOGLE_CALENDAR' 
      : 'MANUAL';

    const result = db.scheduleInterview({
      applicationId,
      interviewerId,
      interviewerName,
      scheduledStart,
      durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 45,
      timezone: timezone || 'America/New_York',
      schedulingMode: effectiveMode,
      meetingUrl: meetingUrl || (effectiveMode === 'MANUAL' ? 'https://meet.google.com/man-rec-demo' : undefined)
    });

    if (result.conflict) {
      return NextResponse.json({ 
        conflict: true, 
        error: result.error 
      }, { status: 409 });
    }

    return NextResponse.json({ 
      success: true, 
      interview: result.interview,
      mode: effectiveMode,
      googleConfigured: hasGoogle
    });
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: 'Failed to schedule interview', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
