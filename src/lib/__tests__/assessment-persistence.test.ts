import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/lib/db/repository';
import { emailDispatcher } from '@/lib/email/dispatcher';

describe('Assessment Persistence and Dispatch Suite', () => {
  beforeEach(() => {
    db.resetData(true);
  });

  it('should create and retrieve custom assessment configurations', () => {
    const created = db.createAssessmentConfig({
      role: 'Staff Python Engineer',
      title: 'Staff Python Distributed Systems Challenge',
      description: 'Tests asyncio concurrency, memory profiling, and high-throughput data processing.',
      duration_minutes: 60,
      pass_threshold_percentage: 80,
      questions: [
        {
          id: 'q_py_1',
          type: 'mcq',
          title: 'Python GIL and Concurrency',
          category: 'Concurrency',
          description: 'Which pattern scales CPU-bound workloads across multiple CPU cores in CPython?',
          points: 50,
          options: [
            'A) Multiprocessing or ProcessPoolExecutor',
            'B) threading module with sleep',
            'C) asyncio event loop only',
            'D) Global variables'
          ],
          correct_option_index: 0,
          explanation: 'Multiprocessing spawns separate OS processes with independent GILs.'
        }
      ]
    });

    expect(created.id).toBeDefined();
    expect(created.role).toBe('Staff Python Engineer');

    // Retrieve by ID
    const retrievedById = db.getAssessmentConfig(created.id);
    expect(retrievedById).toBeDefined();
    expect(retrievedById.id).toBe(created.id);
    expect(retrievedById.title).toBe('Staff Python Distributed Systems Challenge');
    expect(retrievedById.questions.length).toBe(1);

    // Retrieve by role
    const retrievedByRole = db.getAssessmentConfig('Staff Python Engineer');
    expect(retrievedByRole.id).toBe(created.id);

    // List all configs
    const allConfigs = db.getAssessmentConfigs();
    expect(allConfigs.some(c => c.id === created.id)).toBe(true);
  });

  it('should update and persist modified assessment configurations', () => {
    const created = db.createAssessmentConfig({
      role: 'DevSecOps Specialist',
      title: 'Security Challenge',
      duration_minutes: 30,
      pass_threshold_percentage: 75
    });

    const updated = db.saveAssessmentConfig({
      ...created,
      title: 'Advanced DevSecOps & Cloud Security Challenge',
      duration_minutes: 40,
      pass_threshold_percentage: 85
    });

    expect(updated.title).toBe('Advanced DevSecOps & Cloud Security Challenge');
    expect(updated.duration_minutes).toBe(40);
    expect(updated.pass_threshold_percentage).toBe(85);

    const reloaded = db.getAssessmentConfig(created.id);
    expect(reloaded.title).toBe('Advanced DevSecOps & Cloud Security Challenge');
    expect(reloaded.pass_threshold_percentage).toBe(85);
  });

  it('should delete assessment config and register tombstone', () => {
    const created = db.createAssessmentConfig({
      role: 'Temporary Role',
      title: 'Temporary Assessment'
    });

    expect(db.getAssessmentConfigs().some(c => c.id === created.id)).toBe(true);

    const deleted = db.deleteAssessmentConfig(created.id);
    expect(deleted).toBe(true);

    expect(db.getAssessmentConfigs().some(c => c.id === created.id)).toBe(false);
  });

  it('should link the selected custom assessment config during candidate approval', () => {
    const customConfig = db.createAssessmentConfig({
      role: 'Lead ML Engineer',
      title: 'Machine Learning Systems Challenge',
      duration_minutes: 50,
      pass_threshold_percentage: 78
    });

    const job = db.createJob({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      title: 'Lead ML Engineer',
      description: 'Design distributed PyTorch training pipelines',
      department: 'AI Research',
      location: 'Remote',
      employment_type: 'Full-Time',
      status: 'active',
      assessment_config_id: customConfig.id
    });

    const { application } = db.createApplicationWithCandidate({
      jobId: job.id,
      firstName: 'Elena',
      lastName: 'Rostova',
      email: 'elena.rostova@example.com'
    });

    // Approve for assessment with customConfig.id
    const approved = db.approveForAssessment(application.id, 'Recruiter Test', customConfig.id);
    expect(approved).not.toBeNull();

    const assignment = db.getAssessmentByApplicationId(application.id);
    expect(assignment).not.toBeNull();
    expect(assignment?.config_id).toBe(customConfig.id);
    expect(assignment?.pass_threshold_percentage).toBe(78);
    expect(assignment?.assessment_url).toContain('/assessment/take/assess-');
  });

  it('should format assessment invitation email with the selected assessment title and duration', async () => {
    const email = await emailDispatcher.sendAssessmentInvitation({
      applicationId: 'app-test-123',
      candidateEmail: 'candidate.test@example.com',
      candidateName: 'Marcus Vance',
      jobTitle: 'Cloud Architect',
      assessmentTitle: 'High-Scale Cloud Architecture Challenge',
      durationMinutes: 55,
      assessmentDescription: 'Evaluates AWS multi-region failover and DynamoDB global tables.',
      testUrl: '/assessment/take/assess-test-123',
      passThreshold: 80
    });

    expect(email.subject).toContain('High-Scale Cloud Architecture Challenge');
    expect(email.subject).toContain('Cloud Architect');
    expect(email.body_html).toContain('High-Scale Cloud Architecture Challenge');
    expect(email.body_html).toContain('Approximately 55 minutes');
    expect(email.body_html).toContain('Evaluates AWS multi-region failover');
    expect(email.body_html).toContain('/assessment/take/assess-test-123');
    expect(email.body_html).toContain('80%');
  });

  it('should enforce single attempt by reusing existing assessment in getOrCreateAssessmentById', () => {
    const job = db.getJobs()[0];
    const { application } = db.createApplicationWithCandidate({
      jobId: job.id,
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah.connor@test.com'
    });

    // Shortlist and generate assessment assignment
    db.approveForAssessment(application.id, 'Recruiter Test');
    const originalAssignment = db.getAssessmentByApplicationId(application.id);
    expect(originalAssignment).not.toBeNull();

    // Candidate submits assessment
    const completedAssignment = db.saveAssessmentResult(originalAssignment!.id, {
      score: 95,
      maxScore: 100,
      source: 'Candidate Submission',
      skipEmailNotification: true
    });
    expect(completedAssignment?.status).toBe('PASSED');
    expect(completedAssignment?.verified).toBe(true);

    // Candidate clicks assessment link again
    const session = db.getOrCreateAssessmentById(originalAssignment!.id);
    expect(session).not.toBeNull();
    expect(session?.assignment.id).toBe(originalAssignment!.id);
    expect(session?.assignment.status).toBe('PASSED');
    expect(session?.assignment.verified).toBe(true);

    // If candidate opens with another token that recovers this application
    const recoveredSession = db.getOrCreateAssessmentById(`assess-${application.id.replace(/^app-/, '')}`);
    expect(recoveredSession).not.toBeNull();
    expect(recoveredSession?.assignment.status).toBe('PASSED');
    expect(recoveredSession?.assignment.verified).toBe(true);
  });

  it('should track submitted assessment scores in getAnalytics immediately and accurately', () => {
    const job = db.getJobs()[0];
    const { application } = db.createApplicationWithCandidate({
      jobId: job.id,
      firstName: 'David',
      lastName: 'Miller',
      email: 'david.miller@test.com'
    });

    db.approveForAssessment(application.id, 'Recruiter Test');
    const assignment = db.getAssessmentByApplicationId(application.id);
    expect(assignment).not.toBeNull();

    db.saveAssessmentResult(assignment!.id, {
      score: 88,
      maxScore: 100,
      source: 'Candidate Form Submission',
      skipEmailNotification: true
    });

    const analytics = db.getAnalytics('all');
    expect(analytics.assessmentSubmissions).toBeGreaterThanOrEqual(1);
    expect(analytics.averageAssessmentScore).toBeGreaterThan(0);
    expect(analytics.scoreDistribution.excellent).toBeGreaterThanOrEqual(1);

    const matchInRecent = analytics.recentSubmissions.find(s => s.id === assignment!.id);
    expect(matchInRecent).toBeDefined();
    expect(matchInRecent?.score).toBe(88);
    expect(matchInRecent?.passed).toBe(true);
  });
});
