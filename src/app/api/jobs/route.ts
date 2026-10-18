import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { synthesizeJobCriteria } from '@/lib/jobs/synthesizer';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET() {
  const jobs = db.getJobs();
  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !body.description) {
      return NextResponse.json({ error: 'Role title and job description are required.' }, { status: 400 });
    }

    // Automatically synthesize rubric, skills, and semantic equivalence rules from Role + JD
    const synthesized = synthesizeJobCriteria(body.title, body.description);

    const job = db.createJob(
      {
        organization_id: 'a0000000-0000-0000-0000-000000000001',
        title: body.title.trim(),
        department: body.department || synthesized.department,
        location: body.location || synthesized.location,
        employment_type: body.employment_type || 'Full-Time',
        description: body.description.trim(),
        status: body.status || 'active',
        calendly_link: (body.calendly_link || body.calendlyLink || '').trim() || undefined
      },
      {
        min_years_experience: body.min_years_experience ?? synthesized.minYearsExperience,
        required_skills: (body.required_skills && body.required_skills.length > 0) ? body.required_skills : synthesized.requiredSkills,
        preferred_skills: (body.preferred_skills && body.preferred_skills.length > 0) ? body.preferred_skills : synthesized.preferredSkills,
        required_education: body.required_education || synthesized.requiredEducation,
        semantic_equivalence_rules: (body.semantic_equivalence_rules && body.semantic_equivalence_rules.length > 0) ? body.semantic_equivalence_rules : synthesized.semanticEquivalenceRules,
        scoring_weights: synthesized.scoringWeights,
        pass_threshold_score: body.pass_threshold_score ?? synthesized.passThresholdScore
      }
    );

    return NextResponse.json({ 
      success: true, 
      job,
      synthesizedSummary: {
        skillsCount: job.criteria?.required_skills.length,
        minYears: job.criteria?.min_years_experience,
        rulesCount: job.criteria?.semantic_equivalence_rules.length
      }
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Failed to create job', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
