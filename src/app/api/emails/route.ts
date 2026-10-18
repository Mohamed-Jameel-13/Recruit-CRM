import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await db.ensureHydrated(true);
    const emails = db.getSentEmails();
    return NextResponse.json({
      success: true,
      emails,
      totalCount: emails.length
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: 'Failed to fetch sent emails',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
