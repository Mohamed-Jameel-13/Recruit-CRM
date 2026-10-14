import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function GET() {
  const jobs = db.getJobs();
  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !body.description) {
      return NextResponse.json({ error: 'Title and description are required.' }, { status: 400 });
    }

    const job = db.createJob(
      {
        organization_id: 'a0000000-0000-0000-0000-000000000001',
        title: body.title,
        department: body.department || 'General',
        location: body.location || 'Remote',
        employment_type: body.employment_type || 'Full-Time',
        description: body.description,
        status: body.status || 'active'
      },
      {
        min_years_experience: body.min_years_experience || 3,
        required_skills: body.required_skills || [],
        preferred_skills: body.preferred_skills || [],
        required_education: body.required_education || 'Bachelor in CS or equivalent',
        semantic_equivalence_rules: body.semantic_equivalence_rules || [],
        pass_threshold_score: body.pass_threshold_score || 65
      }
    );

    return NextResponse.json({ success: true, job });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Failed to create job', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
