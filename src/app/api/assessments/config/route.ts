import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0'
};

export async function GET(req: NextRequest) {
  try {
    await db.ensureHydrated(true);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const role = searchParams.get('role');

    const config = db.getAssessmentConfig(id || role || undefined);
    const configs = db.getAssessmentConfigs();

    return NextResponse.json({ success: true, config, configs }, {
      headers: NO_CACHE_HEADERS
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: 'Failed to fetch assessment configuration',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await db.ensureHydrated(true);
    const body = await req.json();
    if (!body) {
      return NextResponse.json({ error: 'Invalid configuration payload' }, { status: 400 });
    }

    // Support creating a brand new role assessment
    if (body.action === 'CREATE') {
      const created = db.createAssessmentConfig({
        role: body.role,
        title: body.title,
        description: body.description,
        duration_minutes: body.duration_minutes,
        pass_threshold_percentage: body.pass_threshold_percentage,
        calendly_link: body.calendly_link,
        questions: body.questions
      });

      try {
        await db.persistStoreAsync();
      } catch (persistErr) {
        console.warn('Storage persist notice for createAssessmentConfig:', persistErr);
      }

      return NextResponse.json({
        success: true,
        config: created,
        configs: db.getAssessmentConfigs()
      }, {
        headers: NO_CACHE_HEADERS
      });
    }

    if (!body.questions || !Array.isArray(body.questions)) {
      return NextResponse.json({ error: 'Assessment must include an array of questions' }, { status: 400 });
    }

    const saved = db.saveAssessmentConfig(body);
    try {
      await db.persistStoreAsync();
    } catch (persistErr) {
      console.warn('Storage persist notice for saveAssessmentConfig:', persistErr);
    }

    const configs = db.getAssessmentConfigs();

    return NextResponse.json({ success: true, config: saved, configs }, {
      headers: NO_CACHE_HEADERS
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: 'Failed to save assessment configuration',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await db.ensureHydrated(true);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Assessment config ID is required for deletion' }, { status: 400 });
    }

    const deleted = db.deleteAssessmentConfig(id);
    if (!deleted) {
      return NextResponse.json({
        error: 'Cannot delete the only remaining assessment configuration'
      }, { status: 400 });
    }

    try {
      await db.persistStoreAsync();
    } catch (persistErr) {
      console.warn('Storage persist notice for deleteAssessmentConfig:', persistErr);
    }

    const configs = db.getAssessmentConfigs();
    const config = db.getAssessmentConfig();

    return NextResponse.json({ success: true, configs, config }, {
      headers: NO_CACHE_HEADERS
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: 'Failed to delete assessment configuration',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
