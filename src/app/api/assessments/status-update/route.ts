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
    const { assignmentId, candidateEmail, email, status } = body;
    const targetEmail = candidateEmail || email;

    const dataPath = path.resolve(process.cwd(), '.data', 'recruitment_store.json');
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: 'Data store not found' }, { status: 404 });
    }

    const store = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    let idx = -1;
    if (assignmentId) {
      idx = store.assessment_assignments.findIndex((a: any) => a.id === assignmentId);
    }
    
    if (idx === -1 && targetEmail) {
      const cand = store.candidates.find((c: any) => c.email.toLowerCase() === targetEmail.toLowerCase());
      if (cand) {
        const app = store.applications.find((a: any) => a.candidate_id === cand.id);
        if (app) {
          idx = store.assessment_assignments.findIndex((as: any) => as.application_id === app.id);
        }
      }
    }

    if (idx === -1) {
      // Fallback: pick the first pending/queued assessment assignment
      idx = store.assessment_assignments.findIndex((a: any) => a.status === 'PENDING_APPROVAL' || a.status === 'QUEUED');
    }

    if (idx === -1 && store.assessment_assignments.length > 0) {
      idx = 0;
    }

    if (idx === -1) {
      return NextResponse.json({ error: 'Assessment assignment not found' }, { status: 404 });
    }

    const newStatus = status || 'SENT';
    store.assessment_assignments[idx].status = newStatus;
    store.assessment_assignments[idx].updated_at = new Date().toISOString();

    const appId = store.assessment_assignments[idx].application_id;
    const appIdx = store.applications.findIndex((a: any) => a.id === appId);
    if (appIdx !== -1) {
      if (newStatus === 'SENT') {
        store.applications[appIdx].invitation_status = 'SENT';
      }
      store.applications[appIdx].updated_at = new Date().toISOString();
    }

    fs.writeFileSync(dataPath, JSON.stringify(store, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: `Assessment status updated to ${newStatus}`,
      assignment: store.assessment_assignments[idx]
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: 'Failed to update assessment status',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
