import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/repository';

describe('Recruitment Pipeline State Machine & Human Approval', () => {
  let createdJobId: string;
  let testAppId: string;

  beforeEach(() => {
    const job = db.createJob({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      title: 'DevOps Engineer',
      department: 'Infrastructure',
      location: 'Remote',
      employment_type: 'Full-Time',
      description: 'Infrastructure role',
      status: 'active'
    });
    createdJobId = job.id;

    const { application } = db.createApplicationWithCandidate({
      jobId: createdJobId,
      firstName: 'Test',
      lastName: 'Applicant',
      email: `applicant_${Date.now()}@example.com`
    });
    testAppId = application.id;
  });

  it('should initialize application in SCREENING stage and NOT_SENT invitation status', () => {
    const app = db.getApplicationById(testAppId);
    expect(app).toBeDefined();
    expect(app?.stage).toBe('SCREENING');
    expect(app?.human_approved).toBe(false);
    expect(app?.invitation_status).toBe('NOT_SENT');
  });

  it('should not automatically advance or invite without explicit human approval', () => {
    // Record low AI screening score
    db.recordScreeningRun({
      application_id: testAppId,
      model_provider: 'rule-based-engine',
      model_name: 'test',
      is_rule_based_fallback: true,
      match_score: 35,
      recommendation: 'NOT_A_MATCH',
      matching_skills: [],
      transferable_skills: [],
      missing_requirements: ['TypeScript', 'Kubernetes'],
      uncertainties: [],
      executive_summary: 'Low match score'
    });

    const app = db.getApplicationById(testAppId);
    // Even with a low score, the application must NEVER be automatically rejected!
    expect(app?.stage).toBe('SCREENING');
    expect(app?.screening_status).toBe('COMPLETED');
    expect(app?.human_approved).toBe(false);
  });

  it('should transition to ASSESSMENT stage only after human approval', () => {
    const approved = db.approveForAssessment(testAppId, 'Sarah Connor (Admin)');
    expect(approved).not.toBeNull();
    expect(approved?.human_approved).toBe(true);
    expect(approved?.stage).toBe('ASSESSMENT');
    expect(approved?.invitation_status).toBe('APPROVED');
  });

  it('should allow admin to override an AI recommendation with a recorded reason', () => {
    const run = db.recordScreeningRun({
      application_id: testAppId,
      model_provider: 'rule-based-engine',
      model_name: 'test',
      is_rule_based_fallback: true,
      match_score: 55,
      recommendation: 'BORDERLINE',
      matching_skills: ['TypeScript'],
      transferable_skills: [],
      missing_requirements: ['Docker'],
      uncertainties: [],
      executive_summary: 'Borderline profile'
    });

    const overridden = db.overrideScreening(
      run.id,
      'POTENTIAL_MATCH',
      'Candidate has significant open source contributions compensating for Docker',
      'Admin Alex'
    );

    expect(overridden).not.toBeNull();
    expect(overridden?.human_override_recommendation).toBe('POTENTIAL_MATCH');
    expect(overridden?.human_override_reason).toContain('open source contributions');
  });
});
