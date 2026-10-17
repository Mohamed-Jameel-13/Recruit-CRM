import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function GET() {
  try {
    const emails = db.getSentEmails();
    return NextResponse.json({
      success: true,
      emails,
      totalCount: emails.length
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: 'Failed to fetch sent emails',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
