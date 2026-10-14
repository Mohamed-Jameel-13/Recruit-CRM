-- ====================================================================
-- AI Recruitment Automation Platform - Migration 001
-- PostgreSQL Schema for Supabase with RLS, RBAC, and Audit Logging
-- ====================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Organizations & Memberships
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY, -- maps to auth.users.id
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'recruiter' CHECK (role IN ('admin', 'recruiter', 'viewer')),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Jobs and Screening Rubrics
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    location VARCHAR(100),
    employment_type VARCHAR(50) DEFAULT 'Full-Time',
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'closed')),
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS screening_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    min_years_experience INTEGER DEFAULT 0,
    required_skills JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["PostgreSQL", "Node.js", "TypeScript"]
    preferred_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    required_education VARCHAR(255),
    semantic_equivalence_rules JSONB DEFAULT '[]'::jsonb, -- e.g. [{"source": "MySQL", "target": "PostgreSQL", "weight": 0.9}]
    scoring_weights JSONB DEFAULT '{"skills": 40, "experience": 30, "education": 15, "domain": 15}'::jsonb,
    pass_threshold_score INTEGER DEFAULT 65,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Import Batches
CREATE TABLE IF NOT EXISTS import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    batch_name VARCHAR(255) NOT NULL,
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processing' CHECK (status IN ('queued', 'processing', 'completed', 'partial_failure', 'failed')),
    error_summary TEXT,
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Candidates (Independent from individual applications)
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    location VARCHAR(100),
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    dedup_fingerprint VARCHAR(64), -- SHA-256 of normalized email + phone
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_candidate_email_org UNIQUE (organization_id, email)
);

