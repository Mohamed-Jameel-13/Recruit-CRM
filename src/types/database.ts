// Type definitions for AI Recruitment Automation Platform

export type UserRole = 'admin' | 'recruiter' | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export type JobStatus = 'draft' | 'active' | 'paused' | 'closed';

export interface SemanticRule {
  source: string;
  target: string;
  relationship: string;
  weight: number; // e.g. 0.95 (95% credit)
  explanation: string;
}

export interface ScoringWeights {
  skills: number;
  experience: number;
  education: number;
  domain: number;
}

export interface ScreeningCriteria {
  id: string;
  job_id: string;
  min_years_experience: number;
  required_skills: string[];
  preferred_skills: string[];
  required_education: string;
  semantic_equivalence_rules: SemanticRule[];
  scoring_weights: ScoringWeights;
  pass_threshold_score: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  organization_id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string;
  status: JobStatus;
  version: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  criteria?: ScreeningCriteria;
}

export type BatchStatus = 'queued' | 'processing' | 'completed' | 'partial_failure' | 'failed';

export interface ImportBatch {
  id: string;
  organization_id: string;
  job_id?: string;
  batch_name: string;
  total_files: number;
  processed_files: number;
  failed_files: number;
  status: BatchStatus;
  error_summary?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  dedup_fingerprint?: string;
  created_at: string;
  updated_at: string;
}

export type ParsingStatus = 'pending' | 'extracting' | 'parsed' | 'failed';

export interface CVDocument {
  id: string;
  candidate_id?: string;
  batch_id?: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  mime_type: string;
  file_hash: string;
  extracted_text?: string;
  parsed_json?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    skills?: string[];
    years_experience?: number;
    experience?: Array<{ title: string; company: string; duration: string; description: string }>;
    education?: Array<{ degree: string; institution: string; year?: string }>;
  };
  parsing_status: ParsingStatus;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export type ApplicationStage = 'SOURCED' | 'SCREENING' | 'ASSESSMENT' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
export type ScreeningStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type InvitationStatus = 'NOT_SENT' | 'APPROVED' | 'QUEUED' | 'SENT' | 'FAILED';
export type AssessmentStatus = 'NOT_STARTED' | 'AWAITING_RESULT' | 'RESULT_RECEIVED' | 'REVIEW_REQUIRED' | 'PASSED' | 'FAILED';
export type InterviewStatus = 'NOT_SCHEDULED' | 'AWAITING_APPROVAL' | 'APPROVED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface Application {
  id: string;
  job_id: string;
  candidate_id: string;
  cv_document_id?: string;
  stage: ApplicationStage;
  screening_status: ScreeningStatus;
  invitation_status: InvitationStatus;
  assessment_status: AssessmentStatus;
  interview_status: InterviewStatus;
  human_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;

  // Joined relations for convenience
  candidate?: Candidate;
  job?: Job;
  cv_document?: CVDocument;
  latest_screening?: ScreeningRun;
  assessment_assignment?: AssessmentAssignment;
  interview?: Interview;
}

export type ScreeningRecommendation = 'STRONG_MATCH' | 'POTENTIAL_MATCH' | 'BORDERLINE' | 'NOT_A_MATCH';

export interface TransferableSkillMatch {
  candidate_skill: string;
  target_skill: string;
  relationship: string;
  credit_percentage: number;
  explanation: string;
}

export interface ScreeningEvidenceItem {
  id?: string;
  category: 'skill' | 'experience' | 'education' | 'domain';
  criterion: string;
  matched_text: string;
  reasoning: string;
  confidence_score: number;
}

export interface ScreeningRun {
  id: string;
  application_id: string;
  model_provider: string; // 'google-gemini' | 'rule-based-engine'
  model_name: string;
  is_rule_based_fallback: boolean;
  match_score: number; // 0 - 100
  recommendation: ScreeningRecommendation;
  matching_skills: string[];
  transferable_skills: TransferableSkillMatch[];
  missing_requirements: string[];
  uncertainties: string[];
  executive_summary: string;
  evidence?: ScreeningEvidenceItem[];
  human_override_recommendation?: ScreeningRecommendation | 'REJECT';
  human_override_reason?: string;
  override_by?: string;
  override_at?: string;
  created_at: string;
}

export type AssessmentType = 'EXTERNAL_URL' | 'GOOGLE_FORMS' | 'MANUAL_ENTRY' | 'CSV_IMPORT';
export type AssessmentAssignmentStatus = 
  | 'PENDING_APPROVAL' 
  | 'QUEUED' 
  | 'SENT' 
  | 'AWAITING_RESULT' 
  | 'RESULT_RECEIVED' 
  | 'REVIEW_REQUIRED' 
  | 'PASSED' 
  | 'FAILED' 
  | 'ERROR';

export interface AssessmentAssignment {
  id: string;
  application_id: string;
  assessment_type: AssessmentType;
  assessment_url?: string;
  due_date?: string;
  invitation_sent_at?: string;
  pass_threshold_percentage: number;
  status: AssessmentAssignmentStatus;
  score?: number;
  max_score?: number;
  percentage_score?: number;
  result_source?: string;
  result_details?: Record<string, unknown>;
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AssessmentResultImport {
  id: string;
  organization_id: string;
  filename: string;
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  duplicate_rows: number;
  summary: Record<string, unknown>;
  imported_by?: string;
  created_at: string;
}

export interface Interviewer {
  id: string;
  organization_id: string;
  user_id?: string;
  name: string;
  email: string;
  google_calendar_id?: string;
  timezone: string;
  active: boolean;
  created_at: string;
}

export type InterviewBookingStatus = 
  | 'AWAITING_APPROVAL' 
  | 'SCHEDULED' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'RESCHEDULED' 
  | 'CONFLICT_FAILED';

export interface Interview {
  id: string;
  application_id: string;
  interviewer_id?: string;
  interviewer_name?: string;
  round_number: number;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  duration_minutes: number;
  scheduling_mode: 'GOOGLE_CALENDAR' | 'MANUAL';
  booking_status: InterviewBookingStatus;
  google_event_id?: string;
  meeting_url?: string;
  interviewer_feedback?: string;
  interview_score?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id?: string;
  user_name?: string;
  entity_type: 'job' | 'application' | 'candidate' | 'screening' | 'assessment' | 'interview' | 'retention';
  entity_id: string;
  action: 'CREATE' | 'UPDATE' | 'APPROVE' | 'REJECT' | 'OVERRIDE' | 'DELETE' | 'EXPORT' | 'SYNC';
  details?: Record<string, unknown>;
  created_at: string;
}

export interface AutomationEvent {
  id: string;
  idempotency_key: string;
  event_name: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  retry_count: number;
  max_retries: number;
  last_error?: string;
  processed_at?: string;
  created_at: string;
}

export interface RetentionDeletionRequest {
  id: string;
  organization_id: string;
  candidate_id: string;
  candidate_name?: string;
  requested_by?: string;
  status: 'PENDING' | 'PROCESSED' | 'CANCELLED';
  reason: string;
  created_at: string;
  completed_at?: string;
}
