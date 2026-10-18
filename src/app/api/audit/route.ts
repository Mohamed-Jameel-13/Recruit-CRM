import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  await db.ensureHydrated(true);
  const auditLogs = db.getAuditLogs();
  return NextResponse.json({ logs: auditLogs }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const log = db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: body.entity_type || 'system',
      entity_id: body.entity_id || 'system-event',
      action: body.action || 'EVENT',
      details: body.details
    });
    return NextResponse.json({ success: true, log });
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: 'Failed to record audit log', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
