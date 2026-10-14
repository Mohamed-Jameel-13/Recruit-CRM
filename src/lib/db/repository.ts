import fs from 'fs';
import path from 'path';
import { 
  Job, 
  Candidate, 
  CVDocument, 
  Application, 
  ScreeningRun, 
  AssessmentAssignment, 
  Interview, 
  AuditLog, 
  ImportBatch, 
  Interviewer,
  RetentionDeletionRequest,
  ScreeningCriteria
} from '@/types/database';
import { getAdminClient } from '@/lib/supabase/admin';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'recruitment_store.json');

export interface RecruitmentStore {
  jobs: Job[];
  criteria: ScreeningCriteria[];
  candidates: Candidate[];
  cv_documents: CVDocument[];
  applications: Application[];
  screening_runs: ScreeningRun[];
  assessment_assignments: AssessmentAssignment[];
  interviews: Interview[];
  interviewers: Interviewer[];
  import_batches: ImportBatch[];
  audit_logs: AuditLog[];
  retention_requests: RetentionDeletionRequest[];
}

// Initial baseline mock data matching seed.sql
const DEFAULT_CRITERIA: ScreeningCriteria = {
  id: 'd0000000-0000-0000-0000-000000000001',
  job_id: 'c0000000-0000-0000-0000-000000000001',
  min_years_experience: 4,
  required_skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'React', 'Docker', 'System Architecture'],
  preferred_skills: ['GraphQL', 'Redis', 'Next.js', 'Kubernetes', 'AWS', 'CI/CD'],
  required_education: 'Bachelor in Computer Science or equivalent practical experience',
  semantic_equivalence_rules: [
    {
      source: 'MySQL',
      target: 'PostgreSQL',
      relationship: 'relational_db_family',
      weight: 0.95,
      explanation: 'Deep MySQL indexing & ACID knowledge translates seamlessly to PostgreSQL'
    },
    {
      source: 'FastAPI',
      target: 'Node.js',
      relationship: 'backend_api_architecture',
      weight: 0.85,
      explanation: 'REST/async backend concepts apply across Node and Python stacks'
    },
    {
      source: 'Vue.js',
      target: 'React',
      relationship: 'reactive_component_framework',
      weight: 0.90,
      explanation: 'SPA state management and component lifecycle easily transfer to React'
    },
    {
      source: 'Kubernetes',
      target: 'Docker',
      relationship: 'container_orchestration',
      weight: 1.00,
      explanation: 'Kubernetes implies containerization competency'
    },
    {
      source: 'MongoDB',
      target: 'PostgreSQL',
      relationship: 'data_persistence',
      weight: 0.75,
      explanation: 'Database modeling experience provides partial credit for data persistence'
    }
  ],
  scoring_weights: {
    skills: 40,
    experience: 30,
    education: 15,
    domain: 15
  },
  pass_threshold_score: 65,
  version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const DEFAULT_JOB: Job = {
  id: 'c0000000-0000-0000-0000-000000000001',
  organization_id: 'a0000000-0000-0000-0000-000000000001',
  title: 'Senior Full-Stack Cloud Engineer',
  department: 'Platform Engineering',
  location: 'Remote (Global)',
  employment_type: 'Full-Time',
  description: 'We are seeking an experienced Full-Stack Cloud Engineer to design scalable microservices and resilient web applications. The ideal candidate has deep expertise in TypeScript, Node.js, modern relational databases (PostgreSQL or equivalent enterprise SQL), modern frontend frameworks (React/Next.js), containerization (Docker), and cloud system architecture.',
  status: 'active',
  version: 1,
  created_by: 'b0000000-0000-0000-0000-000000000001',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  criteria: DEFAULT_CRITERIA
};

const DEFAULT_INTERVIEWER: Interviewer = {
  id: 'e0000000-0000-0000-0000-000000000001',
  organization_id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Sarah Connor',
  email: 'sarah.connor@acme.example.com',
  timezone: 'America/New_York',
  active: true,
  created_at: new Date().toISOString()
};

let memoryStore: RecruitmentStore | null = null;

