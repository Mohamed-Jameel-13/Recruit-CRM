import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { emailDispatcher } from '@/lib/email/dispatcher';

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

    // Dispatch Round 2 interview email to candidate
    const application = db.getApplicationById(applicationId);
    let emailSent = false;
    if (application && application.candidate && result.interview) {
      const candidate = application.candidate;
      const job = application.job;
      const bookingUrl = result.interview.meeting_url || (job?.calendly_link || 'https://meet.google.com/man-rec-demo');
      const cleanFirstName = candidate.first_name?.replace(/^\d+[\s_-]*/, '').replace(/\d+/g, '').trim() || 'there';
      const cleanLastName = candidate.last_name?.replace(/^\d+[\s_-]*/, '').replace(/\d+/g, '').trim() || '';
      const candidateName = `${cleanFirstName} ${cleanLastName}`.trim() || 'Candidate';

      try {
        emailDispatcher.sendRound2InterviewInvitation({
          applicationId: application.id,
          candidateEmail: candidate.email,
          candidateName,
          jobTitle: job?.title || 'Senior Full-Stack Cloud Engineer',
          score: 85,
          meetingUrl: bookingUrl,
          scheduledStart: result.interview.scheduled_start,
          durationMinutes: result.interview.duration_minutes,
          interviewerName,
          calendlyUrl: job?.calendly_link || undefined
        });
        emailSent = true;
      } catch (emailErr) {
        console.warn('Non-fatal interview email dispatch warning:', emailErr);
      }
    }

    return NextResponse.json({ 
      success: true, 
      interview: result.interview,
      mode: effectiveMode,
      googleConfigured: hasGoogle,
      emailSent
    });
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: 'Failed to schedule interview', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