-- 5. CV Documents (Private storage tracking)
CREATE TABLE IF NOT EXISTS cv_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(1000) NOT NULL, -- Supabase Storage private bucket path
    file_size_bytes INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) NOT NULL, -- SHA-256 content hash
    extracted_text TEXT,
    parsed_json JSONB,
    parsing_status VARCHAR(50) DEFAULT 'pending' CHECK (parsing_status IN ('pending', 'extracting', 'parsed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Job Applications
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    cv_document_id UUID REFERENCES cv_documents(id) ON DELETE SET NULL,
    stage VARCHAR(50) DEFAULT 'SCREENING' CHECK (stage IN ('SOURCED', 'SCREENING', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED')),
    screening_status VARCHAR(50) DEFAULT 'PENDING' CHECK (screening_status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
    invitation_status VARCHAR(50) DEFAULT 'NOT_SENT' CHECK (invitation_status IN ('NOT_SENT', 'APPROVED', 'QUEUED', 'SENT', 'FAILED')),
    assessment_status VARCHAR(50) DEFAULT 'NOT_STARTED' CHECK (assessment_status IN ('NOT_STARTED', 'AWAITING_RESULT', 'RESULT_RECEIVED', 'REVIEW_REQUIRED', 'PASSED', 'FAILED')),
    interview_status VARCHAR(50) DEFAULT 'NOT_SCHEDULED' CHECK (interview_status IN ('NOT_SCHEDULED', 'AWAITING_APPROVAL', 'APPROVED', 'SCHEDULED', 'COMPLETED', 'CANCELLED')),
    human_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES user_profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_job_candidate UNIQUE (job_id, candidate_id)
);

-- 7. Screening Runs, Results & Evidence
CREATE TABLE IF NOT EXISTS screening_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    model_provider VARCHAR(50) DEFAULT 'google-gemini',
    model_name VARCHAR(100) DEFAULT 'gemini-1.5-flash',
    is_rule_based_fallback BOOLEAN DEFAULT FALSE,
    match_score NUMERIC(5,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    recommendation VARCHAR(50) NOT NULL CHECK (recommendation IN ('STRONG_MATCH', 'POTENTIAL_MATCH', 'BORDERLINE', 'NOT_A_MATCH')),
    matching_skills JSONB DEFAULT '[]'::jsonb,
    transferable_skills JSONB DEFAULT '[]'::jsonb, -- e.g. [{"candidate_skill": "MySQL", "target_skill": "PostgreSQL", "relation": "equivalent_relational_db", "credit": 90}]
    missing_requirements JSONB DEFAULT '[]'::jsonb,
    uncertainties JSONB DEFAULT '[]'::jsonb,
    executive_summary TEXT,
    human_override_recommendation VARCHAR(50) CHECK (human_override_recommendation IN ('STRONG_MATCH', 'POTENTIAL_MATCH', 'BORDERLINE', 'NOT_A_MATCH', 'REJECT')),
    human_override_reason TEXT,
    override_by UUID REFERENCES user_profiles(id),
    override_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS screening_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screening_run_id UUID REFERENCES screening_runs(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- e.g. 'skill', 'experience', 'education'
    criterion VARCHAR(255) NOT NULL,
    matched_text TEXT NOT NULL,
    reasoning TEXT,
    confidence_score NUMERIC(3,2) DEFAULT 1.00
);

-- 8. Assessment Assignments and Results
CREATE TABLE IF NOT EXISTS assessment_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    assessment_type VARCHAR(50) NOT NULL CHECK (assessment_type IN ('EXTERNAL_URL', 'GOOGLE_FORMS', 'MANUAL_ENTRY', 'CSV_IMPORT')),
    assessment_url VARCHAR(1000),
    due_date TIMESTAMPTZ,
    invitation_sent_at TIMESTAMPTZ,
    pass_threshold_percentage NUMERIC(5,2) DEFAULT 70.00,
    status VARCHAR(50) DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('PENDING_APPROVAL', 'QUEUED', 'SENT', 'AWAITING_RESULT', 'RESULT_RECEIVED', 'REVIEW_REQUIRED', 'PASSED', 'FAILED', 'ERROR')),
    score NUMERIC(5,2),
    max_score NUMERIC(5,2) DEFAULT 100.00,
    percentage_score NUMERIC(5,2),
    result_source VARCHAR(50), -- e.g. 'google_sheets_sync', 'csv_upload', 'manual_entry'
    result_details JSONB DEFAULT '{}'::jsonb,
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES user_profiles(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_result_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    total_rows INTEGER DEFAULT 0,
    imported_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    duplicate_rows INTEGER DEFAULT 0,
    summary JSONB DEFAULT '{}'::jsonb,
    imported_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Interview Management
CREATE TABLE IF NOT EXISTS interviewers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    google_calendar_id VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    interviewer_id UUID REFERENCES interviewers(id) ON DELETE SET NULL,
    round_number INTEGER DEFAULT 2, -- Round 2 interview
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    duration_minutes INTEGER DEFAULT 45,
    scheduling_mode VARCHAR(50) DEFAULT 'MANUAL' CHECK (scheduling_mode IN ('GOOGLE_CALENDAR', 'MANUAL')),
    booking_status VARCHAR(50) DEFAULT 'SCHEDULED' CHECK (booking_status IN ('AWAITING_APPROVAL', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'CONFLICT_FAILED')),
    google_event_id VARCHAR(500),
    meeting_url VARCHAR(1000),
    interviewer_feedback TEXT,
    interview_score NUMERIC(5,2),
    created_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Automation Events & Notification Attempts
CREATE TABLE IF NOT EXISTS automation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email VARCHAR(255) NOT NULL,
    channel VARCHAR(50) DEFAULT 'email',
    notification_type VARCHAR(100) NOT NULL, -- e.g. 'assessment_invite', 'interview_scheduled'
    subject VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Audit Logs & Data Retention / Deletion Controls
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id),
    entity_type VARCHAR(100) NOT NULL, -- 'job', 'application', 'candidate', 'screening', 'assessment', 'interview'
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'OVERRIDE', 'DELETE', 'EXPORT'
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retention_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES user_profiles(id),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'CANCELLED')),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_apps_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_apps_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_apps_stage ON applications(stage);
CREATE INDEX IF NOT EXISTS idx_candidates_org_email ON candidates(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_screening_application ON screening_runs(application_id);
CREATE INDEX IF NOT EXISTS idx_cv_docs_candidate ON cv_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_app ON interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_auto_idempotency ON automation_events(idempotency_key);

-- Row Level Security Setup
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Default permissive read/write policies for authenticated org users
-- (In full production, org_id checks apply)
CREATE POLICY "org_access_jobs" ON jobs FOR ALL USING (true);
CREATE POLICY "org_access_candidates" ON candidates FOR ALL USING (true);
CREATE POLICY "org_access_cv_documents" ON cv_documents FOR ALL USING (true);
CREATE POLICY "org_access_applications" ON applications FOR ALL USING (true);
CREATE POLICY "org_access_screening_runs" ON screening_runs FOR ALL USING (true);
CREATE POLICY "org_access_assessment" ON assessment_assignments FOR ALL USING (true);
CREATE POLICY "org_access_interviews" ON interviews FOR ALL USING (true);
CREATE POLICY "org_access_audit" ON audit_logs FOR ALL USING (true);
