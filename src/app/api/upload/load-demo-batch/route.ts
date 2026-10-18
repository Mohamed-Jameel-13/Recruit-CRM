import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db } from '@/lib/db/repository';
import { extractResumeData } from '@/lib/extractor/parser';
import { screenCandidateWithAI } from '@/lib/screening/engine';
import { emailDispatcher } from '@/lib/email/dispatcher';
import { ScreeningRecommendation } from '@/types/database';

export async function POST(req: NextRequest) {
  try {
    const demoDir = path.resolve(process.cwd(), 'demo_cvs');
    if (!fs.existsSync(demoDir)) {
      return NextResponse.json({ error: 'demo_cvs directory not found' }, { status: 404 });
    }

    const files = fs.readdirSync(demoDir).filter(f => f.endsWith('.txt') || f.endsWith('.pdf'));
    if (files.length === 0) {
      return NextResponse.json({ error: 'No demo CVs found' }, { status: 404 });
    }
    // Process files deterministically 01 through 10
    files.sort();

    // Reset database state to eliminate old mock applicants/test runs and ensure ONLY the 10 demo CVs exist
    db.resetData(true);

    const job = db.getJobs()[0];
    if (!job) {
      return NextResponse.json({ error: 'No baseline job found to associate with demo batch' }, { status: 404 });
    }

    // Extract client-forwarded LLM configuration if sent from UI
    let clientLlmConfig: any = null;
    const headerConfig = req.headers.get('x-llm-config');
    if (headerConfig) {
      try { clientLlmConfig = JSON.parse(headerConfig); } catch {}
    }

    const batch = db.createBatch(`Demo Batch: ${job.title}`, job.id, files.length);
    const processed = [];
    const failed = [];

    for (const fileName of files) {
      const fullPath = path.join(demoDir, fileName);
      const buffer = fs.readFileSync(fullPath);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      const mimeType = fileName.endsWith('.pdf') ? 'application/pdf' : 'text/plain';

      try {
        if (fileName.toLowerCase().includes('corrupted') || buffer.toString('utf-8').includes('CORRUPTED FILE')) {
          throw new Error('Corrupted binary header or unreadable file structure (simulated parsing failure).');
        }

        const extracted = await extractResumeData(buffer, fileName, mimeType);

        const cvDoc = db.saveCVDocument({
          batch_id: batch.id,
          file_name: fileName,
          file_path: fullPath,
          file_size_bytes: buffer.length,
          mime_type: mimeType,
          file_hash: hash,
          extracted_text: extracted.text,
          parsed_json: {
            name: extracted.name,
            email: extracted.email,
            phone: extracted.phone,
            skills: extracted.skills,
            years_experience: extracted.yearsExperience
          },
          parsing_status: 'parsed'
        });

        const rawName = (extracted.name || 'Candidate')
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        const nameParts = rawName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        const { candidate, application } = db.createApplicationWithCandidate({
          jobId: job.id,
          firstName,
          lastName,
          email: extracted.email || `candidate_${hash.substring(0, 8)}@example.com`,
          phone: extracted.phone,
          location: extracted.location,
          cvDocId: cvDoc.id,
          batchId: batch.id
        });

        db.updateCVDocument(cvDoc.id, { candidate_id: candidate.id });

        let matchScore = 75;
        let recommendation: ScreeningRecommendation = 'POTENTIAL_MATCH';
        let isShortlisted = false;
        let testUrl: string | null = null;
        let emailSent = false;

        const criteria = job.criteria || db.getJobs()[0]?.criteria;
        if (criteria) {
          const screeningOutcome = await screenCandidateWithAI(
            extracted.text,
            extracted.skills,
            extracted.yearsExperience || 4,
            criteria,
            job.title,
            job.description,
            clientLlmConfig
          );

          matchScore = screeningOutcome.screeningResult.matchScore;
          recommendation = screeningOutcome.screeningResult.recommendation;

          db.recordScreeningRun({
            application_id: application.id,
            model_provider: screeningOutcome.modelProvider,
            model_name: screeningOutcome.modelName,
            is_rule_based_fallback: screeningOutcome.isRuleBasedFallback,
            match_score: matchScore,
            recommendation,
            matching_skills: screeningOutcome.screeningResult.matchingSkills,
            transferable_skills: screeningOutcome.screeningResult.transferableSkills,
            missing_requirements: screeningOutcome.screeningResult.missingRequirements,
            uncertainties: screeningOutcome.screeningResult.uncertainties,
            executive_summary: screeningOutcome.screeningResult.executiveSummary,
            evidence: screeningOutcome.screeningResult.evidence
          });

          // Auto-Shortlist Based on Criteria Threshold
          const passThreshold = criteria.pass_threshold_score || 65;
          const isMatch = matchScore >= passThreshold;

          if (isMatch) {
            isShortlisted = true;
            db.approveForAssessment(application.id, 'Autonomous Screening AI Policy');
            const assignment = db.getAssessmentByApplicationId(application.id);

            if (assignment) {
              testUrl = assignment.assessment_url || `/assessment/take/${assignment.id}`;
              emailDispatcher.sendAssessmentInvitation({
                applicationId: application.id,
                candidateEmail: candidate.email,
                candidateName: `${firstName} ${lastName}`.trim(),
                jobTitle: job.title,
                testUrl,
                passThreshold: assignment.pass_threshold_percentage || 70
              });
              emailSent = true;
            }
          }
        }

        processed.push({
          fileName,
          candidateName: `${firstName} ${lastName}`.trim(),
          candidateEmail: candidate.email,
          applicationId: application.id,
          matchScore,
          recommendation,
          isShortlisted,
          testUrl,
          emailSent
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Corrupted or unreadable file.';
        db.saveCVDocument({
          batch_id: batch.id,
          file_name: fileName,
          file_path: fullPath,
          file_size_bytes: buffer.length,
          mime_type: mimeType,
          file_hash: hash,
          parsing_status: 'failed',
          error_message: errorMsg
        });

        failed.push({
          fileName,
          error: errorMsg
        });
      }
    }

    db.updateBatch(batch.id, {
      processed_files: processed.length,
      failed_files: failed.length,
      status: failed.length === 0 ? 'completed' : processed.length > 0 ? 'partial_failure' : 'failed',
      error_summary: failed.length > 0 ? `${failed.length} demo file(s) intentionally failed to test error handling` : undefined
    });

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      total: files.length,
      processedCount: processed.length,
      failedCount: failed.length,
      processed,
      failed
    });
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: 'Failed to ingest demo batch', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
