import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db } from '@/lib/db/repository';
import { extractResumeData } from '@/lib/extractor/parser';
import { screenCandidateWithAI } from '@/lib/screening/engine';

export async function POST() {
  try {
    const demoDir = path.resolve(process.cwd(), 'demo_cvs');
    if (!fs.existsSync(demoDir)) {
      return NextResponse.json({ error: 'demo_cvs directory not found' }, { status: 404 });
    }

    const files = fs.readdirSync(demoDir).filter(f => f.endsWith('.txt') || f.endsWith('.pdf'));
    if (files.length === 0) {
      return NextResponse.json({ error: 'No demo CVs found' }, { status: 404 });
    }

    const job = db.getJobs()[0];
    if (!job) {
      return NextResponse.json({ error: 'No job found to associate with batch' }, { status: 404 });
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

        const nameParts = (extracted.name || 'Candidate').split(' ');
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

        if (job.criteria) {
          const screeningOutcome = await screenCandidateWithAI(
            extracted.text,
            extracted.skills,
            extracted.yearsExperience || 3,
            job.criteria,
            job.title,
            job.description
          );

          db.recordScreeningRun({
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
        }

        processed.push({
          fileName,
          candidateName: `${firstName} ${lastName}`.trim(),
          candidateEmail: candidate.email,
          applicationId: application.id
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
