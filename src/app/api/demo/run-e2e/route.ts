import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db } from '@/lib/db/repository';
import { extractResumeData } from '@/lib/extractor/parser';
import { screenCandidateWithAI } from '@/lib/screening/engine';
import { emailDispatcher } from '@/lib/email/dispatcher';

export async function POST(req: NextRequest) {
  try {
    const demoDir = path.resolve(process.cwd(), 'demo_cvs');
    if (!fs.existsSync(demoDir)) {
      return NextResponse.json({ error: 'demo_cvs directory not found' }, { status: 404 });
    }

    const files = fs.readdirSync(demoDir).filter(f => f.endsWith('.txt') || f.endsWith('.pdf'));
    files.sort();

    // 1. Clean slate reset with baseline job
    db.resetData(true);
    const job = db.getJobs()[0];
    if (!job) {
      return NextResponse.json({ error: 'Baseline job missing' }, { status: 500 });
    }

    // Extract client-forwarded LLM configuration if sent from UI
    let clientLlmConfig: any = null;
    const headerConfig = req.headers.get('x-llm-config');
    if (headerConfig) {
      try { clientLlmConfig = JSON.parse(headerConfig); } catch {}
    }

    const batch = db.createBatch(`Client Demo Pipeline: ${job.title}`, job.id, files.length);
    const processedCandidates: any[] = [];

    // 2. Ingest and Screen all candidates
    for (const fileName of files) {
      const fullPath = path.join(demoDir, fileName);
      const buffer = fs.readFileSync(fullPath);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      const mimeType = fileName.endsWith('.pdf') ? 'application/pdf' : 'text/plain';

      if (fileName.toLowerCase().includes('corrupted')) {
        db.saveCVDocument({
          batch_id: batch.id,
          file_name: fileName,
          file_path: fullPath,
          file_size_bytes: buffer.length,
          mime_type: mimeType,
          file_hash: hash,
          parsing_status: 'failed',
          error_message: 'Simulated corrupted header to demonstrate system error-handling.'
        });
        continue;
      }

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

        const criteria = job.criteria || db.getJobs()[0]?.criteria;
        let score = 75;
        let recommendation = 'POTENTIAL_MATCH';

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

          score = screeningOutcome.screeningResult.matchScore;
          recommendation = screeningOutcome.screeningResult.recommendation;

          db.recordScreeningRun({
            application_id: application.id,
            model_provider: screeningOutcome.modelProvider,
            model_name: screeningOutcome.modelName,
            is_rule_based_fallback: screeningOutcome.isRuleBasedFallback,
            match_score: score,
            recommendation: screeningOutcome.screeningResult.recommendation,
            matching_skills: screeningOutcome.screeningResult.matchingSkills,
            transferable_skills: screeningOutcome.screeningResult.transferableSkills,
            missing_requirements: screeningOutcome.screeningResult.missingRequirements,
            uncertainties: screeningOutcome.screeningResult.uncertainties,
            executive_summary: screeningOutcome.screeningResult.executiveSummary,
            evidence: screeningOutcome.screeningResult.evidence
          });
        }

        processedCandidates.push({
          candidate,
          application,
          score,
          recommendation
        });
      } catch (err) {
        console.error(`Error processing ${fileName}:`, err);
      }
    }

    // 3. Sort candidates by score descending
    processedCandidates.sort((a, b) => b.score - a.score);

    // 4. Automatically Advance Top 3 Candidates to Assessment Phase & Dispatch Assessment Form Emails
    const topCandidates = processedCandidates.slice(0, 3);
    const sentAssessmentEmails = [];

    for (const item of topCandidates) {
      db.approveForAssessment(item.application.id, 'Autonomous Pipeline Engine');
      const assignment = db.getAssessmentByApplicationId(item.application.id);
      if (assignment) {
        const email = emailDispatcher.sendAssessmentInvitation({
          applicationId: item.application.id,
          candidateEmail: item.candidate.email,
          candidateName: `${item.candidate.first_name} ${item.candidate.last_name}`.trim(),
          jobTitle: job.title,
          testUrl: assignment.assessment_url || `/assessment/take/${assignment.id}`,
          passThreshold: assignment.pass_threshold_percentage || 70
        });
        sentAssessmentEmails.push(email);
      }
    }

    // 5. Ingest High Assessment Scores for the Top Candidates
    const testScores = [95, 92, 88];
    for (let i = 0; i < topCandidates.length; i++) {
      const item = topCandidates[i];
      const assessments = db.getAssessments().filter(a => a.application_id === item.application.id);
      if (assessments.length > 0) {
        db.saveAssessmentResult(assessments[0].id, {
          score: testScores[i],
          maxScore: 100,
          source: 'Candidate Online Assessment Form Submission',
          verified: true,
          verifiedBy: 'Autonomous Grading Engine'
        });
      }
    }

    // 6. Automatically Advance #1 Top Candidate to Round 2 Interview & Book Calendar Slot
    const champion = topCandidates[0];
    db.approveForInterview(champion.application.id, 'Autonomous Assessment Policy (Score >= 70%)');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0); // Tomorrow at 2:00 PM

    const meetingUrl = 'https://meet.google.com/rec-sarah-connor-r2';
    const interviewResult = db.scheduleInterview({
      applicationId: champion.application.id,
      interviewerId: 'e0000000-0000-0000-0000-000000000001',
      interviewerName: 'Sarah Connor',
      scheduledStart: tomorrow.toISOString(),
      durationMinutes: 45,
      timezone: 'America/New_York',
      schedulingMode: 'GOOGLE_CALENDAR',
      meetingUrl,
      googleEventId: `cal_event_round2_${Date.now()}`
    });

    // 7. Dispatch Round 2 Confirmation & Google Meet Link Email
    const round2Email = emailDispatcher.sendRound2InterviewInvitation({
      applicationId: champion.application.id,
      candidateEmail: champion.candidate.email,
      candidateName: `${champion.candidate.first_name} ${champion.candidate.last_name}`.trim(),
      jobTitle: job.title,
      score: testScores[0],
      meetingUrl,
      scheduledStart: tomorrow.toISOString(),
      durationMinutes: 45,
      interviewerName: 'Sarah Connor'
    });

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'application',
      entity_id: champion.application.id,
      action: 'APPROVE',
      details: {
        event: 'E2E Autonomous Client Demonstration Completed',
        champion: `${champion.candidate.first_name} ${champion.candidate.last_name}`,
        finalScore: champion.score,
        assessmentScore: testScores[0],
        interviewBooked: true,
        interviewer: 'Sarah Connor',
        meetingUrl,
        round2EmailSent: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'End-to-End autonomous hiring pipeline completed successfully.',
      champion: {
        name: `${champion.candidate.first_name} ${champion.candidate.last_name}`,
        email: champion.candidate.email,
        aiScreeningScore: champion.score,
        assessmentScore: testScores[0],
        interviewScheduledFor: tomorrow.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        meetingUrl,
        interviewer: 'Sarah Connor',
        testFormUrl: `/assessment/take/${db.getAssessmentByApplicationId(champion.application.id)?.id}`,
        round2EmailId: round2Email.id
      },
      emailsDispatched: [
        ...sentAssessmentEmails,
        round2Email
      ],
      stats: {
        totalCVsEvaluated: processedCandidates.length,
        shortlistedForAssessment: topCandidates.length,
        advancedToSecondRound: 1,
        emailsSent: sentAssessmentEmails.length + 1
      }
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: 'Failed to run autonomous pipeline',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
