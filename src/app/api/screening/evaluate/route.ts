import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { screenCandidateWithAI } from '@/lib/screening/engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required.' }, { status: 400 });
    }

    const application = db.getApplicationById(applicationId);
    if (!application) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    }

    const job = application.job || (application.job_id ? db.getJobById(application.job_id) : null);
    if (!job || !job.criteria) {
      return NextResponse.json({ error: 'Job or screening criteria not found.' }, { status: 400 });
    }

    const cvDoc = application.cv_document;
    const text = cvDoc?.extracted_text || '';
    const skills = cvDoc?.parsed_json?.skills || [];
    const experience = cvDoc?.parsed_json?.years_experience || 3;

    const screeningOutcome = await screenCandidateWithAI(
      text,
      skills,
      experience,
      job.criteria,
      job.title,
      job.description
    );

    const run = db.recordScreeningRun({
      application_id: application.id,
      model_provider: screeningOutcome.modelProvider,
      model_name: screeningOutcome.modelName,
      is_rule_based_fallback: screeningOutcome.isRuleBasedFallback,
      match_score: screeningOutcome.screeningResult.matchScore,
      recommendation: screeningOutcome.screeningResult.recommendation,
      matching_skills: screeningOutcome.screeningResult.matchingSkills,
      transferable_skills: screeningOutcome.screeningResult.transferableSkills,
      missing_requirements: screeningOutcome.screeningResult.missingRequirements,
      uncertainties: screeningOutcome.screeningResult.uncertainties,
      executive_summary: screeningOutcome.screeningResult.executiveSummary,
      evidence: screeningOutcome.screeningResult.evidence
    });

    return NextResponse.json({ success: true, screeningRun: run });
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: 'Failed to evaluate screening', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
