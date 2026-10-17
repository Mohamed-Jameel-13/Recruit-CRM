import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      const text = await req.text();
      if (text && text.trim()) {
        body = JSON.parse(text);
      }
    } catch {
      body = {};
    }

    const keepBaseJob = body.keepBaseJob !== false;
    const cleanStore = db.resetData(keepBaseJob);

    return NextResponse.json({
      success: true,
      message: 'All candidate records, uploaded documents, applications, assessments, and interview schedules have been completely cleared.',
      store: {
        jobsCount: cleanStore.jobs.length,
        candidatesCount: cleanStore.candidates.length,
        applicationsCount: cleanStore.applications.length
      }
    });
  } catch (err: unknown) {
    console.error('System reset error:', err);
    return NextResponse.json({
      error: 'Failed to reset database',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
