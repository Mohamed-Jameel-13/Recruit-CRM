import { describe, it, expect } from 'vitest';
import { sanitizeCandidateName, cleanCandidateNameFromFileName, isValidContactEmail } from '../extractor/parser';
import { db } from '../db/repository';

describe('Candidate Name & Contact Email Sanitization Suite', () => {
  it('should reject numbers and numeric ages like "40" or "40-something" and fallback to filename or Candidate', () => {
    const res1 = sanitizeCandidateName('40');
    expect(res1.firstName).toBe('Candidate');

    const res2 = sanitizeCandidateName('40-something years old');
    expect(res2.firstName).toBe('Candidate');

    const res3 = sanitizeCandidateName('40', '40_Elena_Rostova_FullStack.txt');
    expect(res3.firstName).toBe('Elena');
    expect(res3.lastName).toBe('Rostova');
    expect(res3.fullName).toBe('Elena Rostova');
  });

  it('should clean filenames with numeric prefixes and role suffixes', () => {
    const name1 = cleanCandidateNameFromFileName('01_Elena_Rostova_FullStack.txt');
    expect(name1).toBe('Elena Rostova');

    const name2 = cleanCandidateNameFromFileName('05_Jordan_Vance_Junior_Borderline.txt');
    expect(name2).toBe('Jordan Vance');

    const name3 = cleanCandidateNameFromFileName('07_Carlos_Gomez_DevOps_Cloud.txt');
    expect(name3).toBe('Carlos Gomez');

    const name4 = cleanCandidateNameFromFileName('40_Marcus_Brody_Polyglot_FastAPI.pdf');
    expect(name4).toBe('Marcus Brody');
  });

  it('should strip trailing or inline numbers from names like "Marcus Brody 40"', () => {
    const res = sanitizeCandidateName('Marcus Brody 40');
    expect(res.fullName).toBe('Marcus Brody');
    expect(res.firstName).toBe('Marcus');
    expect(res.lastName).toBe('Brody');
  });

  it('should properly validate real contact emails vs placeholders', () => {
    expect(isValidContactEmail('elena.rostova@gmail.com')).toBe(true);
    expect(isValidContactEmail('marcus.brody@company.co.uk')).toBe(true);
    expect(isValidContactEmail('candidate_abc1234@example.com')).toBe(false);
    expect(isValidContactEmail('test@test.com')).toBe(false);
    expect(isValidContactEmail('applicant_1234@example.com')).toBe(false);
    expect(isValidContactEmail('')).toBe(false);
    expect(isValidContactEmail(null)).toBe(false);
  });

  it('should dispatch Round 2 interview email to candidate real email, not Candidate #1', () => {
    const candidateEmail = 'candidate_recipient_test@domain.com';
    const { candidate, application } = db.createApplicationWithCandidate({
      jobId: db.getJobs()[0].id,
      firstName: 'Samantha',
      lastName: 'Miller',
      email: candidateEmail
    });

    db.approveForAssessment(application.id, 'Unit Test');
    const assignment = db.getAssessmentByApplicationId(application.id);
    expect(assignment).toBeDefined();

    if (assignment) {
      const updated = db.saveAssessmentResult(assignment.id, {
        score: 85,
        source: 'Automated Test',
        candidateEmail
      });
      expect(updated?.status).toBe('PASSED');

      const sentEmails = db.getSentEmails();
      const interviewEmail = sentEmails.find(e => e.metadata?.applicationId === application.id && e.template_type === 'ROUND_2_INTERVIEW_INVITATION');
      expect(interviewEmail).toBeDefined();
      expect(interviewEmail?.recipient_email).toBe(candidateEmail);
      expect(interviewEmail?.recipient_name).toBe('Samantha Miller');
      expect(interviewEmail?.body_html).toContain('Hi Samantha');
      expect(interviewEmail?.body_html).not.toContain('40');
    }
  });

  it('should auto-recover assessment session when token is queried even if not previously in assignment list', () => {
    const candidateEmail = 'token_recovery_test@domain.com';
    const { application } = db.createApplicationWithCandidate({
      jobId: db.getJobs()[0].id,
      firstName: 'Elena',
      lastName: 'Rostova',
      email: candidateEmail
    });

    const nowTs = Date.now();
    const token = `assess-${nowTs}`;

    // Query an unassigned assess token with timestamp matching the recent application
    const session = db.getOrCreateAssessmentById(token);
    expect(session).toBeDefined();
    expect(session?.assignment).toBeDefined();
    expect(session?.assignment.id).toBe(token);
    expect(session?.candidate?.email).toBe(candidateEmail);
  });

  it('should identify terminal states to prevent re-attempts for completed assessments', () => {
    const candidateEmail = 'retake_guard_test@domain.com';
    const { application } = db.createApplicationWithCandidate({
      jobId: db.getJobs()[0].id,
      firstName: 'Carlos',
      lastName: 'Gomez',
      email: candidateEmail
    });

    db.approveForAssessment(application.id, 'Unit Test');
    const assignment = db.getAssessmentByApplicationId(application.id);
    expect(assignment).toBeDefined();

    if (assignment) {
      // First attempt passes
      db.saveAssessmentResult(assignment.id, {
        score: 90,
        source: 'First Attempt',
        candidateEmail
      });

      const session = db.getOrCreateAssessmentById(assignment.id);
      expect(session?.assignment.status).toBe('PASSED');
      expect(session?.assignment.verified).toBe(true);
      
      const isCompleted = 
        session?.assignment.status === 'PASSED' || 
        session?.assignment.status === 'FAILED' || 
        Boolean(session?.assignment.verified);
      expect(isCompleted).toBe(true);
    }
  });
});

