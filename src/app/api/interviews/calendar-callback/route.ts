import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookRequest } from '@/lib/n8n/auth';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const auth = verifyWebhookRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { interviewId, bookingStatus, calendarEventId, meetingUrl } = body;

    if (!interviewId) {
      return NextResponse.json({ error: 'interviewId is required' }, { status: 400 });
    }

    const dataPath = path.resolve(process.cwd(), '.data', 'recruitment_store.json');
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: 'Data store not found' }, { status: 404 });
    }

    const store = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const idx = store.interviews.findIndex((i: any) => i.id === interviewId || i.application_id === interviewId);
    if (idx === -1) {
      return NextResponse.json({ error: 'Interview record not found' }, { status: 404 });
    }

    if (bookingStatus) store.interviews[idx].booking_status = bookingStatus;
    if (calendarEventId) store.interviews[idx].google_event_id = calendarEventId;
    if (meetingUrl) store.interviews[idx].meeting_url = meetingUrl;
    store.interviews[idx].updated_at = new Date().toISOString();

    const appId = store.interviews[idx].application_id;
    const appIdx = store.applications.findIndex((a: any) => a.id === appId);
    if (appIdx !== -1 && bookingStatus === 'SCHEDULED') {
      store.applications[appIdx].interview_status = 'SCHEDULED';
      store.applications[appIdx].updated_at = new Date().toISOString();
    }

    fs.writeFileSync(dataPath, JSON.stringify(store, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Interview calendar details updated successfully',
      interview: store.interviews[idx]
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: 'Failed to update calendar details',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
