import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { candidateId, reason, requestedBy } = body;

    if (!candidateId || !reason) {
      return NextResponse.json({ 
        error: 'Candidate ID and deletion reason are required.' 
      }, { status: 400 });
    }

    const deletion = db.requestCandidateDeletion(
      candidateId,
      reason,
      requestedBy || 'Data Protection Officer'
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Candidate personal data has been erased and audit trail recorded.',
      deletion 
    });
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: 'Failed to process candidate deletion request', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
