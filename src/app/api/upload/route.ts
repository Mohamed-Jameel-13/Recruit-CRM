import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { db } from '@/lib/db/repository';
import { extractResumeData, sanitizeCandidateName, isValidContactEmail } from '@/lib/extractor/parser';
import { screenCandidateWithAI } from '@/lib/screening/engine';
import { emailDispatcher } from '@/lib/email/dispatcher';
import { ScreeningRecommendation } from '@/types/database';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

function getUploadDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production') {
    const tmpDir = path.join(os.tmpdir(), 'recruitai_uploads');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {}
    return tmpDir;
  }
  try {
    const localDir = path.resolve(process.cwd(), '.data', 'uploads');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'recruitai_uploads');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    } catch {}
    return tmpDir;
  }
}

function getRequestBaseUrl(req: NextRequest): string {
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  const origin = req.headers.get('origin');
  if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
    return origin;
  }
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim()) {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim().replace(/\/+$/, '')}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.trim().replace(/\/+$/, '')}`;
  }
  return 'https://recruit-crm-peach.vercel.app';
}

export async function POST(req: NextRequest) {
  try {
    await db.ensureHydrated(true);
    const requestBaseUrl = getRequestBaseUrl(req);
    const formData = await req.formData();
    const jobId = formData.get('jobId') as string;
    const roleTitle = (formData.get('roleTitle') as string) || '';
    const batchName = (formData.get('batchName') as string) || `Batch_${new Date().toISOString().substring(0, 10)}`;
    const files = formData.getAll('files') as File[];

    // Extract client-forwarded LLM configuration if sent from UI
    let clientLlmConfig: any = null;
    const headerConfig = req.headers.get('x-llm-config');
    const formConfig = formData.get('llmConfig') as string;
    if (headerConfig) {
      try { clientLlmConfig = JSON.parse(headerConfig); } catch {}
    } else if (formConfig) {
      try { clientLlmConfig = JSON.parse(formConfig); } catch {}
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided for upload.' }, { status: 400 });
    }

    if (files.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 files allowed per upload batch.' }, { status: 400 });
    }

    // Resilient job resolution: by ID -> by Title -> first active job -> auto-create default
    let job = (jobId && jobId !== 'undefined' && jobId !== 'null') ? db.getJobById(jobId) : null;
    if (!job && roleTitle) {
      job = db.getJobs().find(j => j.title.toLowerCase().trim() === roleTitle.toLowerCase().trim()) || null;
    }
    if (!job) {
      const allJobs = db.getJobs();
      job = allJobs[0] || null;
    }
    if (!job) {
      job = db.createJob({
        organization_id: 'a0000000-0000-0000-0000-000000000001',
        title: roleTitle || 'Senior Full-Stack Cloud Engineer',
        department: 'Platform Engineering',
        location: 'Remote (Global)',
        employment_type: 'Full-Time',
        description: 'Autonomous recruitment pipeline default role',
        status: 'active'
      });
    }

    if (!job.criteria) {
      job.criteria = db.getCriteriaByJobId(job.id) || undefined;
      if (!job.criteria) {
        const allCrit = db.getCriteria();
        job.criteria = allCrit[0] || undefined;
      }
    }

    const calendlyLinkParam = ((formData.get('calendlyLink') || formData.get('calendly_link')) as string) || '';
    const assessmentConfigId = ((formData.get('assessmentConfigId') || formData.get('assessment_config_id')) as string) || '';

    const jobUpdates: Partial<typeof job> = {};
    if (calendlyLinkParam && calendlyLinkParam.trim()) {
      jobUpdates.calendly_link = calendlyLinkParam.trim();
    }
    if (assessmentConfigId && assessmentConfigId.trim()) {
      jobUpdates.assessment_config_id = assessmentConfigId.trim();
    }
    if (Object.keys(jobUpdates).length > 0) {
      db.updateJob(job.id, jobUpdates);
    }

    // Ensure upload storage directory exists safely
    const uploadDir = getUploadDir();

    const batchIdParam = (formData.get('batchId') as string) || '';
    let batch = batchIdParam ? db.getBatchById(batchIdParam) : null;
    if (!batch) {
      batch = db.createBatch(batchName, job.id, files.length);
    } else {
      db.updateBatch(batch.id, {
        total_files: Math.max(batch.total_files, (batch.processed_files || 0) + files.length)
      });
    }

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

      // 4. Save to storage (graceful in serverless / read-only)
      const safeStoredFileName = `${Date.now()}_${hash.substring(0, 12)}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.join(uploadDir, safeStoredFileName);
      try {
        fs.writeFileSync(filePath, buffer);
      } catch (writeErr) {
        console.warn('Storage write non-fatal warning (running in serverless or read-only mode):', writeErr);
      }

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

        // 6. Create Candidate & Application with sanitized human name
        const initialSanitized = sanitizeCandidateName(extracted.name, fileName);
        let firstName = initialSanitized.firstName;
        let lastName = initialSanitized.lastName;
        let candidateEmail = extracted.email || `candidate_${hash.substring(0, 8)}@example.com`;

        const { candidate, application } = db.createApplicationWithCandidate({
          jobId: job.id,
          firstName,
          lastName,
          email: candidateEmail,
          phone: extracted.phone,
          location: extracted.location,
          cvDocId: cvDoc.id,
          batchId: batch.id
        });

        // Update CV document with candidate link
        db.updateCVDocument(cvDoc.id, { candidate_id: candidate.id });

        let matchScore = 75;
        let recommendation: ScreeningRecommendation = 'POTENTIAL_MATCH';
        let isShortlisted = false;
        let testUrl: string | null = null;
        let emailSent = false;
        let aiEvaluationData = null;
        let modelProviderUsed = 'rule-based-engine';
        let modelNameUsed = 'semantic-equivalence-matrix-v1';
        let isFallback = true;
        let createdAssignment: any = null;

        // 7. Perform Intelligent Semantic AI Screening
        if (job.criteria) {
          const screeningOutcome = await screenCandidateWithAI(
            extracted.text,
            extracted.skills,
            extracted.yearsExperience || 3,
            job.criteria,
            job.title,
            job.description,
            clientLlmConfig
          );

          // If AI detected a verified candidate name or personal contact email from the CV
          const aiResult = screeningOutcome?.screeningResult;
          if (aiResult?.candidateName) {
            const aiSanitized = sanitizeCandidateName(aiResult.candidateName, fileName);
            if (aiSanitized.firstName && aiSanitized.firstName !== 'Candidate') {
              firstName = aiSanitized.firstName;
              lastName = aiSanitized.lastName;
            }
          }
          if (aiResult?.candidateEmail && isValidContactEmail(aiResult.candidateEmail)) {
            candidateEmail = aiResult.candidateEmail.trim().toLowerCase();
          }

          // Persist verified candidate details in database
          db.updateCandidate(candidate.id, {
            first_name: firstName,
            last_name: lastName,
            email: candidateEmail
          });
          candidate.first_name = firstName;
          candidate.last_name = lastName;
          candidate.email = candidateEmail;

          matchScore = screeningOutcome.screeningResult.matchScore;
          recommendation = screeningOutcome.screeningResult.recommendation;
          aiEvaluationData = screeningOutcome.screeningResult;
          modelProviderUsed = screeningOutcome.modelProvider;
          modelNameUsed = screeningOutcome.modelName;
          isFallback = screeningOutcome.isRuleBasedFallback;

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

          // 8. Auto-Shortlist Based on Scoring Threshold
          const passThreshold = job.criteria.pass_threshold_score || 65;
          const isMatch = matchScore >= passThreshold;

          if (isMatch) {
            isShortlisted = true;
            try {
              db.approveForAssessment(application.id, 'Autonomous Screening AI Policy', assessmentConfigId || job.assessment_config_id);
              const assignment = db.getAssessmentByApplicationId(application.id);
              createdAssignment = assignment;

              if (assignment) {
                const customFormUrl = formData.get('assessmentUrl') as string;
                if (customFormUrl && customFormUrl.trim()) {
                  assignment.assessment_url = customFormUrl.trim();
                }
                testUrl = assignment.assessment_url || `/assessment/take/${assignment.id}`;

                // Send Assessment Form Invitation Email
                try {
                  const chosenConfig = db.getAssessmentConfig(assignment.config_id || assessmentConfigId || job.assessment_config_id);
                  await emailDispatcher.sendAssessmentInvitation({
                    applicationId: application.id,
                    candidateEmail: candidate.email,
                    candidateName: `${firstName} ${lastName}`.trim(),
                    jobTitle: job.title,
                    assessmentTitle: chosenConfig?.title,
                    durationMinutes: chosenConfig?.duration_minutes || 45,
                    assessmentDescription: chosenConfig?.description,
                    testUrl,
                    baseUrl: requestBaseUrl,
                    passThreshold: assignment.pass_threshold_percentage || chosenConfig?.pass_threshold_percentage || 70
                  });
                  emailSent = true;
                } catch (emailErr) {
                  console.warn('Non-fatal email dispatch warning:', emailErr);
                }
              }
            } catch (approvalErr) {
              console.warn('Non-fatal assessment approval warning:', approvalErr);
            }
          }
        }

        processedResults.push({
          fileName,
          candidateName: `${firstName} ${lastName}`.trim(),
          candidateEmail: candidate.email,
          applicationId: application.id,
          assessmentId: createdAssignment?.id,
          matchScore,
          recommendation,
          isShortlisted,
          testUrl,
          emailSent,
          aiEvaluation: aiEvaluationData,
          modelProvider: modelProviderUsed,
          modelName: modelNameUsed,
          isRuleBasedFallback: isFallback,
          status: 'success'
        });
      } catch (parseErr: unknown) {
        const errorMsg = parseErr instanceof Error ? parseErr.message : 'Failed to extract resume contents.';
        try {
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
        } catch {}

        failedResults.push({
          fileName,
          error: errorMsg
        });
      }
    }

    // Update batch status
    const currentProcessed = (batch.processed_files || 0) + processedResults.length;
    const currentFailed = (batch.failed_files || 0) + failedResults.length;
    try {
      db.updateBatch(batch.id, {
        processed_files: currentProcessed,
        failed_files: currentFailed,
        status: currentFailed === 0 ? 'completed' : currentProcessed > 0 ? 'partial_failure' : 'failed',
        error_summary: currentFailed > 0 ? `${currentFailed} files failed processing` : undefined
      });
    } catch {}

    // Guarantee all screening runs, applications, and batch data are committed to Supabase Storage before returning
    try {
      await db.persistStoreAsync();
    } catch (persistErr) {
      console.warn('Notice: Non-fatal background storage persist warning:', persistErr);
    }

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
    const errorDetails = err instanceof Error ? err.message : String(err);
    console.error('Batch upload error:', errorDetails);
    return NextResponse.json({
      error: 'Internal server error during upload processing.',
      message: errorDetails,
      details: errorDetails
    }, { status: 500 });
  }
}
