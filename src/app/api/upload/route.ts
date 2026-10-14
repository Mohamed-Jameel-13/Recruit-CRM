import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { db } from '@/lib/db/repository';
import { extractResumeData } from '@/lib/extractor/parser';
import { screenCandidateWithAI } from '@/lib/screening/engine';

const UPLOAD_DIR = path.resolve(process.cwd(), '.data', 'uploads');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const jobId = formData.get('jobId') as string;
    const batchName = (formData.get('batchName') as string) || `Batch_${new Date().toISOString().substring(0, 10)}`;
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided for upload.' }, { status: 400 });
    }

    if (files.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 files allowed per upload batch.' }, { status: 400 });
    }

    const job = jobId ? db.getJobById(jobId) : db.getJobs()[0];
    if (!job) {
      return NextResponse.json({ error: 'Selected job was not found.' }, { status: 404 });
    }

    // Ensure upload storage directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const batch = db.createBatch(batchName, job.id, files.length);

    const processedResults = [];
    const failedResults = [];

    for (const file of files) {
      const fileName = file.name;
      const fileSize = file.size;
      const mimeType = file.type || 'application/octet-stream';

      // 1. Validation: file size (max 15MB)
      if (fileSize > 15 * 1024 * 1024) {
        failedResults.push({
          fileName,
          error: 'File exceeds 15MB size limit.'
        });
        continue;
      }

      // 2. Validation: format
      const isAllowed = 
        fileName.toLowerCase().endsWith('.pdf') || 
        fileName.toLowerCase().endsWith('.docx') || 
        fileName.toLowerCase().endsWith('.txt') ||
        mimeType.includes('pdf') || 
        mimeType.includes('word') ||
        mimeType.includes('document');

      if (!isAllowed) {
        failedResults.push({
          fileName,
          error: 'Unsupported file format. Only PDF, DOCX, and TXT files are accepted.'
        });
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 3. Compute SHA-256 hash for deduplication
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');

      // 4. Save to private storage
      const safeStoredFileName = `${Date.now()}_${hash.substring(0, 12)}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.join(UPLOAD_DIR, safeStoredFileName);
      fs.writeFileSync(filePath, buffer);

      try {
        // 5. Extract Text and Contact Info
        const extracted = await extractResumeData(buffer, fileName, mimeType);

        // Save CV Document record
        const cvDoc = db.saveCVDocument({
          candidate_id: undefined,
          batch_id: batch.id,
          file_name: fileName,
          file_path: filePath,
          file_size_bytes: fileSize,
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

        // 6. Create Candidate & Application
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

        // Update CV document with candidate link
        db.updateCVDocument(cvDoc.id, { candidate_id: candidate.id });

        // 7. Perform Intelligent Semantic AI Screening
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

        processedResults.push({
          fileName,
          candidateName: `${firstName} ${lastName}`.trim(),
          candidateEmail: candidate.email,
          applicationId: application.id,
          status: 'success'
        });
      } catch (parseErr: unknown) {
        const errorMsg = parseErr instanceof Error ? parseErr.message : 'Failed to extract resume contents.';
        db.saveCVDocument({
          batch_id: batch.id,
          file_name: fileName,
          file_path: filePath,
          file_size_bytes: fileSize,
          mime_type: mimeType,
          file_hash: hash,
          parsing_status: 'failed',
          error_message: errorMsg
        });

        failedResults.push({
          fileName,
          error: errorMsg
        });
      }
    }

    // Update batch status
    db.updateBatch(batch.id, {
      processed_files: processedResults.length,
      failed_files: failedResults.length,
      status: failedResults.length === 0 ? 'completed' : processedResults.length > 0 ? 'partial_failure' : 'failed',
      error_summary: failedResults.length > 0 ? `${failedResults.length} files failed processing` : undefined
    });

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      totalFiles: files.length,
      processedCount: processedResults.length,
      failedCount: failedResults.length,
      processed: processedResults,
      failed: failedResults
    });
  } catch (err: unknown) {
    console.error('Batch upload error:', err);
    return NextResponse.json({
      error: 'Internal server error during upload processing.',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
