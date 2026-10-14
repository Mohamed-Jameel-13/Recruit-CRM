import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function GET() {
  const auditLogs = db.getAuditLogs();
  return NextResponse.json({ logs: auditLogs });
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
