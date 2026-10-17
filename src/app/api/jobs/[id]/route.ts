import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { synthesizeJobCriteria } from '@/lib/jobs/synthesizer';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = db.getJobById(id);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  return NextResponse.json({ job });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const job = db.getJobById(id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Build criteria updates from payload
    const criteriaUpdates: Record<string, unknown> = {};
    if (body.pass_threshold_score !== undefined) {
      criteriaUpdates.pass_threshold_score = Number(body.pass_threshold_score);
    }
    if (body.min_years_experience !== undefined) {
      criteriaUpdates.min_years_experience = Number(body.min_years_experience);
    }
    if (body.required_skills !== undefined) {
      criteriaUpdates.required_skills = Array.isArray(body.required_skills)
        ? body.required_skills
        : String(body.required_skills).split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (body.preferred_skills !== undefined) {
      criteriaUpdates.preferred_skills = Array.isArray(body.preferred_skills)
        ? body.preferred_skills
        : String(body.preferred_skills).split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (body.required_education !== undefined) {
      criteriaUpdates.required_education = body.required_education;
    }
    if (body.semantic_equivalence_rules !== undefined) {
      criteriaUpdates.semantic_equivalence_rules = body.semantic_equivalence_rules;
    }

    // Re-synthesize with AI if explicitly requested
    if (body.reSynthesize) {
      const titleForSynthesis = body.title || job.title;
      const descForSynthesis = body.description || job.description;
      const synth = synthesizeJobCriteria(titleForSynthesis, descForSynthesis);
      criteriaUpdates.required_skills = synth.requiredSkills;
      criteriaUpdates.preferred_skills = synth.preferredSkills;
      criteriaUpdates.min_years_experience = synth.minYearsExperience;
      criteriaUpdates.semantic_equivalence_rules = synth.semanticEquivalenceRules;
      criteriaUpdates.scoring_weights = synth.scoringWeights;
    }

    // Update assessment config's pass threshold for round 2 
    if (body.assessment_pass_threshold !== undefined) {
      const config = db.getAssessmentConfig();
      db.saveAssessmentConfig({
        ...config,
        pass_threshold_percentage: Number(body.assessment_pass_threshold)
      });
    }

    const jobUpdates: Record<string, unknown> = {};
    if (body.title !== undefined) jobUpdates.title = body.title.trim();
    if (body.description !== undefined) jobUpdates.description = body.description.trim();
    if (body.department !== undefined) jobUpdates.department = body.department.trim();
    if (body.location !== undefined) jobUpdates.location = body.location.trim();
    if (body.employment_type !== undefined) jobUpdates.employment_type = body.employment_type.trim();
    if (body.status !== undefined) jobUpdates.status = body.status;
    
    // Save Calendly / interview booking link
    if (body.calendly_link !== undefined || body.calendlyLink !== undefined) {
      const rawLink = body.calendly_link ?? body.calendlyLink;
      const cleanLink = typeof rawLink === 'string' ? rawLink.trim() : '';
      jobUpdates.calendly_link = cleanLink || undefined;

      // Also persist to global assessment config as fallback
      if (cleanLink) {
        const config = db.getAssessmentConfig();
        db.saveAssessmentConfig({
          ...config,
          calendly_link: cleanLink
        });
      }
    }

    const updated = db.updateJob(
      id,
      jobUpdates as Parameters<typeof db.updateJob>[1],
      Object.keys(criteriaUpdates).length > 0 
        ? criteriaUpdates as Parameters<typeof db.updateJob>[2]
        : undefined
    );

    return NextResponse.json({ success: true, job: updated });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: 'Failed to update job', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = db.deleteJob(id);
    if (!success) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Job deleted successfully' });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: 'Failed to delete job', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