function getStore(): RecruitmentStore {
  if (memoryStore) {
    return memoryStore;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf-8');
      if (data && data.trim()) {
        memoryStore = JSON.parse(data);
        return memoryStore!;
      }
    }
  } catch {
    // fallback to initial
  }

  // Initialize fresh store
  const initialStore: RecruitmentStore = {
    jobs: [DEFAULT_JOB],
    criteria: [DEFAULT_CRITERIA],
    candidates: [],
    cv_documents: [],
    applications: [],
    screening_runs: [],
    assessment_assignments: [],
    interviews: [],
    interviewers: [DEFAULT_INTERVIEWER],
    import_batches: [],
    audit_logs: [
      {
        id: 'log-001',
        organization_id: 'a0000000-0000-0000-0000-000000000001',
        user_name: 'System Admin',
        entity_type: 'job',
        entity_id: DEFAULT_JOB.id,
        action: 'CREATE',
        details: { title: DEFAULT_JOB.title },
        created_at: new Date().toISOString()
      }
    ],
    retention_requests: []
  };

  memoryStore = initialStore;
  saveStore(initialStore);
  return initialStore;
}

function saveStore(store: RecruitmentStore): void {
  memoryStore = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = path.join(DATA_DIR, `tmp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.json`);
    fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), 'utf-8');
    try {
      fs.renameSync(tempFile, STORE_FILE);
    } catch {
      // On Windows rename can fail if open, copy instead
      fs.copyFileSync(tempFile, STORE_FILE);
      fs.unlinkSync(tempFile);
    }
  } catch (err) {
    console.error('Failed writing recruitment store:', err);
  }
}

