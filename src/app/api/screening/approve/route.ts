import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicationId, approvedBy } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required.' }, { status: 400 });
    }

    const updated = db.approveForAssessment(
      applicationId, 
      approvedBy || 'Admin User'
    );

    if (!updated) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, application: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Failed to approve application', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