export const db = {
  // Jobs
  getJobs(): Job[] {
    const store = getStore();
    return store.jobs.map(job => {
      const criteria = store.criteria.find(c => c.job_id === job.id);
      return { ...job, criteria };
    });
  },

  getJobById(id: string): Job | null {
    const store = getStore();
    const job = store.jobs.find(j => j.id === id);
    if (!job) return null;
    const criteria = store.criteria.find(c => c.job_id === job.id);
    return { ...job, criteria };
  },

  createJob(jobData: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'version'>, criteriaData?: Partial<ScreeningCriteria>): Job {
    const store = getStore();
    const id = 'job-' + Date.now();
    const newJob: Job = {
      ...jobData,
      id,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.jobs.push(newJob);

    if (criteriaData) {
      const newCriteria: ScreeningCriteria = {
        id: 'crit-' + Date.now(),
        job_id: id,
        min_years_experience: criteriaData.min_years_experience ?? 3,
        required_skills: criteriaData.required_skills ?? [],
        preferred_skills: criteriaData.preferred_skills ?? [],
        required_education: criteriaData.required_education ?? 'Bachelor degree or equivalent',
        semantic_equivalence_rules: criteriaData.semantic_equivalence_rules ?? [],
        scoring_weights: criteriaData.scoring_weights ?? { skills: 40, experience: 30, education: 15, domain: 15 },
        pass_threshold_score: criteriaData.pass_threshold_score ?? 65,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.criteria.push(newCriteria);
      newJob.criteria = newCriteria;
    }

    db.addAuditLog({
      organization_id: newJob.organization_id,
      entity_type: 'job',
      entity_id: newJob.id,
      action: 'CREATE',
      details: { title: newJob.title }
    });

    saveStore(store);
    return newJob;
  },

  updateJob(id: string, updates: Partial<Job>, criteriaUpdates?: Partial<ScreeningCriteria>): Job | null {
    const store = getStore();
    const index = store.jobs.findIndex(j => j.id === id);
    if (index === -1) return null;

    store.jobs[index] = {
      ...store.jobs[index],
      ...updates,
      version: store.jobs[index].version + 1,
      updated_at: new Date().toISOString()
    };

    if (criteriaUpdates) {
      const critIndex = store.criteria.findIndex(c => c.job_id === id);
      if (critIndex !== -1) {
        store.criteria[critIndex] = {
          ...store.criteria[critIndex],
          ...criteriaUpdates,
          version: store.criteria[critIndex].version + 1,
          updated_at: new Date().toISOString()
        };
      }
    }

    saveStore(store);
    return db.getJobById(id);
  },

  // Candidates & Applications
  getCandidates(): Candidate[] {
    return getStore().candidates;
  },

  getCandidateById(id: string): Candidate | null {
    return getStore().candidates.find(c => c.id === id) || null;
  },

  getApplications(filter?: { jobId?: string; stage?: string; screeningStatus?: string }): Application[] {
    const store = getStore();
    let apps = store.applications;

    if (filter?.jobId) {
      apps = apps.filter(a => a.job_id === filter.jobId);
    }
    if (filter?.stage) {
      apps = apps.filter(a => a.stage === filter.stage);
    }
    if (filter?.screeningStatus) {
      apps = apps.filter(a => a.screening_status === filter.screeningStatus);
    }

    return apps.map(app => {
      const candidate = store.candidates.find(c => c.id === app.candidate_id);
      const job = store.jobs.find(j => j.id === app.job_id);
      const cv_document = store.cv_documents.find(d => d.id === app.cv_document_id);
      const latest_screening = store.screening_runs
        .filter(s => s.application_id === app.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      const assessment_assignment = store.assessment_assignments.find(a => a.application_id === app.id);
      const interview = store.interviews.find(i => i.application_id === app.id);

      return {
        ...app,
        candidate,
        job,
        cv_document,
        latest_screening,
        assessment_assignment,
        interview
      };
    });
  },

  getApplicationById(id: string): Application | null {
    const apps = db.getApplications();
    return apps.find(a => a.id === id) || null;
  },

  createApplicationWithCandidate(data: {
    jobId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    location?: string;
    cvDocId?: string;
    batchId?: string;
  }): { candidate: Candidate; application: Application } {
    const store = getStore();

    // Check existing candidate by email
    let candidate = store.candidates.find(c => c.email.toLowerCase() === data.email.toLowerCase());
    if (!candidate) {
      candidate = {
        id: 'cand-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        organization_id: 'a0000000-0000-0000-0000-000000000001',
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        location: data.location,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.candidates.push(candidate);
    }

    const application: Application = {
      id: 'app-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      job_id: data.jobId,
      candidate_id: candidate.id,
      cv_document_id: data.cvDocId,
      stage: 'SCREENING',
      screening_status: 'PENDING',
      invitation_status: 'NOT_SENT',
      assessment_status: 'NOT_STARTED',
      interview_status: 'NOT_SCHEDULED',
      human_approved: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.applications.push(application);
    saveStore(store);

    return { candidate, application };
  },

  // CV Documents
  saveCVDocument(docData: Omit<CVDocument, 'id' | 'created_at' | 'updated_at'>): CVDocument {
    const store = getStore();
    const doc: CVDocument = {
      ...docData,
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.cv_documents.push(doc);
    saveStore(store);
    return doc;
  },

  updateCVDocument(id: string, updates: Partial<CVDocument>): CVDocument | null {
    const store = getStore();
    const idx = store.cv_documents.findIndex(d => d.id === id);
    if (idx === -1) return null;
    store.cv_documents[idx] = {
      ...store.cv_documents[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveStore(store);
    return store.cv_documents[idx];
  },

  // Import Batches
  createBatch(batchName: string, jobId?: string, totalFiles: number = 0): ImportBatch {
    const store = getStore();
    const batch: ImportBatch = {
      id: 'batch-' + Date.now(),
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      job_id: jobId,
      batch_name: batchName,
      total_files: totalFiles,
      processed_files: 0,
      failed_files: 0,
      status: 'processing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.import_batches.push(batch);
    saveStore(store);
    return batch;
  },

  getBatches(): ImportBatch[] {
    return getStore().import_batches;
  },

  getBatchById(id: string): ImportBatch | null {
    return getStore().import_batches.find(b => b.id === id) || null;
  },

  updateBatch(id: string, updates: Partial<ImportBatch>): ImportBatch | null {
    const store = getStore();
    const idx = store.import_batches.findIndex(b => b.id === id);
    if (idx === -1) return null;
    store.import_batches[idx] = {
      ...store.import_batches[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveStore(store);
    return store.import_batches[idx];
  },

  // Screening Runs
  recordScreeningRun(runData: Omit<ScreeningRun, 'id' | 'created_at'>): ScreeningRun {
    const store = getStore();
    const run: ScreeningRun = {
      ...runData,
      id: 'screen-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString()
    };
    store.screening_runs.push(run);

    // Update application screening status
    const appIdx = store.applications.findIndex(a => a.id === runData.application_id);
    if (appIdx !== -1) {
      store.applications[appIdx].screening_status = 'COMPLETED';
      store.applications[appIdx].updated_at = new Date().toISOString();
    }

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'screening',
      entity_id: run.id,
      action: 'CREATE',
      details: { 
        application_id: runData.application_id, 
        score: runData.match_score, 
        recommendation: runData.recommendation 
      }
    });

    saveStore(store);
    return run;
  },

  // Admin Approvals & Overrides
  approveForAssessment(applicationId: string, approvedBy: string): Application | null {
    const store = getStore();
    const idx = store.applications.findIndex(a => a.id === applicationId);
    if (idx === -1) return null;

    store.applications[idx].human_approved = true;
    store.applications[idx].approved_by = approvedBy;
    store.applications[idx].approved_at = new Date().toISOString();
    store.applications[idx].stage = 'ASSESSMENT';
    store.applications[idx].invitation_status = 'APPROVED';
    store.applications[idx].updated_at = new Date().toISOString();

    // Create or update assessment assignment
    let assignment = store.assessment_assignments.find(a => a.application_id === applicationId);
    if (!assignment) {
      assignment = {
        id: 'assess-' + Date.now(),
        application_id: applicationId,
        assessment_type: 'EXTERNAL_URL',
        assessment_url: 'https://forms.google.com/d/e/demo-recruitment-assessment/viewform',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        pass_threshold_percentage: 70,
        status: 'PENDING_APPROVAL',
        verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.assessment_assignments.push(assignment);
    } else {
      assignment.status = 'QUEUED';
      assignment.updated_at = new Date().toISOString();
    }

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'application',
      entity_id: applicationId,
      action: 'APPROVE',
      details: { stage: 'ASSESSMENT', approved_by: approvedBy }
    });

    saveStore(store);
    return db.getApplicationById(applicationId);
  },

  overrideScreening(
    screeningRunId: string, 
    overrideRecommendation: ScreeningRun['recommendation'] | 'REJECT', 
    reason: string, 
    overrideBy: string
  ): ScreeningRun | null {
    const store = getStore();
    const idx = store.screening_runs.findIndex(s => s.id === screeningRunId);
    if (idx === -1) return null;

    store.screening_runs[idx].human_override_recommendation = overrideRecommendation;
    store.screening_runs[idx].human_override_reason = reason;
    store.screening_runs[idx].override_by = overrideBy;
    store.screening_runs[idx].override_at = new Date().toISOString();

    const appId = store.screening_runs[idx].application_id;
    const appIdx = store.applications.findIndex(a => a.id === appId);
    if (appIdx !== -1 && overrideRecommendation === 'REJECT') {
      store.applications[appIdx].stage = 'REJECTED';
      store.applications[appIdx].rejection_reason = reason;
      store.applications[appIdx].updated_at = new Date().toISOString();
    }

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'screening',
      entity_id: screeningRunId,
      action: 'OVERRIDE',
      details: { overrideRecommendation, reason, overrideBy }
    });

    saveStore(store);
    return store.screening_runs[idx];
  },

  rejectApplication(applicationId: string, reason: string, rejectedBy: string): Application | null {
    const store = getStore();
    const idx = store.applications.findIndex(a => a.id === applicationId);
    if (idx === -1) return null;

    store.applications[idx].stage = 'REJECTED';
    store.applications[idx].rejection_reason = reason;
    store.applications[idx].updated_at = new Date().toISOString();

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'application',
      entity_id: applicationId,
      action: 'REJECT',
      details: { reason, rejectedBy }
    });

    saveStore(store);
    return db.getApplicationById(applicationId);
  },

  // Assessments
  getAssessments(): AssessmentAssignment[] {
    const store = getStore();
    return store.assessment_assignments;
  },

  saveAssessmentResult(
    assignmentId: string, 
    data: { 
      score: number; 
      maxScore?: number; 
      source: string; 
      verified?: boolean; 
      verifiedBy?: string; 
      details?: Record<string, unknown> 
    }
  ): AssessmentAssignment | null {
    const store = getStore();
    const idx = store.assessment_assignments.findIndex(a => a.id === assignmentId);
    if (idx === -1) return null;

    const maxScore = data.maxScore ?? 100;
    const percentage = Number(((data.score / maxScore) * 100).toFixed(2));
    const passThreshold = store.assessment_assignments[idx].pass_threshold_percentage;
    const passed = percentage >= passThreshold;

    store.assessment_assignments[idx] = {
      ...store.assessment_assignments[idx],
      score: data.score,
      max_score: maxScore,
      percentage_score: percentage,
      result_source: data.source,
      result_details: data.details,
      status: passed ? 'PASSED' : 'FAILED',
      verified: data.verified ?? true,
      verified_by: data.verifiedBy,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Update application stage if passed
    const appId = store.assessment_assignments[idx].application_id;
    const appIdx = store.applications.findIndex(a => a.id === appId);
    if (appIdx !== -1) {
      store.applications[appIdx].assessment_status = passed ? 'PASSED' : 'FAILED';
      if (passed) {
        store.applications[appIdx].interview_status = 'AWAITING_APPROVAL';
      }
      store.applications[appIdx].updated_at = new Date().toISOString();
    }

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'assessment',
      entity_id: assignmentId,
      action: 'UPDATE',
      details: { score: data.score, percentage, passed, source: data.source }
    });

    saveStore(store);
    return store.assessment_assignments[idx];
  },

  // Interviews
  getInterviews(): Interview[] {
    return getStore().interviews;
  },

  getInterviewers(): Interviewer[] {
    return getStore().interviewers;
  },

  approveForInterview(applicationId: string, approvedBy: string): Application | null {
    const store = getStore();
    const idx = store.applications.findIndex(a => a.id === applicationId);
    if (idx === -1) return null;

    store.applications[idx].stage = 'INTERVIEW';
    store.applications[idx].interview_status = 'APPROVED';
    store.applications[idx].updated_at = new Date().toISOString();

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'application',
      entity_id: applicationId,
      action: 'APPROVE',
      details: { stage: 'INTERVIEW', approved_by: approvedBy }
    });

    saveStore(store);
    return db.getApplicationById(applicationId);
  },

  scheduleInterview(data: {
    applicationId: string;
    interviewerId: string;
    interviewerName: string;
    scheduledStart: string;
    durationMinutes: number;
    timezone: string;
    schedulingMode: 'GOOGLE_CALENDAR' | 'MANUAL';
    meetingUrl?: string;
    googleEventId?: string;
  }): { interview?: Interview; conflict?: boolean; error?: string } {
    const store = getStore();

    const startMs = new Date(data.scheduledStart).getTime();
    const endMs = startMs + data.durationMinutes * 60 * 1000;
    const endIso = new Date(endMs).toISOString();

    // Check for scheduling conflicts with the same interviewer
    const conflict = store.interviews.some(existing => {
      if (existing.interviewer_id !== data.interviewerId) return false;
      if (existing.booking_status === 'CANCELLED') return false;

      const existingStart = new Date(existing.scheduled_start).getTime();
      const existingEnd = new Date(existing.scheduled_end).getTime();

      // Check overlap
      return (startMs < existingEnd && endMs > existingStart);
    });

    if (conflict) {
      return { 
        conflict: true, 
        error: 'The interviewer already has a scheduled interview during this time window.' 
      };
    }

    const interview: Interview = {
      id: 'int-' + Date.now(),
      application_id: data.applicationId,
      interviewer_id: data.interviewerId,
      interviewer_name: data.interviewerName,
      round_number: 2,
      scheduled_start: data.scheduledStart,
      scheduled_end: endIso,
      timezone: data.timezone,
      duration_minutes: data.durationMinutes,
      scheduling_mode: data.schedulingMode,
      booking_status: 'SCHEDULED',
      meeting_url: data.meetingUrl || (data.schedulingMode === 'MANUAL' ? 'https://meet.google.com/man-rec-demo' : undefined),
      google_event_id: data.googleEventId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.interviews.push(interview);

    // Update application
    const appIdx = store.applications.findIndex(a => a.id === data.applicationId);
    if (appIdx !== -1) {
      store.applications[appIdx].stage = 'INTERVIEW';
      store.applications[appIdx].interview_status = 'SCHEDULED';
      store.applications[appIdx].updated_at = new Date().toISOString();
    }

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'interview',
      entity_id: interview.id,
      action: 'CREATE',
      details: { 
        interviewer: data.interviewerName, 
        start: data.scheduledStart, 
        mode: data.schedulingMode 
      }
    });

    saveStore(store);
    return { interview };
  },

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return getStore().audit_logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addAuditLog(entry: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const store = getStore();
    const log: AuditLog = {
      ...entry,
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString()
    };
    store.audit_logs.unshift(log);
    saveStore(store);
    return log;
  },

  // Retention / Candidate Deletion
  requestCandidateDeletion(candidateId: string, reason: string, requestedBy: string): RetentionDeletionRequest {
    const store = getStore();
    const candidate = store.candidates.find(c => c.id === candidateId);

    const req: RetentionDeletionRequest = {
      id: 'del-' + Date.now(),
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      candidate_id: candidateId,
      candidate_name: candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Unknown',
      requested_by: requestedBy,
      status: 'PROCESSED',
      reason,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };

    // Anonymize/Delete personal data
    store.candidates = store.candidates.filter(c => c.id !== candidateId);
    store.cv_documents = store.cv_documents.filter(d => d.candidate_id !== candidateId);
    const relatedApps = store.applications.filter(a => a.candidate_id === candidateId);
    for (const a of relatedApps) {
      a.stage = 'REJECTED';
      a.rejection_reason = 'Candidate requested personal data deletion under GDPR/Privacy policy.';
    }

    store.retention_requests.push(req);

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'retention',
      entity_id: req.id,
      action: 'DELETE',
      details: { candidateId, reason }
    });

    saveStore(store);
    return req;
  },

  // Real Analytics Aggregations calculated directly from database records
  getAnalytics(jobId?: string) {
    const store = getStore();
    let apps = store.applications;
    let cvDocs = store.cv_documents;
    let assessments = store.assessment_assignments;
    let interviews = store.interviews;

    if (jobId && jobId !== 'all') {
      apps = apps.filter(a => a.job_id === jobId);
      const appIds = new Set(apps.map(a => a.id));
      assessments = assessments.filter(a => appIds.has(a.application_id));
      interviews = interviews.filter(i => appIds.has(i.application_id));
      const cvIds = new Set(apps.map(a => a.cv_document_id).filter(Boolean));
      cvDocs = cvDocs.filter(d => cvIds.has(d.id));
    }

    const totalJobs = store.jobs.length;
    const totalCVsUploaded = cvDocs.length;
    const cvsParsedSuccessfully = cvDocs.filter(d => d.parsing_status === 'parsed').length;
    const processingFailures = cvDocs.filter(d => d.parsing_status === 'failed').length;
    const screeningCompleted = apps.filter(a => a.screening_status === 'COMPLETED').length;
    const candidatesAwaitingApproval = apps.filter(a => a.screening_status === 'COMPLETED' && !a.human_approved && a.stage === 'SCREENING').length;
    const approvedAssessmentInvitations = apps.filter(a => a.invitation_status === 'APPROVED' || a.invitation_status === 'SENT').length;
    const assessmentSubmissions = assessments.filter(a => a.status === 'PASSED' || a.status === 'FAILED' || a.status === 'RESULT_RECEIVED').length;
    const resultsAwaitingVerification = assessments.filter(a => a.status === 'REVIEW_REQUIRED' || !a.verified).length;

    // Strict pass rate calculation: only evaluated submissions
    const evaluatedAssessments = assessments.filter(a => a.status === 'PASSED' || a.status === 'FAILED');
    const passedAssessments = assessments.filter(a => a.status === 'PASSED').length;
    const assessmentPassRate = evaluatedAssessments.length > 0 
      ? Number(((passedAssessments / evaluatedAssessments.length) * 100).toFixed(1)) 
      : 0;

    const candidatesAwaitingInterviewApproval = apps.filter(a => a.assessment_status === 'PASSED' && a.interview_status === 'AWAITING_APPROVAL').length;
    const interviewsScheduled = interviews.filter(i => i.booking_status === 'SCHEDULED' || i.booking_status === 'COMPLETED').length;

    // Recruitment funnel counts
    const funnel = [
      { stage: 'Uploaded CVs', count: totalCVsUploaded },
      { stage: 'Screened', count: screeningCompleted },
      { stage: 'Approved for Assessment', count: approvedAssessmentInvitations },
      { stage: 'Assessment Passed', count: passedAssessments },
      { stage: 'Interview Scheduled', count: interviewsScheduled }
    ];

    return {
      totalJobs,
      totalCVsUploaded,
      cvsParsedSuccessfully,
      processingFailures,
      screeningCompleted,
      candidatesAwaitingApproval,
      approvedAssessmentInvitations,
      assessmentSubmissions,
      resultsAwaitingVerification,
      assessmentPassRate,
      candidatesAwaitingInterviewApproval,
      interviewsScheduled,
      funnel
    };
  }
};
